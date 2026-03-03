'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Application } from '@repo/types';

export const applicationKeys = {
  all: ['applications'] as const,
  list: (params: { search?: string; limit: number; offset: number }) =>
    [...applicationKeys.all, 'list', params] as const,
  detail: (id: string) => [...applicationKeys.all, 'detail', id] as const,
};

export function useApplications(params: { search?: string; limit: number; offset: number }) {
  return useQuery({
    queryKey: applicationKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        limit: params.limit.toString(),
        offset: params.offset.toString(),
      });
      if (params.search) searchParams.append('search', params.search);
      return apiClient.getPaginated<Application>(`/applications?${searchParams.toString()}`);
    },
    staleTime: 30_000,
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      apiClient.post<Application>('/applications', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all }),
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Application> }) =>
      apiClient.patch<Application>(`/applications/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all }),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/applications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: applicationKeys.all }),
  });
}
