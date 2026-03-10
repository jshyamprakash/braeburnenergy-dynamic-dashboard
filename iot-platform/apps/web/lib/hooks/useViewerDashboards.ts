import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type { Dashboard } from '@repo/types';

/**
 * Fetch dashboards shared with current user (Viewer kiosk)
 * GET /dashboards/my
 */
export function useViewerDashboards() {
  return useQuery<Dashboard[]>({
    queryKey: ['viewer-dashboards'],
    queryFn: async () => {
      const res = await apiClient.get<Dashboard[]>('/dashboards/my');
      return res.data ?? [];
    },
  });
}
