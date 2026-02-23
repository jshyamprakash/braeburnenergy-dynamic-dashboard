'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Home,
  Smartphone,
  Workflow,
  Bell,
  Settings,
  ClipboardList,
  Grid,
  Edit,
  Eye,
  BookOpen,
  Archive,
  Users,
  Wifi,
  LayoutGrid,
} from 'lucide-react';

const menuItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/applications', label: 'Applications', icon: LayoutGrid },
  { href: '/devices', label: 'Devices', icon: Smartphone },
  { href: '/workflows', label: 'Workflows', icon: Workflow },
  { href: '/alarms', label: 'Alarms', icon: Bell },
  { href: '/alarm-rules', label: 'Rules', icon: Settings },
  { href: '/audit-logs', label: 'Audit Logs', icon: ClipboardList },
  { href: '/dashboards', label: 'Dashboards', icon: Grid },
  { href: '/dashboard-demo', label: 'Demo', icon: Eye },
  { href: '/guide', label: 'Guide', icon: BookOpen },
  { href: '/retention-policies', label: 'Retention', icon: Archive },
  { href: '/organizations', label: 'Organizations', icon: Users },
  { href: '/websocket-test', label: 'WebSocket', icon: Wifi },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    setIsMounted(true);
    const savedState = localStorage.getItem('sidebar-expanded');
    if (savedState !== null) {
      setIsExpanded(JSON.parse(savedState));
    }
  }, []);

  // Persist collapsed state to localStorage
  const toggleSidebar = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem('sidebar-expanded', JSON.stringify(newState));
  };

  if (!isMounted) return null;

  return (
    <div
      className={`${
        isExpanded ? 'w-64' : 'w-20'
      } bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 sticky left-0 top-0 h-screen overflow-y-auto`}
    >
      {/* Sidebar Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        {isExpanded && (
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">IoT</h2>
        )}
        <button
          onClick={toggleSidebar}
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

      {/* Navigation Items */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-l-2 border-l-blue-500'
                  : 'text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border-l-2 border-l-transparent'
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
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {isExpanded && (
          <p className="text-xs text-gray-500 dark:text-gray-500">POC v1.0</p>
        )}
      </div>
    </div>
  );
}
