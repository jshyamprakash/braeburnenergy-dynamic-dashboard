'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useApplication } from '@/lib/hooks/useApplications';
import { useDevices } from '@/lib/hooks/useDevices';
import { DevicesTab } from '../_components/DevicesTab';

interface Props {
  params: Promise<{ applicationId: string }>;
}

export default function ApplicationDevicesPage({ params }: Props) {
  const { applicationId } = use(params);
  const router = useRouter();
  const { data: application, isLoading: appLoading, isError: appError } = useApplication(applicationId);
  const { data: devicesData, isLoading: devLoading, refetch } = useDevices({ applicationId, limit: 100 });

  if (appError) { router.push('/applications'); return null; }

  if (appLoading || devLoading) {
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Devices</h1>
      </div>
      <DevicesTab
        applicationId={applicationId}
        devices={(devicesData?.devices ?? []) as any}
        onRefresh={async () => { await refetch(); }}
      />
    </div>
  );
}
