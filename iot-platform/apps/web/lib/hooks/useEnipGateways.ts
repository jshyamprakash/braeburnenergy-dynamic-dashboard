'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EnipGateway, CreateEnipGatewayInput, UpdateEnipGatewayInput } from '@repo/types';
import { apiClient } from '../api-client';

export const enipGatewayKeys = {
  all: ['enip-gateways'] as const,
  lists: () => [...enipGatewayKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...enipGatewayKeys.lists(), filters] as const,
  details: () => [...enipGatewayKeys.all, 'detail'] as const,
  detail: (id: string) => [...enipGatewayKeys.details(), id] as const,
};

const normalise = (g: any): EnipGateway => ({
  ...g,
  id: g.id || (g._id ? (typeof g._id === 'string' ? g._id : g._id.toString?.() ?? g._id) : undefined),
});

export function useEnipGateways(params?: { applicationId?: string; limit?: number }) {
  return useQuery({
    queryKey: enipGatewayKeys.list(params || {}),
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params?.applicationId) qs.set('applicationId', params.applicationId);
      if (params?.limit) qs.set('limit', params.limit.toString());
      const response = await apiClient.getPaginated<any>(`/enip-gateways?${qs}`);
      return {
        gateways: response.data.map(normalise) as EnipGateway[],
        pagination: response.pagination,
      };
    },
  });
}

export function useEnipGateway(id: string) {
  return useQuery({
    queryKey: enipGatewayKeys.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<any>(`/enip-gateways/${id}`);
      return normalise(res.data) as EnipGateway;
    },
    enabled: !!id,
  });
}

export function useCreateEnipGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEnipGatewayInput) =>
      apiClient.post<EnipGateway>('/enip-gateways', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: enipGatewayKeys.lists() }),
  });
}

export function useUpdateEnipGateway(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateEnipGatewayInput) =>
      apiClient.patch<EnipGateway>(`/enip-gateways/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: enipGatewayKeys.lists() });
      qc.invalidateQueries({ queryKey: enipGatewayKeys.detail(id) });
    },
  });
}

export function useDeleteEnipGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/enip-gateways/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: enipGatewayKeys.lists() }),
  });
}

export function useStartEnipGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/enip-gateways/${id}/start`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: enipGatewayKeys.lists() }),
  });
}

export function useStopEnipGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/enip-gateways/${id}/stop`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: enipGatewayKeys.lists() }),
  });
}

export function useTestEnipConnection() {
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/enip-gateways/${id}/test`, {}),
  });
}

export function useEnipGatewayStatus(id: string) {
  return useQuery({
    queryKey: [...enipGatewayKeys.detail(id), 'status'],
    queryFn: async () => {
      const res = await apiClient.get<{ running: boolean; connected: boolean }>(`/enip-gateways/${id}/status`);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: 10000,
  });
}
