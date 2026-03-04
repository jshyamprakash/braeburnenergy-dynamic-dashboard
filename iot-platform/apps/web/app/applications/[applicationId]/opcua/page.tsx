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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">OPC-UA Gateway</h1>
        </div>
        <OpcuaTab applicationId={applicationId} />
      </div>
    </div>
  );
}
