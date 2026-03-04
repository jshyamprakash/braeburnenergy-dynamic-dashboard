'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { DashboardsTab } from '../_components/DashboardsTab';
import type { Application } from '@repo/types';

interface DashboardItem {
  _id: string;
  dashboardId: string;
  name: string;
  description?: string;
  blocks: Array<{ id: string }>;
  updatedAt: string;
}

interface Props {
  params: Promise<{ applicationId: string }>;
}

export default function ApplicationDashboardsPage({ params }: Props) {
  const { applicationId } = use(params);
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [dashboards, setDashboards] = useState<DashboardItem[]>([]);
  const [deviceCount, setDeviceCount] = useState(0);
  const [workflowCount, setWorkflowCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDashboards = useCallback(async () => {
    const res = await apiClient.get<any>(`/dashboards?applicationId=${applicationId}`);
    setDashboards(res.data || []);
  }, [applicationId]);

  useEffect(() => {
    (async () => {
      try {
        const [appRes, devRes, wfRes] = await Promise.all([
          apiClient.get<Application>(`/applications/${applicationId}`),
          apiClient.get<any>(`/devices?limit=1&offset=0&applicationId=${applicationId}`),
          apiClient.get<any>(`/workflows?applicationId=${applicationId}`),
          fetchDashboards(),
        ]);
        setApplication(appRes.data);
        setDeviceCount((devRes.data as any[])?.length ?? 0);
        setWorkflowCount((wfRes.data || []).length);
      } catch {
        router.push('/applications');
      } finally {
        setLoading(false);
      }
    })();
  }, [applicationId, router, fetchDashboards]);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboards</h1>
        </div>
        <DashboardsTab
          applicationId={applicationId}
          dashboards={dashboards}
          deviceCount={deviceCount}
          workflowCount={workflowCount}
          onRefresh={fetchDashboards}
        />
      </div>
    </div>
  );
}
