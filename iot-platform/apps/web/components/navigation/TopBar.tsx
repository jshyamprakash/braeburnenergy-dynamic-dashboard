'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronRight, Building2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationDropdown } from './NotificationDropdown';
import { useAuth } from '@/lib/hooks/useAuth';
import { useNotifications, useNotificationSocket } from '@/lib/hooks/useNotifications';
import { useOrganization } from '@/lib/hooks/useOrganizations';
import { useApplication } from '@/lib/hooks/useApplications';

// ── Breadcrumb segment type ───────────────────────────────────────────────
interface BreadcrumbSegment {
  label: string;
  href?: string;
}

// ── Build breadcrumb segments from pathname ───────────────────────────────
function useBreadcrumbs(): BreadcrumbSegment[] {
  const pathname = usePathname();

  const appMatch = pathname.match(/^\/applications\/([^/]+)/);
  const appId = appMatch?.[1] ?? null;

  const { data: appData } = useApplication(appId ?? '');
  const appName = appData?.name ?? null;

  const segments: BreadcrumbSegment[] = [{ label: 'Platform', href: '/applications' }];

  if (!appId) return segments;

  const parts = pathname.replace(`/applications/${appId}`, '').split('/').filter(Boolean);

  segments.push({ label: appName ?? 'Application', href: `/applications/${appId}` });

  if (parts.length > 0) {
    const sectionLabel = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    segments.push({ label: sectionLabel });
  }

  return segments;
}

// ── Role badge ────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const colorMap: Record<string, string> = {
    SuperAdmin: 'text-rose-600 dark:text-rose-400',
    Admin:      'text-violet-600 dark:text-violet-400',
    Operator:   'text-sky-600 dark:text-sky-400',
    Viewer:     'text-slate-500 dark:text-slate-400',
  };
  return (
    <span className={`text-xs font-medium mt-0.5 ${colorMap[role] ?? 'text-slate-500'}`}>
      {role}
    </span>
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────
export function TopBar() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { data: notifData } = useNotifications({ unreadOnly: true, enabled: isAuthenticated });
  const unreadCount = notifData?.unreadCount ?? 0;
  useNotificationSocket();

  const breadcrumbs = useBreadcrumbs();

  // Org name badge for Admin users
  const isAdmin = user?.role === 'Admin';
  const { data: orgData } = useOrganization(isAdmin && user?.organizationId ? user.organizationId : undefined);

  useEffect(() => { setMounted(true); }, []);

  return (
    <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between px-4 sm:px-5 sticky top-0 z-40">

      {/* Left: Brand + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Logo dot */}
        <div className="h-6 w-6 rounded-md bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <div className="h-2.5 w-2.5 rounded-sm bg-white/90" />
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm min-w-0" aria-label="Breadcrumb">
          {breadcrumbs.map((seg, i) => (
            <span key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
              {seg.href && i < breadcrumbs.length - 1 ? (
                <Link
                  href={seg.href}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors truncate"
                >
                  {seg.label}
                </Link>
              ) : (
                <span className={`truncate ${i === breadcrumbs.length - 1 ? 'font-semibold text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  {seg.label}
                </span>
              )}
            </span>
          ))}
        </nav>

        {/* Org name badge — visible for Admin users only */}
        {mounted && isAdmin && orgData?.data?.name && (
          <span className="hidden md:flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full flex-shrink-0">
            <Building2 className="w-3 h-3" />
            {orgData.data.name}
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <ThemeToggle />

        {/* Notification Bell */}
        {mounted && isAuthenticated && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationDropdown onClose={() => setShowNotifications(false)} />
            )}
          </div>
        )}

        {/* User Menu */}
        {mounted && isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline font-medium text-sm">{user.username}</span>
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-[var(--shadow-dropdown)] bg-white dark:bg-slate-800 ring-1 ring-slate-900/5 dark:ring-slate-700/60 z-20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user.username}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    <RoleBadge role={user.role} />
                  </div>
                  <div className="py-1">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Your Profile
                    </Link>
                    <Link
                      href="/auth-test"
                      className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Auth Test
                    </Link>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-700 py-1">
                    <button
                      onClick={async () => {
                        setShowUserMenu(false);
                        await logout();
                        router.push('/login');
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
