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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-xs text-gray-500 dark:text-gray-400">{application?.name}</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflows</h1>
        </div>
        <WorkflowsTab
          applicationId={applicationId}
          workflows={workflows}
          deviceCount={deviceCount}
          onRefresh={fetchWorkflows}
        />
      </div>
    </div>
  );
}
