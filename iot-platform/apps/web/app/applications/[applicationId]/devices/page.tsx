'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { DevicesTab } from '../_components/DevicesTab';
import type { Application, Device } from '@repo/types';

interface Props {
  params: Promise<{ applicationId: string }>;
}

export default function ApplicationDevicesPage({ params }: Props) {
  const { applicationId } = use(params);
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async () => {
    const res = await apiClient.get<any>(`/devices?limit=100&offset=0&applicationId=${applicationId}`);
    setDevices(res.data || []);
  }, [applicationId]);

  useEffect(() => {
    (async () => {
      try {
        const [appRes] = await Promise.all([
          apiClient.get<Application>(`/applications/${applicationId}`),
          fetchDevices(),
        ]);
        setApplication(appRes.data);
      } catch {
        router.push('/applications');
      } finally {
        setLoading(false);
      }
    })();
  }, [applicationId, router, fetchDevices]);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Devices</h1>
        </div>
        <DevicesTab
          applicationId={applicationId}
          devices={devices}
          onRefresh={fetchDevices}
        />
      </div>
    </div>
  );
}
