'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Lock, LogOut, AlertCircle, Check } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  organizationId: string;
  lastLogin?: string;
  createdAt: string;
}

interface TokenSession {
  jti: string;
  type: 'access' | 'refresh';
  createdAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

// Password validation checks
function validatePassword(password: string): {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
} {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const checks = validatePassword(password);
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const strength = Math.round((passedChecks / 5) * 100);

  const color =
    strength < 40 ? 'bg-red-500' : strength < 80 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="space-y-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className={`${color} transition-all`} style={{ width: `${strength}%` }} />
      </div>
      <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
        <div className={checks.length ? 'text-green-600 dark:text-green-400' : ''}>
          {checks.length ? '✓' : '○'} At least 8 characters
        </div>
        <div className={checks.uppercase ? 'text-green-600 dark:text-green-400' : ''}>
          {checks.uppercase ? '✓' : '○'} Uppercase letter
        </div>
        <div className={checks.lowercase ? 'text-green-600 dark:text-green-400' : ''}>
          {checks.lowercase ? '✓' : '○'} Lowercase letter
        </div>
        <div className={checks.number ? 'text-green-600 dark:text-green-400' : ''}>
          {checks.number ? '✓' : '○'} Number
        </div>
        <div className={checks.special ? 'text-green-600 dark:text-green-400' : ''}>
          {checks.special ? '✓' : '○'} Special character
        </div>
      </div>
    </div>
  );
}

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

function ProfileContent() {
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<TokenSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Change password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileResponse = await apiClient.get<UserProfile>('/auth/profile');
        setProfile(profileResponse.data);

        const sessionsResponse = await apiClient.get<any>('/auth/sessions');
        setSessions(sessionsResponse.data || []);
      } catch (error) {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword === currentPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    const checks = validatePassword(newPassword);
    if (!Object.values(checks).every(Boolean)) {
      toast.error('Password does not meet strength requirements');
      return;
    }

    setPasswordLoading(true);

    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Refresh sessions after password change
      const sessionsResponse = await apiClient.get<any>('/auth/sessions');
      setSessions(sessionsResponse.data || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to change password'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    setLogoutLoading(true);

    try {
      await apiClient.post('/auth/logout-all', {});
      toast.success('Logged out from all devices');
      await logout();
      router.push('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to logout');
    } finally {
      setLogoutLoading(false);
      setShowLogoutConfirm(false);
    }
  };

  const passwordChecks = validatePassword(newPassword);
  const passwordValid =
    Object.values(passwordChecks).every(Boolean) &&
    newPassword === confirmPassword &&
    newPassword !== currentPassword &&
    currentPassword.length > 0;

  const mostRecentAccessToken = [...sessions]
    .filter((s) => s.type === 'access')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Settings</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage your account, password, and active sessions
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading profile...</div>
      ) : (
        <>
          {/* Profile Info */}
          {profile && (
            <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <h2 className="mb-4 text-xl font-semibold">Profile Information</h2>
              <div className="flex items-start gap-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-200">
                    {profile.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="space-y-3 flex-1">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Username</p>
                    <p className="font-semibold">{profile.username}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                      <p className="font-semibold">{profile.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
                      <p>
                        <span className="inline-block px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 font-semibold">
                          {profile.role}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Member Since</p>
                      <p className="text-sm">
                        {new Date(profile.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    {profile.lastLogin && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Last Login</p>
                        <p className="text-sm">
                          {new Date(profile.lastLogin).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Change Password */}
          <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Change Password</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Enter new password"
                />
                {newPassword && <PasswordStrengthIndicator password={newPassword} />}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  placeholder="Confirm new password"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!passwordValid || passwordLoading}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </section>

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
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              session.type === 'access'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
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
        </>
      )}

      {/* Modals */}
      {showLogoutConfirm && (
        <LogoutConfirmModal
          onConfirm={handleLogoutAll}
          onCancel={() => setShowLogoutConfirm(false)}
          loading={logoutLoading}
        />
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <ProfileContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}
