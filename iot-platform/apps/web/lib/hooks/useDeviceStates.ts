import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  DeviceState,
  CreateDeviceStateInput,
  DeviceStateQueryParams,
  PaginatedResponse,
  AggregateDataPoint,
  AggregateQueryParams,
} from '../types';
import { apiClient } from '../api-client';

// Query keys
const DEVICE_STATE_KEYS = {
  all: ['device-states'] as const,
  device: (deviceId: string) => [...DEVICE_STATE_KEYS.all, deviceId] as const,
  states: (deviceId: string, filters: Record<string, any>) =>
    [...DEVICE_STATE_KEYS.device(deviceId), 'states', filters] as const,
  latest: (deviceId: string) =>
    [...DEVICE_STATE_KEYS.device(deviceId), 'latest'] as const,
  aggregate: (deviceId: string, params: AggregateQueryParams) =>
    [...DEVICE_STATE_KEYS.device(deviceId), 'aggregate', params] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

export function useDeviceStates(
  deviceId: string,
  params?: DeviceStateQueryParams
) {
  return useQuery({
    queryKey: DEVICE_STATE_KEYS.states(deviceId, params || {}),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.startTime)
        queryParams.set('startTime', params.startTime);
      if (params?.endTime) queryParams.set('endTime', params.endTime);
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.offset) queryParams.set('offset', params.offset.toString());

      // Use getPaginated to preserve both data and pagination from backend
      const response = await apiClient.getPaginated<DeviceState>(
        `/devices/${deviceId}/states?${queryParams}`
      );
      return response as PaginatedResponse<DeviceState>;
    },
    enabled: !!deviceId,
  });
}

export function useLatestDeviceState(deviceId: string) {
  return useQuery({
    queryKey: DEVICE_STATE_KEYS.latest(deviceId),
    queryFn: async () => {
      const response = await apiClient.get<DeviceState>(
        `/devices/${deviceId}/states/latest`
      );
      return response.data;
    },
    enabled: !!deviceId,
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}

export function useAggregateDeviceStates(
  deviceId: string,
  params: AggregateQueryParams
) {
  return useQuery({
    queryKey: DEVICE_STATE_KEYS.aggregate(deviceId, params),
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        startTime: params.startTime,
        endTime: params.endTime,
        bucket: params.bucket,
        fields: params.fields.join(','),
        functions: params.functions.join(','),
      });

      const response = await apiClient.get<AggregateDataPoint[]>(
        `/devices/${deviceId}/states/aggregate?${queryParams}`
      );
      return response.data;
    },
    enabled: !!deviceId && !!params.startTime && !!params.endTime,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useCreateDeviceState(deviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDeviceStateInput) => {
      const response = await apiClient.post<DeviceState>(
        `/devices/${deviceId}/states`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate device state queries
      queryClient.invalidateQueries({
        queryKey: DEVICE_STATE_KEYS.device(deviceId),
      });
    },
  });
}

export function useBulkCreateDeviceStates(deviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDeviceStateInput[]) => {
      const response = await apiClient.post<DeviceState[]>(
        `/devices/${deviceId}/states/bulk`,
        { states: data }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate device state queries
      queryClient.invalidateQueries({
        queryKey: DEVICE_STATE_KEYS.device(deviceId),
      });
    },
  });
}
