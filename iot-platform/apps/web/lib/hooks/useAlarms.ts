import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface AlarmQueryParams {
  limit: number;
  state?: string[];
  priority?: string[];
  enabled?: boolean;
}

export function useAlarms(params: AlarmQueryParams) {
  return useQuery({
    queryKey: ['alarms', params],
    queryFn: async () => {
      const q = new URLSearchParams({ limit: String(params.limit) });
      params.state?.forEach(s => q.append('state', s));
      params.priority?.forEach(p => q.append('priority', p));
      const res = await apiClient.get<any>(`/alarms?${q}`);
      return (res.data?.data ?? res.data ?? []) as any[];
    },
    enabled: params.enabled !== false,
    refetchInterval: 30_000,
  });
}
