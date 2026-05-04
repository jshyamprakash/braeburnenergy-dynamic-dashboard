'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { WorkflowsTab } from '../_components/WorkflowsTab';
import type { Application, Workflow } from '@repo/types';

interface Props {
  params: Promise<{ applicationId: string }>;
}

export default function ApplicationWorkflowsPage({ params }: Props) {
  const { applicationId } = use(params);
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [deviceCount, setDeviceCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchWorkflows = useCallback(async () => {
    const res = await apiClient.get<Workflow[]>(`/workflows?applicationId=${applicationId}`);
    setWorkflows(res.data || []);
  }, [applicationId]);

  useEffect(() => {
    (async () => {
      try {
        const [appRes, devRes] = await Promise.all([
          apiClient.get<Application>(`/applications/${applicationId}`),
          apiClient.get<any>(`/devices?limit=1&offset=0&applicationId=${applicationId}`),
          fetchWorkflows(),
        ]);
        setApplication(appRes.data);
        setDeviceCount((devRes.data as any[])?.length ?? 0);
      } catch {
        router.push('/applications');
      } finally {
        setLoading(false);
      }
    })();
  }, [applicationId, router, fetchWorkflows]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-slate-400 dark:text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-slate-400 dark:text-slate-500">{application?.name}</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Workflows</h1>
      </div>
      <WorkflowsTab
        applicationId={applicationId}
        workflows={workflows}
        deviceCount={deviceCount}
        onRefresh={fetchWorkflows}
      />
    </div>
  );
}
