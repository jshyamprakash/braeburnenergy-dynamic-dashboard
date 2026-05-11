import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Dashboard } from '@repo/types';

export const dashboardKeys = {
  all: ['dashboards'] as const,
  list: (params: Record<string, unknown>) => [...dashboardKeys.all, 'list', params] as const,
};

export function useDashboards(params?: { applicationId?: string }) {
  return useQuery({
    queryKey: dashboardKeys.list(params ?? {}),
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params?.applicationId) q.set('applicationId', params.applicationId);
      const { data } = await apiClient.get<Dashboard[]>(`/dashboards?${q}`);
      return data ?? [];
    },
    enabled: !!params?.applicationId,
  });
}

export function useCreateDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => apiClient.post('/dashboards', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: dashboardKeys.all }),
  });
}

export function useDeleteDashboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dashboardId: string) => apiClient.delete(`/dashboards/${dashboardId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: dashboardKeys.all }),
  });
}

export function useShareDashboard() {
  return useMutation({
    mutationFn: ({ dashboardId, assignments }: { dashboardId: string; assignments: Array<{ userId: string; pageIds: string[] }> }) =>
      apiClient.post<{ sharedWithUsers: Array<{ userId: string; pageIds: string[] }> }>(
        `/dashboards/${dashboardId}/share`,
        { assignments }
      ),
  });
}
