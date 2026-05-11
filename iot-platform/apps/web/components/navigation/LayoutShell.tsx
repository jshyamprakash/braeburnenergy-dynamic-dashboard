'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/store';
import { selectUser } from '@/lib/store/slices/authSlice';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';

/**
 * LayoutShell — conditional wrapper for root layout
 *
 * For /viewer route: renders children only (no sidebar/topbar for kiosk fullscreen)
 * For other routes: renders with TopBar + Sidebar
 */
const SUPERADMIN_ALLOWED = ['/admin-management', '/modules'];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppSelector(selectUser);
  const isViewerRoute = pathname.startsWith('/viewer');
  const isAuthRoute = pathname === '/login' || pathname === '/superadmin-login' || pathname === '/recovery';
  const isSharedDashboardsRoute = pathname === '/shared-dashboards';

  // Defer role-based layout decisions to client to avoid SSR/CSR hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!user) return;

    // SuperAdmin: restricted to admin-management + modules only
    if (user.role === 'SuperAdmin' && !isAuthRoute) {
      const allowed = SUPERADMIN_ALLOWED.some(p => pathname.startsWith(p));
      if (!allowed) { router.replace('/admin-management'); return; }
    }

    // Viewer: allow /shared-dashboards (dashboard picker + logout via TopBar); redirect all others to it
    if (user.role === 'Viewer' && !isViewerRoute && !isAuthRoute && !isSharedDashboardsRoute) {
      router.replace('/shared-dashboards');
      return;
    }

    // Any user with mustChangePassword: force to profile
    if (user.mustChangePassword && pathname !== '/profile' && !isAuthRoute) {
      router.replace('/profile');
    }
  }, [user, pathname, isViewerRoute, isAuthRoute, router]);

  // Viewer on /shared-dashboards owns the full viewport (own header + logout)
  const isViewerKiosk = mounted && (isViewerRoute || (isSharedDashboardsRoute && user?.role === 'Viewer'));
  if (isViewerKiosk || isAuthRoute) {
    return <>{children}</>;
  }

  // Standard layout with sidebar + topbar
  return (
    <>
      <TopBar />
      <div className="flex h-[calc(100vh-56px)]">
        <Sidebar />
        <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </>
  );
}
