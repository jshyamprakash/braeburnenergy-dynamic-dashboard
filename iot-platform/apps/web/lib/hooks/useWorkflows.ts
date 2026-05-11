import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Workflow } from '@repo/types';

export const workflowKeys = {
  all: ['workflows'] as const,
  list: (params: Record<string, unknown>) => [...workflowKeys.all, 'list', params] as const,
  detail: (id: string) => [...workflowKeys.all, 'detail', id] as const,
};

export function useWorkflows(params?: { applicationId?: string }) {
  return useQuery({
    queryKey: workflowKeys.list(params ?? {}),
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params?.applicationId) q.set('applicationId', params.applicationId);
      const { data } = await apiClient.get<Workflow[]>(`/workflows?${q}`);
      return data ?? [];
    },
    enabled: !!params?.applicationId,
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workflowId: string) => apiClient.delete(`/workflows/${workflowId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useEnableWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workflowId: string) => apiClient.post(`/workflows/${workflowId}/enable`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useDisableWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (workflowId: string) => apiClient.post(`/workflows/${workflowId}/disable`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.post<Workflow>('/workflows', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiClient.patch<Workflow>(`/workflows/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useWorkflowTemplates() {
  return useQuery({
    queryKey: [...workflowKeys.all, 'templates'],
    queryFn: async () => {
      const res = await apiClient.get<any[]>('/workflow-templates');
      return res.data ?? [];
    },
    staleTime: 60_000,
  });
}

export function useEvaluateExpression(workflowId: string) {
  return useMutation({
    mutationFn: (expression: string) =>
      apiClient.post<any>(`/workflows/${workflowId}/evaluate-expression`, { expression }),
  });
}

export function useCsvUpload() {
  return useMutation({
    mutationFn: (formData: FormData) => apiClient.postForm('/workflows/csv-upload', formData),
  });
}

export function useAllWorkflows(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...workflowKeys.all, 'list-all'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/workflows?limit=100');
      const body = res.data as any;
      return (body?.data?.workflows ?? body?.workflows ?? []) as Array<{ workflowId: string; name: string }>;
    },
    enabled: options?.enabled !== false,
  });
}

export function useWorkflowDetail(workflowId: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.detail(workflowId ?? ''),
    queryFn: async () => {
      const res = await apiClient.get<any>(`/workflows/${workflowId}`);
      const body = res.data as any;
      return body?.data ?? body ?? {};
    },
    enabled: !!workflowId,
  });
}
