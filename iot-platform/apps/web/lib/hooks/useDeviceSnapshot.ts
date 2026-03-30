'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type { UseDeviceSnapshotResult, DeviceSnapshotData } from '../types';
import { useDevice } from './useDevices';

/**
 * useDeviceSnapshot — Latest multi-field snapshot for device data
 *
 * Routes based on device.dataSource (ADR-046):
 * - gateway / http → GET /devices/:id/live (Redis snapshot from Processing Engine)
 * - workflow       → GET /devices/:id/derived-state (latest derived state)
 *
 * Polls at 5s interval (snapshot semantics, not WebSocket).
 * Used for bar charts, FFT displays, and point-in-time metrics.
 */
export function useDeviceSnapshot(deviceId: string): UseDeviceSnapshotResult {
  const { data: device } = useDevice(deviceId);

  // Fetch live snapshot based on dataSource
  const { isLoading, error, data: snapshot } = useQuery({
    queryKey: ['deviceSnapshot', deviceId, device?.dataSource],
    queryFn: async (): Promise<DeviceSnapshotData | null> => {
      if (!device || !device.dataSource) return null;

      try {
        if (device.dataSource === 'gateway' || device.dataSource === 'http') {
          // Fetch Redis live snapshot from Processing Engine
          const response = await apiClient.get<any>(`/devices/${deviceId}/live`);
          if (!response?.data) return null;
          return {
            fields: response.data.data ?? {},
            timestamp: response.data.timestamp ?? null,
            source: 'live',
          };
        } else if (device.dataSource === 'workflow') {
          // Fetch latest derived state
          const response = await apiClient.get<any>(`/devices/${deviceId}/derived-state`);
          if (!response?.data) return null;
          return {
            fields: response.data.derived ?? {},
            timestamp: response.data.lastSeen ?? null,
            source: 'derived',
          };
        }
      } catch (err) {
        console.error(`useDeviceSnapshot error for ${deviceId}:`, err);
        throw err;
      }

      return null;
    },
    enabled: !!device,
    refetchInterval: 5000, // Poll every 5s
    staleTime: 0,          // Always stale after poll interval
    retry: 1,              // Single retry on failure
  });

  return {
    snapshot: snapshot ?? null,
    isLoading,
    error: error instanceof Error ? error : null,
  };
}
