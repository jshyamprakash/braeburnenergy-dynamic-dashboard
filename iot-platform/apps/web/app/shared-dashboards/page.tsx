'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/lib/store';
import { selectUser } from '@/lib/store/slices/authSlice';
import { setKosmosFromDashboard } from '@/lib/store/slices/dashboardSlice';
import { useViewerDashboards } from '@/lib/hooks/useViewerDashboards';
import { useAuth } from '@/lib/hooks/useAuth';
import { KosmosShell } from '@/components/kosmos/KosmosShell';

/**
 * Shared Dashboards Page
 *
 * All roles: card-grid picker first (read-only). Click a card to open its KosmosShell.
 * Viewer: rendered outside LayoutShell (full viewport, owns its own header + logout).
 * Admin/Operator: rendered inside LayoutShell (TopBar + Sidebar visible as normal).
 *
 * Tab filtering: per-user assignment (ADR-045 v2) — each user sees only their assigned pages.
 */
export default function SharedDashboardsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const { logout } = useAuth();
  const { data: dashboards, isLoading, error } = useViewerDashboards();

  // null = show picker for everyone; number = show that dashboard's KosmosShell
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Prevents KosmosShell from mounting with stale Redux pages before dispatch runs
  const [dashboardReady, setDashboardReady] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/login?returnUrl=/shared-dashboards');
    }
  }, [user, router]);

  const activeDashboard = selectedIndex !== null ? dashboards?.[selectedIndex] : undefined;

  // Filter pages to this user's assigned tabs and dispatch to Redux
  useEffect(() => {
    if (!activeDashboard?.pages) {
      setDashboardReady(false);
      return;
    }
    const rawPages = activeDashboard.pages ?? [];
    const sharedWithUsers: any[] = activeDashboard.sharedWithUsers ?? [];

    // Per-user page filtering (ADR-045 v2)
    const myAssignment = sharedWithUsers.find(
      (a: any) => a.userId === user?.id || a.userId?.toString() === user?.id
    );
    const myPageIds: string[] = myAssignment?.pageIds ?? [];
    const pagesToShow =
      myPageIds.length > 0
        ? rawPages.filter((p: any) => myPageIds.includes(p.id ?? p.pageId))
        : rawPages;

    dispatch(
      setKosmosFromDashboard({
        pages: pagesToShow,
        sharedWithUsers,
      })
    );
    setDashboardReady(true);
  }, [activeDashboard, dispatch, user?.id]);

  const handleBack = () => {
    setSelectedIndex(null);
    setDashboardReady(false);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
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

  // ── Empty / error ─────────────────────────────────────────────────────────
  if (error || !dashboards || dashboards.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="mb-2 text-lg font-mono tracking-widest text-cyan-400">KOSMOS CORTEX™</div>
          <div className="text-sm">No dashboards have been shared with you yet.</div>
          <div className="mt-1 text-xs text-gray-600">Ask an administrator to share a dashboard.</div>
          {user?.role === 'Viewer' && (
            <button
              onClick={async () => { await logout(); router.replace('/login'); }}
              className="mt-4 font-mono text-xs tracking-wider text-gray-500 hover:text-red-400 transition-colors"
            >
              LOGOUT
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Picker (all roles, all views read-only) ───────────────────────────────
  if (selectedIndex === null) {
    const isViewer = user?.role === 'Viewer';

    return (
      <div className={`${isViewer ? 'min-h-screen' : 'min-h-[calc(100vh-56px)]'} bg-gray-50 dark:bg-gray-950`}>
        {/* Viewer-only header (Admin/Operator have LayoutShell's TopBar) */}
        {isViewer && (
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-6 py-3">
            <span className="font-mono text-xs tracking-widest text-cyan-600 dark:text-cyan-700">
              KOSMOS CORTEX™
            </span>
            <button
              onClick={async () => { await logout(); router.replace('/login'); }}
              className="font-mono text-xs tracking-wider text-gray-400 hover:text-red-400 transition-colors"
            >
              LOGOUT
            </button>
          </div>
        )}

        <div className="px-6 py-8">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-wide">
              Shared Dashboards
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select a dashboard to view — all views are read-only
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashboards.map((db, i) => (
              <button
                key={db.dashboardId}
                onClick={() => setSelectedIndex(i)}
                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900
                           p-5 text-left shadow-sm hover:border-cyan-400 hover:shadow-md
                           dark:hover:border-cyan-500 transition-all"
              >
                <div className="mb-1 font-mono text-xs tracking-widest text-cyan-600 dark:text-cyan-400">
                  ◈ DASHBOARD
                </div>
                <div className="text-base font-semibold text-gray-900 dark:text-white">
                  {db.name}
                </div>
                {(db as any).description && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {(db as any).description}
                  </div>
                )}
                <div className="mt-3 text-xs font-medium text-cyan-600 dark:text-cyan-400">
                  OPEN →
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard view ────────────────────────────────────────────────────────
  const isViewer = user?.role === 'Viewer';

  return (
    <div className={`flex ${isViewer ? 'h-screen' : 'h-[calc(100vh-56px)]'} flex-col`}>
      {/* Back bar + logout (Viewer) */}
      {isViewer && (
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 font-mono text-xs tracking-wider text-gray-500 hover:text-cyan-500 transition-colors"
          >
            ← DASHBOARDS
          </button>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <span className="font-mono text-xs tracking-widest text-gray-700 dark:text-gray-300">
            {activeDashboard?.name}
          </span>
          <div className="flex-1" />
          <button
            onClick={async () => { await logout(); router.replace('/login'); }}
            className="font-mono text-xs tracking-wider text-gray-400 hover:text-red-400 transition-colors"
          >
            LOGOUT
          </button>
        </div>
      )}

      {/* Back bar (Admin/Operator) */}
      {!isViewer && (
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 font-mono text-xs tracking-wider text-gray-500 hover:text-cyan-500 transition-colors"
          >
            ← DASHBOARDS
          </button>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <span className="font-mono text-xs tracking-widest text-gray-700 dark:text-gray-300">
            {activeDashboard?.name}
          </span>
        </div>
      )}

      {/* Dashboard canvas — always read-only */}
      <div className="flex-1 overflow-hidden">
        {activeDashboard && dashboardReady && (
          <KosmosShell
            key={activeDashboard.dashboardId}
            dashboardId={activeDashboard.dashboardId}
            applicationId={activeDashboard.applicationId}
            readOnly
            skipInit
          />
        )}
      </div>
    </div>
  );
}
