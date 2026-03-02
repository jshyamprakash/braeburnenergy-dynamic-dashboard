import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import type { Device, DeviceState } from '@repo/types';

/**
 * Compute time range boundaries (startTime, endTime) for a given range string.
 * @param range - '1h' | '6h' | '24h'
 * @returns Object with startTime and endTime Date objects
 */
export function computeTimeRange(range: '1h' | '6h' | '24h'): { startTime: Date; endTime: Date } {
  const endTime = new Date();
  const startTime = new Date(endTime);

  switch (range) {
    case '1h':
      startTime.setHours(endTime.getHours() - 1);
      break;
    case '6h':
      startTime.setHours(endTime.getHours() - 6);
      break;
    case '24h':
      startTime.setDate(endTime.getDate() - 1);
      break;
  }

  return { startTime, endTime };
}

/**
 * Fetch all devices scoped to an application
 */
export function useDevices(applicationId?: string) {
  return useQuery<Device[]>({
    queryKey: ['devices', applicationId],
    queryFn: async () => {
      if (!applicationId) return [];
      const response = await apiClient.get<Device[]>(`/devices?applicationId=${applicationId}`);
      return response.data;
    },
    enabled: !!applicationId,
    refetchInterval: 30000,
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
export function useDeviceStates(deviceId?: string, options?: { limit?: number; startTime?: Date; endTime?: Date }) {
  const startIso = options?.startTime?.toISOString();
  const endIso = options?.endTime?.toISOString();

  return useQuery<DeviceState[]>({
    queryKey: ['device-states', deviceId, options?.limit, startIso, endIso],
    queryFn: async () => {
      if (!deviceId) return [];
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (startIso) params.append('startTime', startIso);
      if (endIso) params.append('endTime', endIso);

      const response = await apiClient.get<DeviceState[]>(
        `/devices/${deviceId}/states?${params}`
      );
      return response.data;
    },
    enabled: !!deviceId,
    staleTime: 30_000,
    refetchInterval: 30_000,
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
 *
 * Returns an object with { state, stale, staledAt } where:
 * - state: DeviceState | null (the actual device state)
 * - stale: boolean (whether the derived state is stale from workflow deletion)
 * - staledAt: string | null (ISO timestamp when the stale flag was set, formatted for display)
 */
export function useDeviceRealtime(deviceId?: string): {
  state: DeviceState | null;
  stale: boolean;
  staledAt: string | null;
} {
  const queryClient = useQueryClient();
  const queryKey = ['device-latest-state', deviceId];
  const { socket, isConnected } = useWebSocket();

  // React Query handles the initial fetch + caching.
  // Queries device_derived_states for canonical live snapshot (ADR-039), not time-series.
  // staleTime keeps the cached value fresh for 30 s so remounts never flash 0.
  const { data: latestState = null } = useQuery<DeviceState | null>({
    queryKey,
    queryFn: async () => {
      const response = await apiClient.get<{
        deviceId: string; derived: Record<string, any>; lastSeen: Date; stale: boolean; staledAt: Date | null;
      }>(`/devices/${deviceId}/derived-state`);
      const derivedState = response.data;
      if (!derivedState) return null;

      // Build DeviceState-compatible cache object from derived-state response
      return {
        id: `derived-${deviceId}`,
        deviceId: derivedState.deviceId,
        data: derivedState.derived,
        derived: derivedState.derived,
        timestamp: new Date(derivedState.lastSeen).toISOString(),
        stale: derivedState.stale,
        staledAt: derivedState.staledAt,
      } as DeviceState & { stale: boolean; staledAt: Date | null };
    },
    enabled: !!deviceId,
    staleTime: 30_000,
    retry: false,
  });

  // Fetch device to access last-known derived state (survives workflow deletion).
  const { data: device } = useDevice(deviceId);

  // Keep a ref to the latest known derived values so the WebSocket handler
  // can access them without recreating the effect on every state change.
  const derivedRef = useRef<Record<string, any>>({});
  if (latestState?.derived) {
    derivedRef.current = latestState.derived;
  }

  // Track stale status — seeded from HTTP device fetch, cleared by WebSocket derived events (ADR-034)
  const [staleMeta, setStaleMeta] = useState<{ stale: boolean; staledAt: string | null }>({
    stale: false,
    staledAt: null,
  });

  // Seed derivedRef and staleMeta from latestState (queryFn response) on initial fetch.
  // derived-state endpoint includes stale+staledAt fields (ADR-039).
  // Ensures gauges show last-known computed values + stale status after hard refresh.
  useEffect(() => {
    if (latestState?.derived && Object.keys(latestState.derived).length > 0) {
      derivedRef.current = latestState.derived;
    }
    const meta = (latestState as any)?.stale;
    if (typeof meta === 'boolean') {
      setStaleMeta({
        stale: meta,
        staledAt: (latestState as any)?.staledAt ? new Date((latestState as any).staledAt).toLocaleString() : null,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestState?.deviceId]);

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
        // Fresh derived data arrived via WebSocket — workflow is alive, clear stale flag (ADR-034)
        setStaleMeta({ stale: false, staledAt: null });
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

  return { state: latestState, stale: staleMeta.stale, staledAt: staleMeta.staledAt };
}

/**
 * Fetch N historical derived state records for a device (newest first).
 * One shared React Query query per device — deduplicates to 1 HTTP request
 * even when both RealTimeChartBlock and LiveStreamBlock are mounted.
 */
export function useDeviceDerivedHistory(deviceId?: string, limit = 50) {
  return useQuery<Array<{ deviceId: string; derived: Record<string, any>; timestamp: string }>>({
    queryKey: ['device-derived-history', deviceId, limit],
    queryFn: async () => {
      const res = await apiClient.get<Array<{ deviceId: string; derived: Record<string, any>; timestamp: string }>>(
        `/devices/${deviceId}/derived-state/history?limit=${limit}`
      );
      return res.data ?? [];
    },
    enabled: !!deviceId,
    staleTime: 30_000,
    retry: false,
  });
}

export interface DeviceFieldEntry {
  key: string;
  source: 'schema' | 'state' | 'derived';
}

/**
 * Get available fields from the device's attributes schema (ADR-021).
 * device.attributes is the canonical field registry — keys are defined when the
 * device is created/updated and represent the fields that workflows can produce.
 * Values at runtime come from device_derived_states (ADR-030/039), fetched separately
 * by useDeviceRealtime.
 */
export function useDeviceFields(deviceId?: string): DeviceFieldEntry[] {
  const { data: device } = useDevice(deviceId);

  const entries: DeviceFieldEntry[] = [];

  const attributes = (device as any)?.attributes;
  if (attributes && typeof attributes === 'object') {
    Object.keys(attributes).forEach((key) => {
      entries.push({ key, source: 'schema' });
    });
  }

  return entries;
}
