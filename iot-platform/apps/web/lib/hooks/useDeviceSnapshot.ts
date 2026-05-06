'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type { UseDeviceSnapshotResult, DeviceSnapshotData, DeviceState } from '../types';
import { useDevice } from './useDevices';
import { useDeviceStateUpdates } from './useWebSocket';

/**
 * useDeviceSnapshot — Latest multi-field snapshot for device data
 *
 * Routes based on device.dataSource (ADR-046):
 * - gateway / http → GET /devices/:id/live (Redis snapshot from Processing Engine)
 * - workflow       → GET /devices/:id/derived-state (latest derived state)
 *
 * Also subscribes to WebSocket device:state events so broadcastState-only workflows
 * (Path A — no DB write) immediately update all snapshot-based widgets.
 */
export function useDeviceSnapshot(deviceId: string): UseDeviceSnapshotResult {
  const { data: device } = useDevice(deviceId);

  // WebSocket live fields — updated on every broadcastState emission
  const [wsFields, setWsFields] = useState<Record<string, unknown> | null>(null);

  const handleStateUpdate = useCallback((state: DeviceState) => {
    const incoming = state.data as Record<string, unknown> | undefined;
    if (incoming && Object.keys(incoming).length > 0) {
      setWsFields(incoming);
    }
  }, []);

  useDeviceStateUpdates(deviceId || null, handleStateUpdate);

  // REST poll — seeds on mount and refreshes every 5 s
  const { isLoading, error, data: restSnapshot } = useQuery({
    queryKey: ['deviceSnapshot', deviceId, device?.dataSource],
    queryFn: async (): Promise<DeviceSnapshotData | null> => {
      if (!device || !device.dataSource) return null;

      try {
        if (device.dataSource === 'gateway' || device.dataSource === 'http') {
          const response = await apiClient.get<any>(`/devices/${deviceId}/live`);
          if (!response?.data) return null;
          return {
            fields: response.data.data ?? {},
            timestamp: response.data.timestamp ?? null,
            source: 'live',
          };
        } else if (device.dataSource === 'workflow') {
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
    refetchInterval: 5000,
    staleTime: 0,
    retry: 1,
  });

  // Merge REST + WebSocket — WebSocket fields take precedence (more recent)
  const snapshot = useMemo((): DeviceSnapshotData | null => {
    const restFields = restSnapshot?.fields ?? {};
    const merged = { ...restFields, ...(wsFields ?? {}) };
    if (Object.keys(merged).length === 0) return null;
    return {
      fields: merged,
      timestamp: restSnapshot?.timestamp ?? null,
      source: restSnapshot?.source ?? 'derived',
    };
  }, [restSnapshot, wsFields]);

  return {
    snapshot,
    isLoading,
    error: error instanceof Error ? error : null,
  };
}
