'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useState } from 'react';

export default function AuthTestPage() {
  const { user, isAuthenticated, isLoading, error, login, logout, clearError } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin123!');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      // Error is handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <p>Loading auth state...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-10 space-y-6">
      <h1 className="text-3xl font-bold mb-6">Auth Context Test Page</h1>

      {/* Auth Status */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Auth Status</h2>
        <div className="space-y-2">
          <p>
            <strong>Authenticated:</strong>{' '}
            <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
              {isAuthenticated ? 'Yes' : 'No'}
            </span>
          </p>
          <p>
            <strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 rounded">
          <div className="flex items-center justify-between">
            <p className="text-red-800 dark:text-red-200">{error}</p>
            <button
              onClick={clearError}
              className="text-red-600 dark:text-red-400 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* User Info (if authenticated) */}
      {isAuthenticated && user && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">User Info</h2>
          <div className="space-y-2">
            <p>
              <strong>Username:</strong> {user.username}
            </p>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Role:</strong> {user.role}
            </p>
            <p>
              <strong>Organization ID:</strong> {user.organizationId}
            </p>
            <p>
              <strong>Active:</strong> {user.isActive ? 'Yes' : 'No'}
            </p>
            <p>
              <strong>Last Login:</strong> {user.lastLogin || 'Never'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      )}

      {/* Login Form (if not authenticated) */}
      {!isAuthenticated && (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Login</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Default credentials: admin / Admin123!
          </p>
        </div>
      )}

      {/* localStorage Info */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">localStorage Debug</h2>
        <div className="space-y-2 text-sm font-mono">
          <p>
            <strong>Access Token:</strong>{' '}
            {typeof window !== 'undefined' && localStorage.getItem('iot_access_token')
              ? localStorage.getItem('iot_access_token')?.substring(0, 30) + '...'
              : 'None'}
          </p>
          <p>
            <strong>Refresh Token:</strong>{' '}
            {typeof window !== 'undefined' && localStorage.getItem('iot_refresh_token')
              ? localStorage.getItem('iot_refresh_token')?.substring(0, 30) + '...'
              : 'None'}
          </p>
        </div>
      </div>
    </div>
  );
}
