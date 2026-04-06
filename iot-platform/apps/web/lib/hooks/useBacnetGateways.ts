'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BacnetGateway, CreateBacnetGatewayInput, UpdateBacnetGatewayInput } from '@repo/types';
import { apiClient } from '../api-client';

export const bacnetGatewayKeys = {
  all: ['bacnet-gateways'] as const,
  lists: () => [...bacnetGatewayKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...bacnetGatewayKeys.lists(), filters] as const,
  details: () => [...bacnetGatewayKeys.all, 'detail'] as const,
  detail: (id: string) => [...bacnetGatewayKeys.details(), id] as const,
};

const normalise = (g: any): BacnetGateway => ({
  ...g,
  id: g.id || (g._id ? (typeof g._id === 'string' ? g._id : g._id.toString?.() ?? g._id) : undefined),
});

export function useBacnetGateways(params?: { applicationId?: string; limit?: number }) {
  return useQuery({
    queryKey: bacnetGatewayKeys.list(params || {}),
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params?.applicationId) qs.set('applicationId', params.applicationId);
      if (params?.limit) qs.set('limit', params.limit.toString());
      const response = await apiClient.getPaginated<any>(`/bacnet-gateways?${qs}`);
      return {
        gateways: response.data.map(normalise) as BacnetGateway[],
        pagination: response.pagination,
      };
    },
  });
}

export function useBacnetGateway(id: string) {
  return useQuery({
    queryKey: bacnetGatewayKeys.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<any>(`/bacnet-gateways/${id}`);
      return normalise(res.data) as BacnetGateway;
    },
    enabled: !!id,
  });
}

export function useCreateBacnetGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBacnetGatewayInput) =>
      apiClient.post<BacnetGateway>('/bacnet-gateways', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bacnetGatewayKeys.lists() }),
  });
}

export function useUpdateBacnetGateway(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateBacnetGatewayInput) =>
      apiClient.patch<BacnetGateway>(`/bacnet-gateways/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bacnetGatewayKeys.lists() });
      qc.invalidateQueries({ queryKey: bacnetGatewayKeys.detail(id) });
    },
  });
}

export function useDeleteBacnetGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/bacnet-gateways/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: bacnetGatewayKeys.lists() }),
  });
}

export function useStartBacnetGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/bacnet-gateways/${id}/start`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: bacnetGatewayKeys.lists() }),
  });
}

export function useStopBacnetGateway() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/bacnet-gateways/${id}/stop`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: bacnetGatewayKeys.lists() }),
  });
}

export function useTestBacnetConnection() {
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/bacnet-gateways/${id}/test`, {}),
  });
}

export function useBacnetGatewayStatus(id: string) {
  return useQuery({
    queryKey: [...bacnetGatewayKeys.detail(id), 'status'],
    queryFn: async () => {
      const res = await apiClient.get<{ running: boolean; connected: boolean }>(`/bacnet-gateways/${id}/status`);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: 10000,
  });
}
