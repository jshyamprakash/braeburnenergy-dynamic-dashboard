'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import {
  loadAlarms,
  loadAlarmStatistics,
  acknowledgeAlarm,
  shelveAlarm,
  setFilterState,
  setFilterPriority,
} from '@/lib/store/slices/alarmSlice';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AlertCircle, Bell, Clock } from 'lucide-react';

const stateColors: Record<string, { bg: string; text: string; badge: string }> = {
  ACTIVE_UNACKED: { bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-400', badge: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' },
  ACTIVE_ACKED: { bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-700 dark:text-orange-400', badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200' },
  CLEARED_UNACKED: { bg: 'bg-yellow-50 dark:bg-yellow-950/20', text: 'text-yellow-700 dark:text-yellow-400', badge: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200' },
  CLEARED_ACKED: { bg: 'bg-green-50 dark:bg-green-950/20', text: 'text-green-700 dark:text-green-400', badge: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' },
  SHELVED: { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-400', badge: 'bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200' },
};

const priorityColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
  HIGH: 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200',
  MEDIUM: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
  LOW: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
  INFO: 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200',
};

function AlarmContent() {
  const dispatch = useAppDispatch();
  const { alarms, statistics, statisticsLoading, alarmsLoading, filterState, filterPriority, actionLoading } = useAppSelector(
    (state) => state.alarm
  );
  const { user } = useAppSelector((state) => state.auth);
  const [ackComment, setAckComment] = useState('');
  const [ackingAlarmId, setAckingAlarmId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(loadAlarmStatistics() as any);
    dispatch(loadAlarms({ state: filterState || undefined, priority: filterPriority || undefined }) as any);
  }, [dispatch, filterState, filterPriority]);

  const handleAcknowledge = async (alarmId: string) => {
    setAckingAlarmId(alarmId);
  };

  const handleAckSubmit = async (alarmId: string) => {
    await dispatch(acknowledgeAlarm({ alarmId, comment: ackComment }) as any);
    setAckComment('');
    setAckingAlarmId(null);
  };

  const handleShelve = async (alarmId: string) => {
    await dispatch(shelveAlarm({ alarmId, reason: 'Shelved by operator' }) as any);
  };

  const statCards = [
    { label: 'Total Alarms', value: statistics?.total || 0, icon: Bell, color: 'blue' },
    { label: 'Unacknowledged', value: statistics?.unacknowledged || 0, icon: AlertCircle, color: 'red' },
    { label: 'Critical', value: statistics?.byCritical || 0, icon: AlertCircle, color: 'red' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Alarms</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">ISA-18.2 compliant alarm monitoring</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{card.label}</p>
                  <p className={`text-3xl font-bold ${card.color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {card.value}
                  </p>
                </div>
                <card.icon className={`w-8 h-8 ${card.color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
            <select
              value={filterState || ''}
              onChange={(e) => dispatch(setFilterState(e.target.value || null))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">All States</option>
              <option value="ACTIVE_UNACKED">Unacknowledged</option>
              <option value="ACTIVE_ACKED">Acknowledged</option>
              <option value="CLEARED_UNACKED">Cleared Unacked</option>
              <option value="CLEARED_ACKED">Cleared Acked</option>
              <option value="SHELVED">Shelved</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
            <select
              value={filterPriority || ''}
              onChange={(e) => dispatch(setFilterPriority(e.target.value || null))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="INFO">Info</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {alarmsLoading ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">Loading alarms...</p>
            </div>
          ) : alarms.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">No alarms found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Tag Name</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Device</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">State</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Priority</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Triggered</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {alarms.map((alarm) => (
                  <tr key={alarm._id} className={`border-b border-gray-200 dark:border-gray-700 ${stateColors[alarm.state].bg}`}>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{alarm.tagName}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{alarm.deviceId}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${stateColors[alarm.state].badge}`}>
                        {alarm.state.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[alarm.priority]}`}>
                        {alarm.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-xs">
                      {new Date(alarm.triggerTimestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 space-x-2 flex">
                      {alarm.state === 'ACTIVE_UNACKED' && user?.role !== 'Viewer' && (
                        <>
                          <button
                            onClick={() => handleAcknowledge(alarm._id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                          >
                            Ack
                          </button>
                          {user?.role === 'Admin' && (
                            <button
                              onClick={() => handleShelve(alarm._id)}
                              disabled={actionLoading === alarm._id}
                              className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                              Shelve
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Ack Modal */}
        {ackingAlarmId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Acknowledge Alarm</h3>
              <textarea
                value={ackComment}
                onChange={(e) => setAckComment(e.target.value)}
                placeholder="Optional comment..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm mb-4"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setAckingAlarmId(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAckSubmit(ackingAlarmId)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AlarmsPage() {
  return (
    <ProtectedRoute>
      <AlarmContent />
    </ProtectedRoute>
  );
}
