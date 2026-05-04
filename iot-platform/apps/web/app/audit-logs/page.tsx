'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Download, X, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';

interface AuditLog {
  _id: string;
  username: string;
  userId?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT';
  resource: string;
  resourceId?: string;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
  changes?: { before: any; after: any };
  metadata?: { ipAddress?: string; userAgent?: string; sessionId?: string; reason?: string };
}

interface Statistics {
  total: number;
  byAction: Array<{ _id: string; count: number }>;
  byResource: Array<{ _id: string; count: number }>;
  bySuccess: Array<{ _id: boolean; count: number }>;
}

// ── Action badge colors ───────────────────────────────────────────────────────
const actionBadge: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  UPDATE: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  DELETE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  LOGIN:  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  LOGOUT: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  VIEW:   'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  EXPORT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
};

function AuditLogContent() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const [action, setAction] = useState<string>('');
  const [resource, setResource] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [successFilter, setSuccessFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (action) params.append('action', action);
      if (resource) params.append('resource', resource);
      if (username) params.append('username', username);
      if (successFilter) params.append('success', successFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const logsRes = await apiClient.get<any>(`/audit-logs?${params.toString()}`);
      setLogs((logsRes as any).data || []);
      setTotal(((logsRes as any).pagination as any)?.total || 0);
      setTotalPages(((logsRes as any).pagination as any)?.totalPages || 0);

      const statsParams = new URLSearchParams();
      if (startDate) statsParams.append('startDate', startDate);
      if (endDate) statsParams.append('endDate', endDate);
      const statsRes = await apiClient.get<any>(`/audit-logs/statistics?${statsParams.toString()}`);
      setStatistics(((statsRes as any).data as any) || null);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); }, [action, resource, username, successFilter, startDate, endDate]);
  useEffect(() => { loadData(); }, [page, action, resource, username, successFilter, startDate, endDate]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      window.location.href = `/api/audit-logs/export?${params.toString()}`;
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const failedCount = statistics?.bySuccess?.find((s) => s._id === false)?.count || 0;
  const getActionCount = (a: string) => statistics?.byAction?.find(x => x._id === a)?.count || 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Logs</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">EPA 21 CFR Part 11 compliant audit trail</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Stats Strip */}
      <div className="flex items-center gap-6 px-1">
        {[
          { label: 'Total',   value: statistics?.total || 0,     color: 'text-slate-900 dark:text-slate-100' },
          { label: 'Creates', value: getActionCount('CREATE'),   color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Updates', value: getActionCount('UPDATE'),   color: 'text-sky-600 dark:text-sky-400' },
          { label: 'Deletes', value: getActionCount('DELETE'),   color: 'text-rose-600 dark:text-rose-400' },
          { label: 'Failed',  value: failedCount,                color: 'text-rose-600 dark:text-rose-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Action</label>
            <select value={action} onChange={(e) => setAction(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="VIEW">View</option>
              <option value="EXPORT">Export</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Resource</label>
            <input type="text" value={resource} onChange={(e) => setResource(e.target.value)} placeholder="e.g., Device"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g., admin"
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
            <select value={successFilter} onChange={(e) => setSuccessFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Start Date</label>
            <input type="date" value={startDate.split('T')[0]} onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">End Date</label>
            <input type="date" value={endDate.split('T')[0]} onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-500 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading logs…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">No audit logs found</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Username</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Resource</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log._id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${!log.success ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''}`}>
                    <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{log.username}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${actionBadge[log.action] ?? actionBadge.VIEW}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {log.resource}
                      {log.resourceId && <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 ml-1">({log.resourceId.slice(0, 8)}…)</span>}
                    </td>
                    <td className="px-4 py-3">
                      {log.success
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <XCircle className="w-4 h-4 text-rose-500" />
                      }
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelectedLog(log)}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages} · {total} total entries
              </p>
              <div className="flex gap-1.5">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="p-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                  className="p-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right-slide Detail Drawer */}
      {selectedLog && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedLog(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-5 py-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Audit Log Detail</h3>
              <button onClick={() => setSelectedLog(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Timestamp</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100 font-mono">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Username</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{selectedLog.username}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Action</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${actionBadge[selectedLog.action] ?? actionBadge.VIEW}`}>
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Resource</p>
                  <p className="text-sm text-slate-900 dark:text-slate-100">{selectedLog.resource}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Status</p>
                  <p className={`text-sm font-semibold flex items-center gap-1 ${selectedLog.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {selectedLog.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {selectedLog.success ? 'Success' : 'Failed'}
                  </p>
                </div>
              </div>

              {selectedLog.metadata && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Session Metadata</p>
                  {selectedLog.metadata.ipAddress && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400 dark:text-slate-500">IP</span> · {selectedLog.metadata.ipAddress}
                    </p>
                  )}
                  {selectedLog.metadata.userAgent && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 break-words leading-relaxed">{selectedLog.metadata.userAgent}</p>
                  )}
                </div>
              )}

              {selectedLog.errorMessage && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-2">Error</p>
                  <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 p-3 rounded-lg">{selectedLog.errorMessage}</p>
                </div>
              )}

              {selectedLog.changes && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Changes</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 p-3 rounded-lg">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2">Before</p>
                      <pre className="text-[11px] font-mono text-rose-700 dark:text-rose-300 overflow-auto max-h-40 whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.changes.before, null, 2)}
                      </pre>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 p-3 rounded-lg">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">After</p>
                      <pre className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 overflow-auto max-h-40 whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.changes.after, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  return <AuditLogContent />;
}
