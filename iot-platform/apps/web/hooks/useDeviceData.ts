import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import type { Device, DeviceState } from '@repo/types';

/**
 * Fetch all devices
 */
export function useDevices() {
  return useQuery<Device[]>({
    queryKey: ['devices'],
    queryFn: async () => {
      const response = await apiClient.get<Device[]>('/devices');
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

/**
 * Fetch a single device by ID
 */
export function useDevice(deviceId?: string) {
  return useQuery<Device>({
    queryKey: ['devices', deviceId],
    queryFn: async () => {
      if (!deviceId) throw new Error('Device ID is required');
      const response = await apiClient.get<Device>(`/devices/${deviceId}`);
      return response.data;
    },
    enabled: !!deviceId,
  });
}

/**
 * Fetch device states (historical data)
 */
export function useDeviceStates(deviceId?: string, options?: { limit?: number }) {
  return useQuery<DeviceState[]>({
    queryKey: ['device-states', deviceId, options],
    queryFn: async () => {
      if (!deviceId) return [];
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());

      const response = await apiClient.get<DeviceState[]>(
        `/devices/${deviceId}/states?${params}`
      );
      return response.data;
    },
    enabled: !!deviceId,
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 0, // Always consider data stale - force fresh fetches
    gcTime: 30000, // Keep in cache for 30 seconds (formerly cacheTime)
  });
}

/**
 * Real-time device state updates via WebSocket + React Query.
 *
 * React Query caches the initial fetch by queryKey so the gauge immediately
 * shows data on remount (survives DashboardBuilder re-renders / StrictMode
 * double-mount) instead of resetting to 0.
 *
 * WebSocket updates are written back into the same React Query cache so all
 * consumers stay in sync without an extra useState.
 */
export function useDeviceRealtime(deviceId?: string) {
  const queryClient = useQueryClient();
  const queryKey = ['device-latest-state', deviceId];
  const { socket, isConnected } = useWebSocket();

  // React Query handles the initial fetch + caching.
  // staleTime keeps the cached value fresh for 30 s so remounts never flash 0.
  const { data: latestState = null } = useQuery<DeviceState | null>({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: DeviceState }>(
        `/devices/${deviceId}/states/latest`
      );
      const state = response.data?.data;
      if (!state) return null;
      return {
        ...state,
        data: { ...state.data, ...(state.derived ?? {}) },
      };
    },
    enabled: !!deviceId,
    staleTime: 30_000,
    retry: false,
  });

  // Keep a ref to the latest known derived values so the WebSocket handler
  // can access them without recreating the effect on every state change.
  const derivedRef = useRef<Record<string, any>>({});
  if (latestState?.derived) {
    derivedRef.current = latestState.derived;
  }

  // WebSocket: write real-time updates directly into the React Query cache.
  useEffect(() => {
    if (!socket || !isConnected || !deviceId) return;

    socket.emit('subscribe:device', deviceId);

    const handleStateUpdate = (update: {
      deviceId: string;
      data: any;
      derived?: Record<string, any>;
      timestamp: Date;
    }) => {
      if (update.deviceId !== deviceId) return;

      const prev = queryClient.getQueryData<DeviceState | null>(queryKey);

      // Preserve previously known derived values when a raw telemetry broadcast
      // has no derived payload (normal simulator updates).
      const derived = update.derived ?? derivedRef.current ?? {};
      if (Object.keys(derived).length > 0) {
        derivedRef.current = derived;
      }

      // When the workflow engine broadcasts after writeDeviceState it sends
      // data:{} (only derived values are known at that point). Preserve the
      // previous raw sensor fields so temperature/humidity don't disappear.
      const rawData = Object.keys(update.data ?? {}).length > 0
        ? update.data
        : (prev?.data ?? {});

      const next: DeviceState = {
        id: `ws-${Date.now()}`,
        deviceId: update.deviceId,
        data: { ...rawData, ...derived },
        derived: Object.keys(derived).length > 0 ? derived : undefined,
        timestamp: new Date(update.timestamp).toISOString(),
      };

      queryClient.setQueryData<DeviceState | null>(queryKey, next);
    };

    socket.on('device:state', handleStateUpdate);

    return () => {
      socket.off('device:state', handleStateUpdate);
      socket.emit('unsubscribe:device', deviceId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isConnected, deviceId, queryClient]);

  return latestState;
}

export interface DeviceFieldEntry {
  key: string;
  source: 'schema' | 'state' | 'derived';
}

/**
 * Get available fields from device attributes (schema), latest device state (runtime),
 * and workflow-derived sub-document (ADR-028).
 * Schema fields come from Object.keys(device.attributes) — Record<string, string>.
 * State fields come from the latest device state data keys (raw sensor fields).
 * Derived fields come from state.derived keys (workflow-computed values).
 * Derived fields take display precedence: display value = derived[field] ?? data[field].
 */
export function useDeviceFields(deviceId?: string): DeviceFieldEntry[] {
  const { data: device } = useDevice(deviceId);
  const { data: states } = useDeviceStates(deviceId, { limit: 1 });

  const schemaKeys = new Set<string>();
  const stateKeys = new Set<string>();
  const derivedKeys = new Set<string>();

  if (device?.attributes) {
    Object.keys(device.attributes).forEach((key) => schemaKeys.add(key));
  }

  if (states && states.length > 0) {
    if (states[0].data) {
      Object.keys(states[0].data).forEach((key) => stateKeys.add(key));
    }
    if (states[0].derived) {
      Object.keys(states[0].derived).forEach((key) => derivedKeys.add(key));
    }
  }

  const entries: DeviceFieldEntry[] = [];

  // Schema fields first
  schemaKeys.forEach((key) => entries.push({ key, source: 'schema' }));

  // Derived fields (workflow-computed; not in schema)
  derivedKeys.forEach((key) => {
    if (!schemaKeys.has(key)) {
      entries.push({ key, source: 'derived' });
    }
  });

  // Raw state-only fields (not in schema and not already covered by derived)
  stateKeys.forEach((key) => {
    if (!schemaKeys.has(key) && !derivedKeys.has(key)) {
      entries.push({ key, source: 'state' });
    }
  });

  return entries;
}
