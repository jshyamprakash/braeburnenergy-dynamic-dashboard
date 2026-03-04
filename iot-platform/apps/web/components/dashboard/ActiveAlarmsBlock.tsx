'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import type { DashboardBlock } from './DashboardBuilder';

interface AlarmInstance {
  alarmInstanceId: string;
  tagName: string;
  deviceId?: string;
  deviceName?: string;
  state: string;
  priority: string;
  activatedAt: string;
}

interface ActiveAlarmsBlockProps {
  block: DashboardBlock;
  isEditMode: boolean;
}

const STATE_STYLES: Record<string, string> = {
  ACTIVE_UNACKED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  ACTIVE_ACKED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  CLEARED_UNACKED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  CLEARED_ACKED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  INFO: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ActiveAlarmsBlock({ block, isEditMode }: ActiveAlarmsBlockProps) {
  const { title = 'Active Alarms', maxCount = 5, filterByState = ['ACTIVE_UNACKED', 'ACTIVE_ACKED'], filterByPriority = [] } = block.config;

  const [alarms, setAlarms] = useState<AlarmInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlarms = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: String(maxCount) });
      if (filterByState?.length) filterByState.forEach((s: string) => params.append('state', s));
      if (filterByPriority?.length) filterByPriority.forEach((p: string) => params.append('priority', p));

      const res = await apiClient.get<any>(`/alarms?${params.toString()}`);
      setAlarms(res.data?.data ?? res.data ?? []);
      setError(null);
    } catch {
      setError('Failed to load alarms');
    } finally {
      setLoading(false);
    }
  }, [maxCount, filterByState, filterByPriority]);

  useEffect(() => {
    if (isEditMode) return;
    fetchAlarms();
    const timer = setInterval(fetchAlarms, 30000);
    return () => clearInterval(timer);
  }, [fetchAlarms, isEditMode]);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        {!isEditMode && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {loading ? 'Loading…' : `${alarms.length} alarm${alarms.length !== 1 ? 's' : ''}`}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {isEditMode ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400 dark:text-gray-500 p-4">
            Active Alarms — configure filters in the settings panel
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-xs text-red-500 dark:text-red-400 p-4">{error}</div>
        ) : alarms.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400 dark:text-gray-500 p-4">
            No active alarms
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">Tag</th>
                <th className="text-left px-3 py-2 text-gray-500 dark:text-gray-400 font-medium hidden sm:table-cell">Device</th>
                <th className="text-left px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">State</th>
                <th className="text-left px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">Priority</th>
                <th className="text-right px-3 py-2 text-gray-500 dark:text-gray-400 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {alarms.map((alarm) => (
                <tr key={alarm.alarmInstanceId} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100 truncate max-w-[120px]">{alarm.tagName}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-400 truncate max-w-[100px] hidden sm:table-cell">{alarm.deviceName ?? alarm.deviceId ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${STATE_STYLES[alarm.state] ?? STATE_STYLES['CLEARED_ACKED']}`}>
                      {alarm.state.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_STYLES[alarm.priority] ?? PRIORITY_STYLES['INFO']}`}>
                      {alarm.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-400 dark:text-gray-500 whitespace-nowrap">{timeAgo(alarm.activatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
