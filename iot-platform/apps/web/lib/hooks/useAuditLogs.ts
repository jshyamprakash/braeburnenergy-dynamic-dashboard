import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface AuditLog {
  _id: string;
  username: string;
  userId?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT';
  resource: string;
  resourceId?: string;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
  changes?: { before: any; after: any };
  metadata?: { ipAddress?: string; userAgent?: string; sessionId?: string; reason?: string };
}

export interface AuditLogStats {
  total: number;
  byAction: Array<{ _id: string; count: number }>;
  byResource: Array<{ _id: string; count: number }>;
  bySuccess: Array<{ _id: boolean; count: number }>;
}

interface AuditLogsParams {
  action?: string;
  resource?: string;
  username?: string;
  success?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

export const auditLogKeys = {
  all: ['audit-logs'] as const,
  list: (p: AuditLogsParams) => [...auditLogKeys.all, 'list', p] as const,
  stats: (p: { startDate?: string; endDate?: string }) => [...auditLogKeys.all, 'stats', p] as const,
};

export function useAuditLogs(params: AuditLogsParams) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params.action) q.append('action', params.action);
      if (params.resource) q.append('resource', params.resource);
      if (params.username) q.append('username', params.username);
      if (params.success) q.append('success', params.success);
      if (params.startDate) q.append('startDate', params.startDate);
      if (params.endDate) q.append('endDate', params.endDate);
      q.append('page', String(params.page));
      q.append('limit', String(params.limit));

      const res = await apiClient.get<any>(`/audit-logs?${q}`);
      return {
        logs: (res as any).data as AuditLog[],
        total: (res as any).pagination?.total ?? 0,
        totalPages: (res as any).pagination?.totalPages ?? 0,
      };
    },
  });
}

export function useAuditLogStats(params: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: auditLogKeys.stats(params),
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params.startDate) q.append('startDate', params.startDate);
      if (params.endDate) q.append('endDate', params.endDate);
      const res = await apiClient.get<AuditLogStats>(`/audit-logs/statistics?${q}`);
      return (res as any).data as AuditLogStats;
    },
  });
}
