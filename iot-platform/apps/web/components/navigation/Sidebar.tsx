'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, Bell, Settings, ClipboardList, BookOpen,
  Archive, Users, Wifi, LayoutGrid, ChevronRight, Cpu,
  GitBranch, LayoutDashboard, Radio, Network, User, Zap,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { toggleSidebar, selectSidebarOpen } from '@/lib/store/slices/uiSlice';
import { apiClient } from '@/lib/api-client';

const mainNavItems = [
  { href: '/alarms', label: 'Alarms', icon: Bell },
  { href: '/alarm-rules', label: 'Rules', icon: Settings },
  { href: '/audit-logs', label: 'Audit Logs', icon: ClipboardList },
  { href: '/guide', label: 'Guide', icon: BookOpen },
  { href: '/retention-policies', label: 'Retention', icon: Archive },
  { href: '/users', label: 'Users', icon: User },
  { href: '/organizations', label: 'Organizations', icon: Users },
  { href: '/websocket-test', label: 'WebSocket', icon: Wifi },
];

const entityItems = [
  { key: 'devices',    label: 'Devices',       icon: Cpu },
  { key: 'workflows',  label: 'Workflows',      icon: GitBranch },
  { key: 'dashboards', label: 'Dashboards',     icon: LayoutDashboard },
  { key: 'modbus',     label: 'Modbus Gateway', icon: Radio },
  { key: 'opcua',      label: 'OPC-UA Gateway', icon: Network },
  { key: 'mqtt',       label: 'MQTT Gateway',   icon: Zap },
];

interface AppItem {
  applicationId: string;
  name: string;
  isActive: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const isExpanded = useAppSelector(selectSidebarOpen);
  const [isMounted, setIsMounted] = useState(false);

  // Applications accordion in main column
  const [appsOpen, setAppsOpen] = useState(false);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  // Selected app → opens entity column beside main column
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  // Auto-open based on current URL
  useEffect(() => {
    const match = pathname.match(/^\/applications\/([^/]+)/);
    if (!match) return;
    const appId = match[1];
    setAppsOpen(true);
    apiClient.get<any>(`/applications/${appId}`)
      .then(res => { if (res.data?.applicationId) setSelectedApp(res.data); })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch app list when accordion opens
  useEffect(() => {
    if (!appsOpen || apps.length > 0) return;
    setAppsLoading(true);
    apiClient.get<any>('/applications?limit=50&offset=0')
      .then(res => setApps(res.data || []))
      .catch(() => setApps([]))
      .finally(() => setAppsLoading(false));
  }, [appsOpen, apps.length]);

  if (!isMounted) return null;

  // Detect active entity from URL for highlight
  const entityMatch = pathname.match(/^\/applications\/[^/]+\/([^/]+)/);
  const currentEntity = entityMatch?.[1];

  const isAppsActive = pathname.startsWith('/applications');

  return (
    <div className="flex flex-row h-full flex-shrink-0">

      {/* ── Main column ── */}
      <div
        className={`${
          isExpanded ? 'w-64' : 'w-20'
        } bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          {isExpanded && (
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">IoT</h2>
          )}
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-0.5">

          {/* Applications toggle */}
          <button
            onClick={() => {
              if (!isExpanded) return;
              setAppsOpen(prev => !prev);
              if (appsOpen) setSelectedApp(null);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors border-l-2 ${
              isAppsActive || appsOpen
                ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-l-blue-500'
                : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-transparent'
            }`}
            title={!isExpanded ? 'Applications' : undefined}
          >
            <LayoutGrid className="w-5 h-5 flex-shrink-0" />
            {isExpanded && (
              <>
                <span className="text-sm font-medium flex-1 text-left">Applications</span>
                <ChevronRight
                  className={`w-4 h-4 transition-transform duration-200 ${appsOpen ? 'rotate-90' : ''}`}
                />
              </>
            )}
          </button>

          {/* App list — inline under Applications when expanded */}
          {isExpanded && appsOpen && (
            <div className="mb-1">
              {appsLoading ? (
                <p className="pl-8 py-1.5 text-xs text-gray-400 dark:text-gray-500">Loading…</p>
              ) : apps.length === 0 ? (
                <div className="pl-8 py-1.5 text-xs text-gray-400 dark:text-gray-500 space-y-1">
                  <p>No applications yet</p>
                  <Link href="/applications" className="text-blue-500 hover:underline">Create one</Link>
                </div>
              ) : (
                apps.map((app) => (
                  <button
                    key={app.applicationId}
                    onClick={() =>
                      setSelectedApp(prev =>
                        prev?.applicationId === app.applicationId ? null : app
                      )
                    }
                    className={`w-full flex items-center gap-2 pl-8 pr-3 py-1.5 rounded-md transition-colors text-sm ${
                      selectedApp?.applicationId === app.applicationId
                        ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="flex-1 truncate text-left">{app.name}</span>
                    {selectedApp?.applicationId === app.applicationId && (
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}

              <Link
                href="/applications"
                className="flex pl-8 pr-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Manage Applications
              </Link>
            </div>
          )}

          {/* Other nav items */}
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors border-l-2 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-l-blue-500'
                    : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-transparent'
                }`}
                title={!isExpanded ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {isExpanded && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          {isExpanded && (
            <p className="text-xs text-gray-500 dark:text-gray-500">POC v1.0</p>
          )}
        </div>
      </div>

      {/* ── Entity submenu column (appears when an app is selected) ── */}
      {selectedApp && (
        <div className="w-48 bg-gray-50 dark:bg-gray-800/60 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
          {/* Column header */}
          <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <p
              className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide truncate flex-1"
              title={selectedApp.name}
            >
              {selectedApp.name}
            </p>
            <button
              onClick={() => setSelectedApp(null)}
              className="ml-2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            </button>
          </div>

          {/* Entity links */}
          <div className="flex-1 overflow-y-auto py-1">
            {entityItems.map((entity) => {
              const Icon = entity.icon;
              const href = `/applications/${selectedApp.applicationId}/${entity.key}`;
              const isActive =
                pathname.startsWith(`/applications/${selectedApp.applicationId}`) &&
                currentEntity === entity.key;

              return (
                <Link
                  key={entity.key}
                  href={href}
                  className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-l-2 border-l-blue-500 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{entity.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
