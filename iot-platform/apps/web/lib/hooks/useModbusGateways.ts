'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ModbusGateway,
  CreateModbusGatewayInput,
  UpdateModbusGatewayInput,
  PaginatedResponse,
} from '@repo/types';
import { apiClient } from '../api-client';

// Query keys
export const gatewayKeys = {
  all: ['modbus-gateways'] as const,
  lists: () => [...gatewayKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) =>
    [...gatewayKeys.lists(), filters] as const,
  details: () => [...gatewayKeys.all, 'detail'] as const,
  detail: (id: string) => [...gatewayKeys.details(), id] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * List all Modbus gateways, optionally filtered by applicationId
 */
export function useGateways(params?: {
  applicationId?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: gatewayKeys.list(params || {}),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.applicationId)
        queryParams.set('applicationId', params.applicationId);
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.offset) queryParams.set('offset', params.offset.toString());

      const response = await apiClient.getPaginated<any>(
        `/modbus-gateways?${queryParams}`
      );

      // Ensure each gateway has an 'id' field (map from _id if needed)
      const gateways = response.data.map((g: any) => ({
        ...g,
        id: g.id || (g._id ? (typeof g._id === 'string' ? g._id : g._id.toString?.() || g._id) : undefined),
      })) as ModbusGateway[];

      return {
        gateways,
        pagination: response.pagination,
      };
    },
  });
}

/**
 * Get a single Modbus gateway by ULID
 */
export function useGateway(gatewayId: string) {
  return useQuery({
    queryKey: gatewayKeys.detail(gatewayId),
    queryFn: async () => {
      const response = await apiClient.get<any>(
        `/modbus-gateways/${gatewayId}`
      );
      const g = response.data;
      // Ensure id field is set
      return {
        ...g,
        id: g.id || (g._id ? (typeof g._id === 'string' ? g._id : g._id.toString?.() || g._id) : undefined),
      } as ModbusGateway;
    },
    enabled: !!gatewayId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new Modbus gateway
 */
export function useCreateGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateModbusGatewayInput) => {
      const response = await apiClient.post<ModbusGateway>(
        '/modbus-gateways',
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.lists() });
    },
  });
}

/**
 * Update a Modbus gateway
 */
export function useUpdateGateway(gatewayId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateModbusGatewayInput) => {
      const response = await apiClient.patch<ModbusGateway>(
        `/modbus-gateways/${gatewayId}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: gatewayKeys.detail(gatewayId),
      });
    },
  });
}

/**
 * Delete a Modbus gateway
 */
export function useDeleteGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gatewayId: string) => {
      await apiClient.delete(`/modbus-gateways/${gatewayId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.lists() });
    },
  });
}

/**
 * Start polling on a Modbus gateway
 */
export function useStartGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gatewayId: string) => {
      await apiClient.post(`/modbus-gateways/${gatewayId}/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.lists() });
    },
  });
}

/**
 * Stop polling on a Modbus gateway
 */
export function useStopGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gatewayId: string) => {
      await apiClient.post(`/modbus-gateways/${gatewayId}/stop`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gatewayKeys.lists() });
    },
  });
}

/**
 * Test connection to a Modbus gateway.
 * Backend returns { success: true } with no `data` wrapper — so we treat
 * no-throw as success and rethrow on error.
 */
export function useTestConnection() {
  return useMutation({
    mutationFn: async (gatewayId: string) => {
      await apiClient.post(`/modbus-gateways/${gatewayId}/test`, {});
      // Reaching here means backend returned success — no data to unwrap
    },
  });
}

/**
 * Get status of a Modbus gateway
 */
export function useGatewayStatus(gatewayId: string) {
  return useQuery({
    queryKey: [...gatewayKeys.detail(gatewayId), 'status'],
    queryFn: async () => {
      const response = await apiClient.get<{
        status: 'connected' | 'disconnected' | 'error';
        lastConnected?: string;
        lastError?: string;
      }>(`/modbus-gateways/${gatewayId}/status`);
      return response.data;
    },
    enabled: !!gatewayId,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}
