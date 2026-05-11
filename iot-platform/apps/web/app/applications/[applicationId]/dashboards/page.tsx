'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useApplication } from '@/lib/hooks/useApplications';
import { useDashboards } from '@/lib/hooks/useDashboards';
import { useWorkflows } from '@/lib/hooks/useWorkflows';
import { useDevices } from '@/lib/hooks/useDevices';
import { DashboardsTab } from '../_components/DashboardsTab';

interface Props {
  params: Promise<{ applicationId: string }>;
}

export default function ApplicationDashboardsPage({ params }: Props) {
  const { applicationId } = use(params);
  const router = useRouter();
  const { data: application, isLoading: appLoading, isError: appError } = useApplication(applicationId);
  const { data: dashboards = [], isLoading: dbLoading, refetch } = useDashboards({ applicationId });
  const { data: devicesData } = useDevices({ applicationId, limit: 1 });
  const { data: workflows = [] } = useWorkflows({ applicationId });
  const deviceCount = devicesData?.devices?.length ?? 0;
  const workflowCount = workflows.length;

  if (appError) { router.push('/applications'); return null; }

  if (appLoading || dbLoading) {
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboards</h1>
      </div>
      <DashboardsTab
        applicationId={applicationId}
        dashboards={dashboards as any}
        deviceCount={deviceCount}
        workflowCount={workflowCount}
        onRefresh={async () => { await refetch(); }}
      />
    </div>
  );
}
