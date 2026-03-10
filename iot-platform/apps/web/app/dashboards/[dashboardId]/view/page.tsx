'use client';

import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { KosmosShell } from '@/components/kosmos/KosmosShell';

/**
 * Kiosk / Projection view — fullscreen, no edit controls, protected route.
 * Opened by the "Project" button in the builder.
 */
interface ViewPageProps {
  params: Promise<{ dashboardId: string }>;
}

function ViewContent({ dashboardId }: { dashboardId: string }) {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId') || '';

  return <KosmosShell dashboardId={dashboardId} applicationId={applicationId} viewOnly />;
}

export default function KioskViewPage({ params }: ViewPageProps) {
  const { dashboardId } = use(params);
  return <ViewContent dashboardId={dashboardId} />;
}
