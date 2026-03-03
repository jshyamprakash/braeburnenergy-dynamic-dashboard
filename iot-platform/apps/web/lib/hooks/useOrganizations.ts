'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface Organization {
  _id: string;
  id: string;
  name: string;
  slug: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OrgStats {
  deviceCount: number;
  stateCount: number;
}

export const organizationKeys = {
  all: ['organizations'] as const,
  list: (params: { search?: string; limit: number; offset: number }) =>
    [...organizationKeys.all, 'list', params] as const,
  stats: (id: string) => [...organizationKeys.all, 'stats', id] as const,
};

export function useOrganizations(params: { search?: string; limit: number; offset: number }) {
  return useQuery({
    queryKey: organizationKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        limit: params.limit.toString(),
        offset: params.offset.toString(),
      });
      if (params.search) searchParams.append('search', params.search);
      return apiClient.getPaginated<Organization>(`/organizations?${searchParams.toString()}`);
    },
    staleTime: 30_000,
  });
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; slug?: string; settings?: Record<string, unknown> }) =>
      apiClient.post<Organization>('/organizations', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: organizationKeys.all }),
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Organization> }) =>
      apiClient.patch<Organization>(`/organizations/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: organizationKeys.all }),
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/organizations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: organizationKeys.all }),
  });
}
