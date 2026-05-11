'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, Bell, Settings, ClipboardList, BookOpen,
  Archive, Users, Wifi, LayoutGrid, ChevronLeft, Cpu,
  GitBranch, LayoutDashboard, Radio, Network, User, Zap, Shield, ShieldCheck, Activity,
  BarChart2, Building2, BellDot, Share2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { toggleSidebar, selectSidebarOpen } from '@/lib/store/slices/uiSlice';
import type { RootState } from '@/lib/store';
import { useApplication } from '@/lib/hooks/useApplications';

// ── Section label helper ──────────────────────────────────────────────────
function SectionLabel({ label, isExpanded }: { label: string; isExpanded: boolean }) {
  if (!isExpanded) return <div className="h-px bg-slate-200 dark:bg-slate-700/60 mx-2 my-2" />;
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 select-none">
      {label}
    </p>
  );
}

// ── Nav item helper ───────────────────────────────────────────────────────
function NavItem({
  href,
  label,
  icon: Icon,
  isExpanded,
  isActive,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isExpanded: boolean;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 border-l-[3px] ${
        isActive
          ? 'border-l-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium'
          : 'border-l-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
      }`}
      title={!isExpanded ? label : undefined}
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
      {isExpanded && <span className="text-sm">{label}</span>}
    </Link>
  );
}

// ── Application interface ─────────────────────────────────────────────────
interface AppItem {
  applicationId: string;
  name: string;
  isActive: boolean;
}

// ── Platform nav (State 1 — not inside an application) ────────────────────
const platformNavSections = [
  {
    label: 'Applications',
    items: [
      { href: '/applications', label: 'Applications', icon: LayoutGrid },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { href: '/alarms', label: 'Alarms', icon: Bell },
      { href: '/alarm-rules', label: 'Alarm Rules', icon: Settings },
      { href: '/alarm-management', label: 'Alarm Mgmt', icon: BellDot, adminOnly: true },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/audit-logs', label: 'Audit Logs', icon: ClipboardList },
      { href: '/retention-policies', label: 'Retention', icon: Archive },
      { href: '/users', label: 'Users', icon: User },
    ],
  },
  {
    label: 'Dashboards',
    items: [
      { href: '/shared-dashboards', label: 'Shared with me', icon: Share2 },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/guide', label: 'Guide', icon: BookOpen },
      { href: '/websocket-test', label: 'WebSocket', icon: Wifi },
    ],
  },
];

// ── Application-context nav (State 2 — inside /applications/[id]/*) ───────
const appNavItems = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'devices', label: 'Devices', icon: Cpu },
  { key: 'workflows', label: 'Workflows', icon: GitBranch },
  { key: 'dashboards', label: 'Dashboards', icon: BarChart2 },
];

const gatewayNavItems = [
  { key: 'modbus', label: 'Modbus', icon: Radio },
  { key: 'opcua', label: 'OPC-UA', icon: Network },
  { key: 'mqtt', label: 'MQTT', icon: Zap },
  { key: 'bacnet', label: 'BACnet', icon: LayoutGrid },
  { key: 'enip', label: 'EtherNet/IP', icon: Shield },
];


// ── Main Sidebar component ────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const isExpanded = useAppSelector(selectSidebarOpen);
  const user = useAppSelector((state: RootState) => state.auth.user);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // Extract applicationId from URL if inside app context
  const appContextMatch = pathname.match(/^\/applications\/([^/]+)/);
  const currentAppId = appContextMatch?.[1] ?? null;
  const isInAppContext = !!currentAppId && pathname.split('/').length > 3;

  const { data: appData } = useApplication(currentAppId ?? '');
  const appName = appData?.name ?? currentAppId;

  // Detect current entity key in app context (e.g. 'devices', 'workflows')
  const entityMatch = pathname.match(/^\/applications\/[^/]+\/([^/]+)/);
  const currentEntity = entityMatch?.[1] ?? 'overview';

  if (!isMounted) return null;

  // ── SuperAdmin sidebar ─────────────────────────────────────────────────
  if (user?.role === 'SuperAdmin') {
    const saItems = [
      { href: '/organizations', label: 'Organizations', icon: Building2 },
      { href: '/applications', label: 'Applications', icon: LayoutGrid },
      { href: '/admin-management', label: 'Admin Mgmt', icon: ShieldCheck },
      { href: '/modules', label: 'Modules', icon: Shield },
      { href: '/system-health', label: 'System Health', icon: Activity },
    ];
    return (
      <div className="flex flex-row h-full flex-shrink-0">
        <div className={`${isExpanded ? 'w-56' : 'w-[60px]'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700/60 flex flex-col transition-all duration-300 flex-shrink-0`}>
          <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 flex-shrink-0">
            {isExpanded && <span className="text-sm font-semibold text-slate-900 dark:text-white">SuperAdmin</span>}
            <button onClick={() => dispatch(toggleSidebar())} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
              {isExpanded ? <X className="w-4 h-4 text-slate-500" /> : <Menu className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
          <nav className="flex-1 px-2 py-3 space-y-0.5">
            {saItems.map(({ href, label, icon: Icon }) => (
              <NavItem key={href} href={href} label={label} icon={Icon} isExpanded={isExpanded} isActive={pathname.startsWith(href)} />
            ))}
          </nav>
        </div>
      </div>
    );
  }

  // ── Sidebar width ──────────────────────────────────────────────────────
  const sidebarWidth = isExpanded ? 'w-56' : 'w-[60px]';

  return (
    <div className="flex flex-row h-full flex-shrink-0">
      <div className={`${sidebarWidth} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700/60 flex flex-col transition-all duration-300 flex-shrink-0`}>

        {/* Header */}
        <div className="px-3 py-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-700/60 flex-shrink-0 gap-2">
          {isExpanded && (
            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">IoT Platform</span>
          )}
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0 ml-auto"
            aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded
              ? <X className="w-4 h-4 text-slate-500" />
              : <Menu className="w-4 h-4 text-slate-500" />
            }
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">

          {/* ── State 2: Application context ── */}
          {isInAppContext ? (
            <>
              {/* Back to Applications */}
              <Link
                href="/applications"
                className="flex items-center gap-2 px-3 py-2 mb-1 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-lg transition-colors duration-150"
                title={!isExpanded ? 'Back to Applications' : undefined}
              >
                <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                {isExpanded && <span>All Applications</span>}
              </Link>

              {/* App name header */}
              {isExpanded && appName && (
                <div className="px-3 py-2 mb-1 border-b border-slate-200 dark:border-slate-700/60">
                  <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-medium mb-0.5">Application</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{appName}</p>
                </div>
              )}
              {!isExpanded && <div className="h-px bg-slate-200 dark:bg-slate-700/60 mx-2 mb-2" />}

              {/* App-specific items */}
              <div className="space-y-0.5">
                {/* Overview link */}
                <NavItem
                  href={`/applications/${currentAppId}`}
                  label="Overview"
                  icon={LayoutDashboard}
                  isExpanded={isExpanded}
                  isActive={currentEntity === 'overview' || pathname === `/applications/${currentAppId}`}
                />
                {appNavItems.filter(i => i.key !== 'overview').map(item => (
                  <NavItem
                    key={item.key}
                    href={`/applications/${currentAppId}/${item.key}`}
                    label={item.label}
                    icon={item.icon}
                    isExpanded={isExpanded}
                    isActive={currentEntity === item.key}
                  />
                ))}
              </div>

              {/* Gateways section */}
              <SectionLabel label="Gateways" isExpanded={isExpanded} />
              <div className="space-y-0.5">
                {gatewayNavItems.map(item => (
                  <NavItem
                    key={item.key}
                    href={`/applications/${currentAppId}/${item.key}`}
                    label={item.label}
                    icon={item.icon}
                    isExpanded={isExpanded}
                    isActive={currentEntity === item.key}
                  />
                ))}
              </div>

            </>
          ) : (
            /* ── State 1: Platform context ── */
            <>
              {platformNavSections.map(section => {
                const visibleItems = section.items.filter(item =>
                  !('adminOnly' in item && item.adminOnly) ||
                  user?.role === 'Admin' ||
                  user?.role === 'SuperAdmin'
                );
                if (visibleItems.length === 0) return null;
                return (
                  <div key={section.label}>
                    <SectionLabel label={section.label} isExpanded={isExpanded} />
                    <div className="space-y-0.5">
                      {visibleItems.map(item => (
                        <NavItem
                          key={item.href}
                          href={item.href}
                          label={item.label}
                          icon={item.icon}
                          isExpanded={isExpanded}
                          isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'))}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-slate-200 dark:border-slate-700/60 flex-shrink-0">
          {isExpanded && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">POC v1.0</p>
          )}
        </div>
      </div>
    </div>
  );
}
