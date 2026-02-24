import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
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
 * Real-time device state updates via WebSocket
 * Fetches the latest state on mount, then listens for real-time updates
 */
export function useDeviceRealtime(deviceId?: string) {
  const [latestState, setLatestState] = useState<DeviceState | null>(null);
  const { socket, isConnected } = useWebSocket();

  // Fetch the latest state on mount
  useEffect(() => {
    if (!deviceId) return;

    const fetchLatestState = async () => {
      try {
        const response = await apiClient.get<DeviceState[]>(
          `/devices/${deviceId}/states?limit=1`
        );
        if (response.data && response.data.length > 0) {
          setLatestState(response.data[0]);
        }
      } catch (error) {
        console.error('Failed to fetch latest state:', error);
      }
    };

    fetchLatestState();
  }, [deviceId]);

  // Listen for real-time WebSocket updates
  useEffect(() => {
    if (!socket || !isConnected || !deviceId) return;

    // Subscribe to device updates (server expects 'subscribe:device' with deviceId string)
    socket.emit('subscribe:device', deviceId);

    // Listen for state updates
    // derived (ADR-028): merge derived over data so dashboard reads the most-processed value
    const handleStateUpdate = (update: { deviceId: string; data: any; derived?: Record<string, any>; timestamp: Date }) => {
      if (update.deviceId === deviceId) {
        setLatestState({
          id: `ws-${Date.now()}`,
          deviceId: update.deviceId,
          data: { ...update.data, ...(update.derived ?? {}) },
          derived: update.derived,
          timestamp: new Date(update.timestamp).toISOString(),
        });
      }
    };

    socket.on('device:state', handleStateUpdate);

    return () => {
      socket.off('device:state', handleStateUpdate);
      socket.emit('unsubscribe:device', deviceId);
    };
  }, [socket, isConnected, deviceId]);

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
