import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';

interface AggregatedDataPoint {
  bucket: string;
  values: Record<string, number>;
}

interface AggregatedResponse {
  deviceId: string;
  startTime: string;
  endTime: string;
  bucket: string;
  data: AggregatedDataPoint[];
}

interface UseDeviceStatesAggregatedParams {
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  fields: string[]; // e.g., ['temperature', 'humidity']
  functions: string[]; // e.g., ['avg', 'min', 'max']
  bucket?: '1m' | '5m' | '15m' | '1h' | '6h' | '1d' | '1w';
}

/**
 * Automatically select appropriate bucket interval based on time range
 */
function selectBucketInterval(startTime: string, endTime: string): string {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const durationMs = end - start;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  // Auto-select bucket based on duration
  if (durationMs <= hour) return '1m';           // Last hour: 1-minute buckets
  if (durationMs <= 6 * hour) return '5m';       // Last 6 hours: 5-minute buckets
  if (durationMs <= day) return '15m';           // Last day: 15-minute buckets
  if (durationMs <= 7 * day) return '1h';        // Last week: 1-hour buckets
  if (durationMs <= 30 * day) return '6h';       // Last month: 6-hour buckets
  if (durationMs <= 365 * day) return '1d';      // Last year: 1-day buckets
  return '1w';                                    // More than year: 1-week buckets
}

/**
 * Hook to fetch aggregated device states
 *
 * Uses server-side aggregation to reduce data transfer and improve performance.
 * Automatically selects appropriate bucket interval based on time range.
 *
 * @example
 * const { data, isLoading } = useDeviceStatesAggregated('01HGW...', {
 *   startTime: '2026-02-06T00:00:00Z',
 *   endTime: '2026-02-06T23:59:59Z',
 *   fields: ['temperature', 'humidity'],
 *   functions: ['avg'],
 * });
 */
export function useDeviceStatesAggregated(
  deviceId: string | undefined,
  params: UseDeviceStatesAggregatedParams
) {
  const bucket = params.bucket || selectBucketInterval(params.startTime, params.endTime);

  return useQuery({
    queryKey: ['device-states-aggregated', deviceId, params, bucket],
    queryFn: async () => {
      if (!deviceId) throw new Error('Device ID is required');

      const queryParams = new URLSearchParams({
        startTime: params.startTime,
        endTime: params.endTime,
        bucket,
        fields: params.fields.join(','),
        functions: params.functions.join(','),
      });

      const response = await apiClient.get<AggregatedResponse>(
        `/devices/${deviceId}/states/aggregate?${queryParams}`
      );

      return response.data;
    },
    enabled: !!deviceId && !!params.startTime && !!params.endTime,
    staleTime: 30000, // Cache for 30 seconds
  });
}
