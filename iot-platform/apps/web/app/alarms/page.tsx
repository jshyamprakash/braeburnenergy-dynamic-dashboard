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
import { AlertCircle, Bell, CheckCircle, Clock, ShieldOff } from 'lucide-react';

// ── Priority dot colors ──────────────────────────────────────────────────────
const priorityDot: Record<string, string> = {
  CRITICAL: 'bg-rose-500',
  HIGH:     'bg-orange-500',
  MEDIUM:   'bg-yellow-500',
  LOW:      'bg-indigo-400',
  INFO:     'bg-slate-400',
};
const priorityText: Record<string, string> = {
  CRITICAL: 'text-rose-700 dark:text-rose-300',
  HIGH:     'text-orange-700 dark:text-orange-300',
  MEDIUM:   'text-yellow-700 dark:text-yellow-300',
  LOW:      'text-indigo-600 dark:text-indigo-300',
  INFO:     'text-slate-500 dark:text-slate-400',
};

// ── State styles ─────────────────────────────────────────────────────────────
const stateStyle: Record<string, { badge: string; rowAccent: string }> = {
  ACTIVE_UNACKED:  { badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',    rowAccent: 'border-l-[3px] border-l-rose-500' },
  ACTIVE_ACKED:    { badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', rowAccent: 'border-l-[3px] border-l-orange-400' },
  CLEARED_UNACKED: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', rowAccent: 'border-l-[3px] border-l-amber-400' },
  CLEARED_ACKED:   { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', rowAccent: 'border-l-[3px] border-l-emerald-400' },
  SHELVED:         { badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',   rowAccent: 'border-l-[3px] border-l-slate-300 dark:border-l-slate-600' },
};

// ── Stats ribbon config ───────────────────────────────────────────────────────
const stateRibbonConfig = [
  { key: 'ACTIVE_UNACKED',  label: 'Unacknowledged', statKey: 'activeUnacked',  cardBg: 'bg-rose-50 dark:bg-rose-950/30',    num: 'text-rose-600 dark:text-rose-400',    border: 'border-rose-200 dark:border-rose-800/60' },
  { key: 'ACTIVE_ACKED',   label: 'Acknowledged',   statKey: 'activeAcked',    cardBg: 'bg-orange-50 dark:bg-orange-950/30', num: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800/60' },
  { key: 'CLEARED_UNACKED', label: 'Cleared Unacked',statKey: 'clearedUnacked', cardBg: 'bg-amber-50 dark:bg-amber-950/30',  num: 'text-amber-600 dark:text-amber-400',   border: 'border-amber-200 dark:border-amber-800/60' },
  { key: 'CLEARED_ACKED',  label: 'Cleared Acked',  statKey: 'clearedAcked',   cardBg: 'bg-emerald-50 dark:bg-emerald-950/30', num: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/60' },
  { key: 'SHELVED',        label: 'Shelved',        statKey: 'shelved',        cardBg: 'bg-slate-50 dark:bg-slate-800/50',  num: 'text-slate-600 dark:text-slate-400',   border: 'border-slate-200 dark:border-slate-700' },
];

// ── Filter pill config ────────────────────────────────────────────────────────
const filterPills = [
  { value: '',               label: 'All' },
  { value: 'ACTIVE_UNACKED', label: 'Unacked' },
  { value: 'ACTIVE_ACKED',   label: 'Acked' },
  { value: 'CLEARED_UNACKED',label: 'Clr Unacked' },
  { value: 'CLEARED_ACKED',  label: 'Clr Acked' },
  { value: 'SHELVED',        label: 'Shelved' },
];

const priorityPills = [
  { value: '',         label: 'All' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH',     label: 'High' },
  { value: 'MEDIUM',   label: 'Medium' },
  { value: 'LOW',      label: 'Low' },
  { value: 'INFO',     label: 'Info' },
];

function AlarmContent() {
  const dispatch = useAppDispatch();
  const { alarms, statistics, alarmsLoading, filterState, filterPriority, actionLoading } = useAppSelector(
    (state) => state.alarm
  );
  const { user } = useAppSelector((state) => state.auth);
  const [ackComment, setAckComment] = useState('');
  const [ackingAlarmId, setAckingAlarmId] = useState<string | null>(null);

  useEffect(() => {
    dispatch(loadAlarmStatistics() as any);
    dispatch(loadAlarms({ state: filterState || undefined, priority: filterPriority || undefined }) as any);
  }, [dispatch, filterState, filterPriority]);

  const handleAckSubmit = async (alarmId: string) => {
    await dispatch(acknowledgeAlarm({ alarmId, comment: ackComment }) as any);
    setAckComment('');
    setAckingAlarmId(null);
  };

  const handleShelve = async (alarmId: string) => {
    await dispatch(shelveAlarm({ alarmId, reason: 'Shelved by operator' }) as any);
  };

  const getStatCount = (key: string) => {
    if (!statistics) return 0;
    const s = statistics as any;
    return s[key] ?? 0;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Alarms</h1>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">ISA-18.2 compliant alarm monitoring</p>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {stateRibbonConfig.map(cfg => (
          <button
            key={cfg.key}
            onClick={() => dispatch(setFilterState(filterState === cfg.key ? null : cfg.key))}
            className={`rounded-xl border p-3 text-left transition-all duration-150 ${cfg.cardBg} ${cfg.border} ${filterState === cfg.key ? 'ring-2 ring-indigo-400 ring-offset-1' : 'hover:shadow-sm'}`}
          >
            <p className={`text-2xl font-bold tabular-nums ${cfg.num}`}>{getStatCount(cfg.statKey)}</p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{cfg.label}</p>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
        {/* State pills */}
        <div className="flex flex-wrap gap-1.5">
          {filterPills.map(p => (
            <button
              key={p.value}
              onClick={() => dispatch(setFilterState(p.value || null))}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                (filterState || '') === p.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 self-center mx-1" />
          {priorityPills.map(p => (
            <button
              key={p.value}
              onClick={() => dispatch(setFilterPriority(p.value || null))}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                (filterPriority || '') === p.value
                  ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {alarmsLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-500 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading alarms…</p>
          </div>
        ) : alarms.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No alarms found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Adjust your filters or check back later</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tag Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Device</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">State</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Triggered</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {alarms.map((alarm) => {
                const sty = stateStyle[alarm.state] ?? stateStyle.SHELVED;
                return (
                  <tr
                    key={alarm._id}
                    className={`${sty.rowAccent} hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${alarm.state === 'ACTIVE_UNACKED' ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{alarm.tagName}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs">{alarm.deviceId}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${sty.badge}`}>
                        {alarm.state.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${priorityText[alarm.priority] ?? 'text-slate-500'}`}>
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${priorityDot[alarm.priority] ?? 'bg-slate-400'}`} />
                        {alarm.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs tabular-nums">
                      {new Date(alarm.triggerTimestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {alarm.state === 'ACTIVE_UNACKED' && user?.role !== 'Viewer' && (
                          <button
                            onClick={() => setAckingAlarmId(alarm._id)}
                            title="Acknowledge"
                            className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {alarm.state === 'ACTIVE_UNACKED' && user?.role === 'Admin' && (
                          <button
                            onClick={() => handleShelve(alarm._id)}
                            disabled={actionLoading === alarm._id}
                            title="Shelve"
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                          >
                            <ShieldOff className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Ack Modal */}
      {ackingAlarmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[var(--shadow-modal)] p-6 w-full max-w-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4">Acknowledge Alarm</h3>
            <textarea
              value={ackComment}
              onChange={(e) => setAckComment(e.target.value)}
              placeholder="Optional comment…"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setAckingAlarmId(null)}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAckSubmit(ackingAlarmId)}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlarmsPage() {
  return <AlarmContent />;
}
