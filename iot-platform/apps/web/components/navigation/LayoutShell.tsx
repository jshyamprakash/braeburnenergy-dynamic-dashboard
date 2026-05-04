'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    if (!user) return;

    // SuperAdmin: restricted to admin-management + modules only
    if (user.role === 'SuperAdmin' && !isAuthRoute) {
      const allowed = SUPERADMIN_ALLOWED.some(p => pathname.startsWith(p));
      if (!allowed) { router.replace('/admin-management'); return; }
    }

    // Viewer: redirect to kiosk
    if (user.role === 'Viewer' && !isViewerRoute && !isAuthRoute) {
      router.replace('/viewer');
      return;
    }

    // Any user with mustChangePassword: force to profile
    if (user.mustChangePassword && pathname !== '/profile' && !isAuthRoute) {
      router.replace('/profile');
    }
  }, [user, pathname, isViewerRoute, isAuthRoute, router]);

  if (isViewerRoute || isAuthRoute) {
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
