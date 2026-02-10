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
 */
export function useDeviceRealtime(deviceId?: string) {
  const [latestState, setLatestState] = useState<DeviceState | null>(null);
  const { socket, isConnected } = useWebSocket();

  useEffect(() => {
    if (!socket || !isConnected || !deviceId) return;

    // Subscribe to device updates (server expects 'subscribe:device' with deviceId string)
    socket.emit('subscribe:device', deviceId);

    // Listen for state updates
    const handleStateUpdate = (update: { deviceId: string; data: any; timestamp: Date }) => {
      if (update.deviceId === deviceId) {
        setLatestState({
          id: `ws-${Date.now()}`,
          deviceId: update.deviceId,
          data: update.data,
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

/**
 * Get available fields from device attributes
 */
export function useDeviceFields(deviceId?: string) {
  const { data: device } = useDevice(deviceId);
  const { data: states } = useDeviceStates(deviceId, { limit: 1 });

  // Extract fields from device attributes or latest state
  const fields = new Set<string>();

  if (device?.attributes?.sensors && Array.isArray(device.attributes.sensors)) {
    device.attributes.sensors.forEach((sensor: string) => fields.add(sensor));
  }

  if (states && states.length > 0 && states[0].data) {
    Object.keys(states[0].data).forEach((key) => fields.add(key));
  }

  return Array.from(fields);
}
