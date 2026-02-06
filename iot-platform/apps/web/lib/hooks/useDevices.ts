import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Device,
  CreateDeviceInput,
  UpdateDeviceInput,
  PaginatedResponse,
} from '../types';
import { apiClient } from '../api-client';

// Query keys
const DEVICE_KEYS = {
  all: ['devices'] as const,
  lists: () => [...DEVICE_KEYS.all, 'list'] as const,
  list: (filters: Record<string, any>) =>
    [...DEVICE_KEYS.lists(), filters] as const,
  details: () => [...DEVICE_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...DEVICE_KEYS.details(), id] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

export function useDevices(params?: {
  limit?: number;
  offset?: number;
  tags?: string[];
}) {
  return useQuery({
    queryKey: DEVICE_KEYS.list(params || {}),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.offset) queryParams.set('offset', params.offset.toString());
      if (params?.tags) queryParams.set('tags', params.tags.join(','));

      const response = await apiClient.get<Device[]>(
        `/devices?${queryParams}`
      );
      // Backend returns plain array, wrap it for consistency
      return {
        data: response.data,
        pagination: {
          total: response.data.length,
          limit: params?.limit || 100,
          offset: params?.offset || 0,
          hasMore: false,
        },
      };
    },
  });
}

export function useDevice(deviceId: string) {
  return useQuery({
    queryKey: DEVICE_KEYS.detail(deviceId),
    queryFn: async () => {
      const response = await apiClient.get<Device>(
        `/devices/${deviceId}`
      );
      return response.data;
    },
    enabled: !!deviceId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDeviceInput) => {
      const response = await apiClient.post<Device>('/devices', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate device lists to refetch
      queryClient.invalidateQueries({ queryKey: DEVICE_KEYS.lists() });
    },
  });
}

export function useUpdateDevice(deviceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateDeviceInput) => {
      const response = await apiClient.patch<Device>(
        `/devices/${deviceId}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate specific device and lists
      queryClient.invalidateQueries({ queryKey: DEVICE_KEYS.detail(deviceId) });
      queryClient.invalidateQueries({ queryKey: DEVICE_KEYS.lists() });
    },
  });
}

export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      await apiClient.delete(`/devices/${deviceId}`);
    },
    onSuccess: () => {
      // Invalidate device lists to refetch
      queryClient.invalidateQueries({ queryKey: DEVICE_KEYS.lists() });
    },
  });
}
