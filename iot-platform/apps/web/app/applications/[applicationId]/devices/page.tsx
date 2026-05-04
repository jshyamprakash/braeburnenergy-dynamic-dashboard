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
        devices={devices}
        onRefresh={fetchDevices}
      />
    </div>
  );
}
