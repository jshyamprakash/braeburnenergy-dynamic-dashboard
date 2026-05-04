'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { OpcuaTab } from '../_components/OpcuaTab';
import type { Application } from '@repo/types';

interface Props {
  params: Promise<{ applicationId: string }>;
}

export default function ApplicationOpcuaPage({ params }: Props) {
  const { applicationId } = use(params);
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<Application>(`/applications/${applicationId}`)
      .then(res => setApplication(res.data))
      .catch(() => router.push('/applications'))
      .finally(() => setLoading(false));
  }, [applicationId, router]);

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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">OPC-UA Gateway</h1>
      </div>
      <OpcuaTab applicationId={applicationId} />
    </div>
  );
}
