'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type { UseDeviceTimeSeriesOptions, UseDeviceTimeSeriesResult, TimeSeriesPoint, DeviceState } from '../types';
import { useDevice } from './useDevices';
import { useDeviceStateUpdates } from './useWebSocket';

/**
 * useDeviceTimeSeries — Rolling time-series buffer for real-time charts
 *
 * Seeds from history based on device.dataSource:
 * - gateway/http → GET /devices/:id/states (raw device_states)
 * - workflow     → GET /devices/:id/derived-state/history (derived history)
 *
 * Returns rolling buffer of [timestampMs, value] points with WebSocket updates.
 */
export function useDeviceTimeSeries(
  deviceId: string,
  options: UseDeviceTimeSeriesOptions
): UseDeviceTimeSeriesResult {
  const { field, maxPoints = 200, seedCount = 50 } = options;

  const [points, setPoints] = useState<TimeSeriesPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch device to get dataSource
  const { data: device } = useDevice(deviceId);

  // Seed history based on dataSource
  const { isLoading, data: seedData } = useQuery({
    queryKey: ['deviceTimeSeries', deviceId, field, device?.dataSource],
    queryFn: async () => {
      if (!device || !device.dataSource) return null;

      if (device.dataSource === 'gateway' || device.dataSource === 'http') {
        // Fetch raw device states history
        const params = new URLSearchParams({ limit: String(seedCount) });
        const response = await apiClient.get<any[]>(`/devices/${deviceId}/states?${params.toString()}`);
        if (!response.data) return null;

        // Map to TimeSeriesPoint: extract field from data, use timestamp
        return response.data.map((state: any) => [
          new Date(state.timestamp).getTime(),
          state.data?.[field] ?? 0,
        ] as TimeSeriesPoint);
      } else if (device.dataSource === 'workflow') {
        // Fetch derived state history
        const params = new URLSearchParams({ limit: String(seedCount) });
        const response = await apiClient.get<any[]>(
          `/devices/${deviceId}/derived-state/history?${params.toString()}`
        );
        if (!response.data) return null;

        // Map to TimeSeriesPoint: extract field from derived, use timestamp
        return response.data.map((state: any) => [
          new Date(state.timestamp).getTime(),
          state.derived?.[field] ?? 0,
        ] as TimeSeriesPoint);
      }

      return null;
    },
    enabled: !!device && !!device.dataSource,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Initialize points from seed data (oldest first → reverse for natural time order)
  useEffect(() => {
    if (seedData) {
      setPoints(seedData.sort((a, b) => a[0] - b[0]));
    }
  }, [seedData]);

  // Append new point to rolling buffer
  const appendPoint = useCallback((timestamp: number, value: number) => {
    setPoints((prev) => {
      const updated = [...prev, [timestamp, value] as TimeSeriesPoint];
      // Trim to maxPoints, keeping newest
      if (updated.length > maxPoints) {
        return updated.slice(updated.length - maxPoints);
      }
      return updated;
    });
  }, [maxPoints]);

  // WebSocket subscription — append raw field value to rolling buffer
  const handleStateUpdate = useCallback((state: DeviceState) => {
    const value = state.data?.[field];
    if (value !== undefined && typeof value === 'number') {
      appendPoint(new Date(state.timestamp).getTime(), value);
    }
  }, [field, appendPoint]);

  // Subscribe to device state updates
  useDeviceStateUpdates(deviceId, handleStateUpdate);

  // Track connection status (placeholder for now)
  useEffect(() => {
    setIsConnected(true); // TODO: wire to actual WebSocket connection state from Socket.io
  }, []);

  return {
    points,
    isLoading,
    isConnected,
  };
}
