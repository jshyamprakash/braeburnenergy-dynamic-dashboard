'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  OpcuaGateway,
  CreateOpcuaGatewayInput,
  UpdateOpcuaGatewayInput,
  PaginatedResponse,
  OpcuaBrowseNode,
} from '@repo/types';
import { apiClient } from '../api-client';

// Query keys
export const opcuaGatewayKeys = {
  all: ['opcua-gateways'] as const,
  lists: () => [...opcuaGatewayKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) =>
    [...opcuaGatewayKeys.lists(), filters] as const,
  details: () => [...opcuaGatewayKeys.all, 'detail'] as const,
  detail: (id: string) => [...opcuaGatewayKeys.details(), id] as const,
  stats: (id: string) => [...opcuaGatewayKeys.detail(id), 'statistics'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * List all OPC-UA gateways, optionally filtered by applicationId
 */
export function useGateways(params?: {
  applicationId?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: opcuaGatewayKeys.list(params || {}),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.applicationId)
        queryParams.set('applicationId', params.applicationId);
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.offset) queryParams.set('offset', params.offset.toString());

      const response = await apiClient.getPaginated<any>(
        `/opcua-gateways?${queryParams}`
      );

      const gateways = response.data.map((g: any) => ({
        ...g,
        id: g.id || (g._id ? (typeof g._id === 'string' ? g._id : g._id.toString?.() || g._id) : undefined),
      })) as OpcuaGateway[];

      return {
        gateways,
        pagination: response.pagination,
      };
    },
  });
}

/**
 * Get a single OPC-UA gateway by ID
 */
export function useGateway(gatewayId: string) {
  return useQuery({
    queryKey: opcuaGatewayKeys.detail(gatewayId),
    queryFn: async () => {
      const response = await apiClient.get<any>(
        `/opcua-gateways/${gatewayId}`
      );
      const g = response.data;
      return {
        ...g,
        id: g.id || (g._id ? (typeof g._id === 'string' ? g._id : g._id.toString?.() || g._id) : undefined),
      } as OpcuaGateway;
    },
    enabled: !!gatewayId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Create a new OPC-UA gateway
 */
export function useCreateGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOpcuaGatewayInput) => {
      const response = await apiClient.post<OpcuaGateway>(
        '/opcua-gateways',
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: opcuaGatewayKeys.lists() });
    },
  });
}

/**
 * Update an OPC-UA gateway
 */
export function useUpdateGateway(gatewayId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateOpcuaGatewayInput) => {
      const response = await apiClient.patch<OpcuaGateway>(
        `/opcua-gateways/${gatewayId}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: opcuaGatewayKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: opcuaGatewayKeys.detail(gatewayId),
      });
    },
  });
}

/**
 * Delete an OPC-UA gateway
 */
export function useDeleteGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gatewayId: string) => {
      await apiClient.delete(`/opcua-gateways/${gatewayId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: opcuaGatewayKeys.lists() });
    },
  });
}

/**
 * Start an OPC-UA gateway
 */
export function useStartGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gatewayId: string) => {
      await apiClient.post(`/opcua-gateways/${gatewayId}/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: opcuaGatewayKeys.lists() });
    },
  });
}

/**
 * Stop an OPC-UA gateway
 */
export function useStopGateway() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gatewayId: string) => {
      await apiClient.post(`/opcua-gateways/${gatewayId}/stop`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: opcuaGatewayKeys.lists() });
    },
  });
}

/**
 * Test connection to an OPC-UA gateway
 */
export function useTestConnection() {
  return useMutation({
    mutationFn: async (gatewayId: string) => {
      await apiClient.post(`/opcua-gateways/${gatewayId}/test`, {});
    },
  });
}

/**
 * Get statistics for an OPC-UA gateway
 */
export function useGetStatistics(gatewayId: string) {
  return useQuery({
    queryKey: opcuaGatewayKeys.stats(gatewayId),
    queryFn: async () => {
      const response = await apiClient.get<any>(
        `/opcua-gateways/${gatewayId}/statistics`
      );
      return response.data;
    },
    enabled: !!gatewayId,
    refetchInterval: 10000,
  });
}

/**
 * Browse OPC-UA server nodes
 */
export function useBrowseNodes() {
  return useMutation({
    mutationFn: async ({ gatewayId, nodeId }: { gatewayId: string; nodeId?: string }) => {
      const response = await apiClient.post<{ nodeId: string; nodes: OpcuaBrowseNode[] }>(
        `/opcua-gateways/${gatewayId}/browse`,
        { nodeId }
      );
      return response.data;
    },
  });
}
