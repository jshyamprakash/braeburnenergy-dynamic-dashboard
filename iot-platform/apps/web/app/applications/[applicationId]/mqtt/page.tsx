'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useApplication } from '@/lib/hooks/useApplications';
import { MqttTab } from '../_components/MqttTab';

interface Props {
  params: Promise<{ applicationId: string }>;
}

export default function ApplicationMqttPage({ params }: Props) {
  const { applicationId } = use(params);
  const router = useRouter();
  const { data: application, isLoading, isError } = useApplication(applicationId);

  if (isError) { router.push('/applications'); return null; }

  if (isLoading) {
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">MQTT Gateway</h1>
      </div>
      <MqttTab applicationId={applicationId} />
    </div>
  );
}
