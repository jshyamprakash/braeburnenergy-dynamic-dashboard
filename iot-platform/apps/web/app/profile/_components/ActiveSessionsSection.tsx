'use client';

import { useState } from 'react';
import { AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLogoutAll } from '@/lib/hooks/useProfile';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/store';
import { selectSessions } from '@/lib/store/slices/userSlice';
import { toast } from 'sonner';

function LogoutConfirmModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900 dark:text-white shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-red-600">Logout from All Devices</h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          This will revoke all active sessions and log you out from all devices. You will need
          to login again.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Logging out...' : 'Logout All Devices'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ActiveSessionsSection() {
  const router = useRouter();
  const { logout } = useAuth();
  const sessions = useAppSelector(selectSessions);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const logoutAll = useLogoutAll();
  const logoutLoading = logoutAll.isPending;

  const handleLogoutAll = async () => {
    try {
      await logoutAll.mutateAsync();
      toast.success('Logged out from all devices');
      await logout();
      router.push('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to logout');
    } finally {
      setShowLogoutConfirm(false);
    }
  };

  const mostRecentAccessToken = [...sessions]
    .filter((s) => s.type === 'access')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return (
    <>
      {/* Active Sessions */}
      <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 text-xl font-semibold">
          Active Sessions ({sessions.length})
        </h2>

        {sessions.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No active sessions</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Type</th>
                  <th className="px-4 py-2 text-left font-semibold">IP Address</th>
                  <th className="px-4 py-2 text-left font-semibold">User Agent</th>
                  <th className="px-4 py-2 text-left font-semibold">Created</th>
                  <th className="px-4 py-2 text-left font-semibold">Expires</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr
                    key={session.jti}
                    className={`border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 ${
                      mostRecentAccessToken?.jti === session.jti
                        ? 'bg-indigo-50 dark:bg-indigo-900/20'
                        : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                          session.type === 'access'
                            ? 'bg-indigo-100 text-blue-800 dark:bg-indigo-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {session.type === 'access' ? 'Access' : 'Refresh'}
                        {mostRecentAccessToken?.jti === session.jti && (
                          <span className="ml-1">● Current</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{session.ipAddress || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {session.userAgent?.substring(0, 60) || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(session.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(session.expiresAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Logout All */}
      <section className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/20">
        <div className="flex items-start gap-4">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="mb-2 text-lg font-semibold text-red-600 dark:text-red-400">
              Logout from All Devices
            </h2>
            <p className="mb-4 text-sm text-red-700 dark:text-red-300">
              This will end your sessions on all devices. You will need to login again.
            </p>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              <LogOut className="h-4 w-4" />
              Logout All Devices
            </button>
          </div>
        </div>
      </section>

      {/* Modal */}
      {showLogoutConfirm && (
        <LogoutConfirmModal
          onConfirm={handleLogoutAll}
          onCancel={() => setShowLogoutConfirm(false)}
          loading={logoutLoading}
        />
      )}
    </>
  );
}
