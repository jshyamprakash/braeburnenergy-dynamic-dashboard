import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useCreateRetentionPolicy() {
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.post('/retention-policies', payload),
  });
}

export function useUpdateRetentionPolicy() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiClient.patch(`/retention-policies/${id}`, payload),
  });
}

export function useDeleteRetentionPolicy() {
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/retention-policies/${id}`),
  });
}
