'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  MqttGateway,
  CreateMqttGatewayInput,
  UpdateMqttGatewayInput,
} from '@repo/types';
import { apiClient } from '../api-client';

export const mqttGatewayKeys = {
  all: ['mqtt-gateways'] as const,
  lists: () => [...mqttGatewayKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...mqttGatewayKeys.lists(), filters] as const,
  details: () => [...mqttGatewayKeys.all, 'detail'] as const,
  detail: (id: string) => [...mqttGatewayKeys.details(), id] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

export function useMqttGateways(params?: { applicationId?: string; limit?: number; page?: number }) {
  return useQuery({
    queryKey: mqttGatewayKeys.list(params || {}),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.applicationId) queryParams.set('applicationId', params.applicationId);
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.page) queryParams.set('page', params.page.toString());

      const response = await apiClient.get<any>(`/mqtt-gateways?${queryParams}`);
      const gateways = response.data.data?.map((g: any) => ({
        ...g,
        id: g.id || (g._id ? (typeof g._id === 'string' ? g._id : g._id.toString?.() || g._id) : undefined),
      })) as MqttGateway[];

      return { gateways, pagination: response.data.pagination };
    },
  });
}

export function useMqttGateway(gatewayId: string) {
  return useQuery({
    queryKey: mqttGatewayKeys.detail(gatewayId),
    queryFn: async () => {
      const response = await apiClient.get<any>(`/mqtt-gateways/${gatewayId}`);
      const g = response.data.data || response.data;
      return { ...g, id: g.id || g._id } as MqttGateway;
    },
    enabled: !!gatewayId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

export function useCreateMqttGateway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateMqttGatewayInput) => {
      const response = await apiClient.post<MqttGateway>('/mqtt-gateways', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mqttGatewayKeys.lists() });
    },
  });
}

export function useUpdateMqttGateway(gatewayId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateMqttGatewayInput) => {
      const response = await apiClient.patch<MqttGateway>(`/mqtt-gateways/${gatewayId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mqttGatewayKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mqttGatewayKeys.detail(gatewayId) });
    },
  });
}

export function useDeleteMqttGateway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gatewayId: string) => {
      await apiClient.delete(`/mqtt-gateways/${gatewayId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mqttGatewayKeys.lists() });
    },
  });
}

export function useStartMqttGateway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gatewayId: string) => {
      await apiClient.post(`/mqtt-gateways/${gatewayId}/start`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mqttGatewayKeys.lists() });
    },
  });
}

export function useStopMqttGateway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gatewayId: string) => {
      await apiClient.post(`/mqtt-gateways/${gatewayId}/stop`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mqttGatewayKeys.lists() });
    },
  });
}

export function useTestMqttConnection() {
  return useMutation({
    mutationFn: async (gatewayId: string) => {
      await apiClient.post(`/mqtt-gateways/${gatewayId}/test`, {});
    },
  });
}

export function useMqttGatewayStatus(gatewayId: string) {
  return useQuery({
    queryKey: [...mqttGatewayKeys.detail(gatewayId), 'status'],
    queryFn: async () => {
      const response = await apiClient.get<{ running: boolean; connected: boolean }>(
        `/mqtt-gateways/${gatewayId}/status`
      );
      return response.data;
    },
    enabled: !!gatewayId,
    refetchInterval: 10000,
  });
}
