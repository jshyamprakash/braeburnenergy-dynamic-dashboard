'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/store';
import { selectUser } from '@/lib/store/slices/authSlice';
import { setKosmosFromDashboard } from '@/lib/store/slices/dashboardSlice';
import { useViewerDashboards } from '@/lib/hooks/useViewerDashboards';
import { KosmosShell } from '@/components/kosmos/KosmosShell';

/**
 * Shared Dashboards Page — accessible to all authenticated roles.
 *
 * Shows dashboards shared with the current user (same GET /dashboards/my endpoint).
 * Admin/SuperAdmin/creator get edit access; all others see read-only Kosmos view.
 */
export default function SharedDashboardsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const { data: dashboards, isLoading, error } = useViewerDashboards();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!user) {
      router.replace('/login?returnUrl=/shared-dashboards');
    }
  }, [user, router]);

  const activeDashboard = dashboards?.[activeIndex];

  const isEditable = user?.role === 'Admin' || user?.role === 'SuperAdmin';

  useEffect(() => {
    if (!activeDashboard?.pages) return;
    const rawPages = activeDashboard.pages ?? [];
    const sharedPageIds = activeDashboard.sharedPageIds ?? [];
    const pagesToShow =
      sharedPageIds.length > 0
        ? rawPages.filter((p: any) => sharedPageIds.includes(p.id))
        : rawPages;
    dispatch(
      setKosmosFromDashboard({
        pages: pagesToShow,
        sharedWithUsers: activeDashboard.sharedWithUsers ?? [],
        sharedPageIds,
      })
    );
  }, [activeDashboard, dispatch]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="mb-2 text-lg font-mono tracking-widest text-cyan-400">KOSMOS CORTEX™</div>
          <div className="text-sm">Loading shared dashboards...</div>
        </div>
      </div>
    );
  }

  if (error || !dashboards || dashboards.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="mb-2 text-lg font-mono tracking-widest text-cyan-400">KOSMOS CORTEX™</div>
          <div className="text-sm">No dashboards have been shared with you yet.</div>
          <div className="mt-1 text-xs text-gray-600">Ask an administrator to share a dashboard.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col">
      {/* Dashboard tab strip */}
      {dashboards.length > 1 && (
        <div className="flex shrink-0 border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950">
          {dashboards.map((db, i) => (
            <button
              key={db.dashboardId}
              onClick={() => setActiveIndex(i)}
              className={`px-4 py-2 text-xs font-mono tracking-wider transition-colors ${
                i === activeIndex
                  ? 'border-b-2 border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {db.name}
            </button>
          ))}
        </div>
      )}

      {/* Dashboard canvas */}
      <div className="flex-1 overflow-hidden">
        {activeDashboard && (
          <KosmosShell
            key={activeDashboard.dashboardId}
            dashboardId={activeDashboard.dashboardId}
            applicationId={activeDashboard.applicationId}
            readOnly={!isEditable}
            skipInit
          />
        )}
      </div>
    </div>
  );
}
