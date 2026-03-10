'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { KosmosShell } from '@/components/kosmos/KosmosShell';

interface DashboardDetailPageProps {
  params: Promise<{ dashboardId: string }>;
}

function DashboardDetailContent({ dashboardId }: { dashboardId: string }) {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId') || '';

  return <KosmosShell dashboardId={dashboardId} applicationId={applicationId} />;
}

export default function DashboardDetailPage({ params }: DashboardDetailPageProps) {
  const { dashboardId } = use(params);
  return <DashboardDetailContent dashboardId={dashboardId} />;
}
