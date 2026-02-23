'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { apiClient } from '@/lib/api-client';
import { Download, X, ChevronLeft, ChevronRight } from 'lucide-react';

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

const actionColors: Record<string, string> = {
  CREATE: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
  UPDATE: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
  DELETE: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
  LOGIN: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
  LOGOUT: 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200',
  VIEW: 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200',
  EXPORT: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
};

function AuditLogContent() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filters
  const [action, setAction] = useState<string>('');
  const [resource, setResource] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [successFilter, setSuccessFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Fetch logs and statistics
  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch logs
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

      // Fetch statistics
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

  useEffect(() => {
    setPage(1); // Reset to page 1 when filters change
  }, [action, resource, username, successFilter, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [page, action, resource, username, successFilter, startDate, endDate]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      // Trigger download
      window.location.href = `/api/audit-logs/export?${params.toString()}`;
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const failedCount = statistics?.bySuccess?.find((s) => s._id === false)?.count || 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Audit Logs</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">EPA 21 CFR Part 11 compliant audit trail</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Logs</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{statistics?.total || 0}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Creates</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {statistics?.byAction?.find((a) => a._id === 'CREATE')?.count || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Deletes</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">
              {statistics?.byAction?.find((a) => a._id === 'DELETE')?.count || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">{failedCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Action</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
              >
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
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Resource</label>
              <input
                type="text"
                value={resource}
                onChange={(e) => setResource(e.target.value)}
                placeholder="e.g., Device"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., admin"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={successFilter}
                onChange={(e) => setSuccessFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
              >
                <option value="">All</option>
                <option value="true">Success</option>
                <option value="false">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate.split('T')[0]}
                onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={endDate.split('T')[0]}
                onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">No audit logs found</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Timestamp</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Username</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Action</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Resource</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">{log.username}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionColors[log.action]}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {log.resource} {log.resourceId && `(${log.resourceId.slice(0, 8)}...)`}
                      </td>
                      <td className="px-6 py-4">
                        {log.success ? (
                          <span className="text-green-600 dark:text-green-400 font-medium">✓</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400 font-medium">✗</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages} ({total} total)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detail Panel */}
        {selectedLog && (
          <div className="fixed inset-0 bg-black/50 flex items-end z-50">
            <div className="bg-white dark:bg-gray-900 w-full max-w-2xl h-3/4 overflow-y-auto rounded-t-lg">
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Audit Log Detail</h3>
                <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Timestamp</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Username</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{selectedLog.username}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Action</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${actionColors[selectedLog.action]}`}>
                        {selectedLog.action}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Resource</p>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{selectedLog.resource}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Status</p>
                      <p className={`text-sm font-medium ${selectedLog.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {selectedLog.success ? 'Success' : 'Failed'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                {selectedLog.metadata && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Metadata</p>
                    {selectedLog.metadata.ipAddress && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium">IP:</span> {selectedLog.metadata.ipAddress}
                      </p>
                    )}
                    {selectedLog.metadata.userAgent && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 break-words">
                        <span className="font-medium">User Agent:</span> {selectedLog.metadata.userAgent}
                      </p>
                    )}
                  </div>
                )}

                {/* Changes */}
                {selectedLog.changes && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Changes</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
                        <p className="text-xs font-medium text-red-800 dark:text-red-300 mb-2">Before</p>
                        <pre className="text-xs text-red-700 dark:text-red-400 overflow-auto max-h-32">
                          {JSON.stringify(selectedLog.changes.before, null, 2)}
                        </pre>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                        <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-2">After</p>
                        <pre className="text-xs text-green-700 dark:text-green-400 overflow-auto max-h-32">
                          {JSON.stringify(selectedLog.changes.after, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {selectedLog.errorMessage && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Error Message</p>
                    <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">{selectedLog.errorMessage}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <ProtectedRoute>
      <AuditLogContent />
    </ProtectedRoute>
  );
}
