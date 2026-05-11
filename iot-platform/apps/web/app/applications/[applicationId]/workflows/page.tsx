'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useApplication } from '@/lib/hooks/useApplications';
import { useWorkflows } from '@/lib/hooks/useWorkflows';
import { useDevices } from '@/lib/hooks/useDevices';
import { WorkflowsTab } from '../_components/WorkflowsTab';

interface Props {
  params: Promise<{ applicationId: string }>;
}

export default function ApplicationWorkflowsPage({ params }: Props) {
  const { applicationId } = use(params);
  const router = useRouter();
  const { data: application, isLoading: appLoading, isError: appError } = useApplication(applicationId);
  const { data: workflows = [], isLoading: wfLoading, refetch } = useWorkflows({ applicationId });
  const { data: devicesData } = useDevices({ applicationId, limit: 1 });
  const deviceCount = devicesData?.devices?.length ?? 0;

  if (appError) { router.push('/applications'); return null; }

  if (appLoading || wfLoading) {
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
        onRefresh={async () => { await refetch(); }}
      />
    </div>
  );
}
