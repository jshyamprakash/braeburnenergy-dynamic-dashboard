'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/store';
import { selectUser } from '@/lib/store/slices/authSlice';
import { setKosmosFromDashboard } from '@/lib/store/slices/dashboardSlice';
import { useViewerDashboards } from '@/lib/hooks/useViewerDashboards';
import { KosmosShell } from '@/components/kosmos/KosmosShell';

/**
 * Viewer Page — Viewer role kiosk for shared dashboards (ADR-045)
 *
 * Displays dashboards shared with the current user in full-screen Kosmos viewer.
 * Tab strip lets users switch between dashboards.
 * readOnly mode hides edit/share buttons.
 */
export default function ViewerPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const { data: dashboards, isLoading, error } = useViewerDashboards();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    // Redirect non-viewers away
    if (user && user.role !== 'Viewer') {
      router.replace('/');
    }
    // Redirect unauthenticated to login
    if (!user) {
      router.replace('/login?returnUrl=/viewer');
    }
  }, [user, router]);

  const activeDashboard = dashboards?.[activeIndex];

  // Populate Kosmos pages from already-fetched dashboard data (skip second API call)
  useEffect(() => {
    if (!activeDashboard?.pages) return;
    dispatch(setKosmosFromDashboard({
      pages: activeDashboard.pages,
      sharedWithUsers: activeDashboard.sharedWithUsers ?? [],
    }));
  }, [activeDashboard, dispatch]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-gray-400">
        <div className="text-center">
          <div className="mb-4 text-2xl font-mono tracking-widest text-cyan-400">KOSMOS™</div>
          <div className="text-sm">Loading dashboards...</div>
        </div>
      </div>
    );
  }

  if (error || !dashboards || dashboards.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-gray-400">
        <div className="text-center">
          <div className="mb-4 text-2xl font-mono tracking-widest text-cyan-400">KOSMOS™</div>
          <div className="text-sm">No dashboards have been shared with you yet.</div>
          <div className="mt-2 text-xs text-gray-600">Contact your administrator.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-black">
      {/* Tab strip for multiple dashboards */}
      {dashboards.length > 1 && (
        <div className="flex shrink-0 border-b border-gray-800 bg-gray-950 px-4">
          {dashboards.map((db, i) => (
            <button
              key={db.dashboardId}
              onClick={() => setActiveIndex(i)}
              className={`px-4 py-2 text-xs font-mono tracking-wider transition-colors ${
                i === activeIndex
                  ? 'border-b-2 border-cyan-400 text-cyan-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {db.name}
            </button>
          ))}
        </div>
      )}

      {/* Dashboard canvas */}
      <div className="flex-1 overflow-hidden">
        <KosmosShell
          key={activeDashboard.dashboardId}
          dashboardId={activeDashboard.dashboardId}
          applicationId={activeDashboard.applicationId}
          readOnly
          skipInit
        />
      </div>
    </div>
  );
}
