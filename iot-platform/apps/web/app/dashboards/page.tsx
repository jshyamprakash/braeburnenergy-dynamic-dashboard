'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { apiClient } from '@/lib/api-client';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { ulid } from 'ulid';

interface DashboardListItem {
  _id: string;
  dashboardId: string;
  name: string;
  description?: string;
  blocks: Array<{ id: string }>;
  createdAt: string;
  updatedAt: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function CreateDashboardModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Dashboard name is required');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/dashboards', {
        dashboardId: ulid(),
        organizationId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        name: name.trim(),
        description: description.trim() || undefined,
        blocks: [],
        layouts: {},
      });
      toast.success('Dashboard created successfully');
      setName('');
      setDescription('');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900 dark:text-white shadow-xl">
        <h2 className="mb-4 text-xl font-bold">Create Dashboard</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="e.g., Production Metrics"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Optional description"
              rows={3}
            />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DashboardsContent() {
  const [dashboards, setDashboards] = useState<DashboardListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDashboards = useCallback(async () => {
    try {
      const response = await apiClient.get<any>('/dashboards');
      setDashboards(response.data || []);
    } catch (error) {
      toast.error('Failed to fetch dashboards');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboards();
  }, [fetchDashboards]);

  const handleDelete = async (dashboardId: string) => {
    try {
      await apiClient.delete(`/dashboards/${dashboardId}`);
      toast.success('Dashboard deleted');
      setDeletingId(null);
      fetchDashboards();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete dashboard');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboards</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            View and manage your dashboards
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Dashboard
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-8">Loading dashboards...</div>
      ) : dashboards.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">No dashboards yet</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Blocks</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Updated</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {dashboards.map((dashboard) => (
                <tr
                  key={dashboard.dashboardId}
                  className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/dashboards/${dashboard.dashboardId}`}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      {dashboard.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {dashboard.blocks?.length || 0} blocks
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(dashboard.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/dashboards/${dashboard.dashboardId}`}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setDeletingId(dashboard.dashboardId)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <CreateDashboardModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchDashboards}
      />

      {/* Delete Confirm */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-gray-900 dark:text-white shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-red-600">Delete Dashboard</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <DashboardsContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}
