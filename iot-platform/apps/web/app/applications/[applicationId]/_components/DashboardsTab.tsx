'use client';

import { useState, useCallback } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useCreateDashboard, useDeleteDashboard } from '@/lib/hooks/useDashboards';
import { toast } from 'sonner';
import { PREREQ_TOOLTIPS } from '@/lib/constants/ui-messages';
import { ulid } from 'ulid';

interface DashboardItem {
  _id: string;
  dashboardId: string;
  name: string;
  description?: string;
  blocks: Array<{ id: string }>;
  updatedAt: string;
}

interface DashboardsTabProps {
  applicationId: string;
  dashboards: DashboardItem[];
  deviceCount: number;
  workflowCount: number;
  onRefresh: () => Promise<void>;
}

function CreateDashboardModal({
  applicationId,
  onClose,
  onSuccess,
}: {
  applicationId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createDashboard = useCreateDashboard();
  const loading = createDashboard.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Dashboard name is required');
      return;
    }

    try {
      await createDashboard.mutateAsync({
        dashboardId: ulid(),
        name: name.trim(),
        description: description.trim() || undefined,
        applicationId,
        blocks: [],
        layouts: {},
      });
      toast.success('Dashboard created successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create dashboard');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-slate-900 dark:text-white shadow-xl">
        <h2 className="mb-4 text-xl font-bold">Create Dashboard</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              placeholder="e.g., Production Metrics"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
              placeholder="Optional description"
              rows={3}
            />
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DashboardsTab({
  applicationId,
  dashboards,
  deviceCount,
  workflowCount,
  onRefresh,
}: DashboardsTabProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingDashboardId, setDeletingDashboardId] = useState<string | null>(null);
  const deleteDashboard = useDeleteDashboard();

  const handleDelete = useCallback(
    async (dashboardId: string) => {
      try {
        await deleteDashboard.mutateAsync(dashboardId);
        toast.success('Dashboard deleted');
        setDeletingDashboardId(null);
        await onRefresh();
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete dashboard');
      }
    },
    [deleteDashboard, onRefresh]
  );

  const handleSuccess = useCallback(async () => {
    setIsCreateOpen(false);
    await onRefresh();
  }, [onRefresh]);

  function formatDate(dateString: string | Date): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  const canCreateDashboard = deviceCount > 0 && workflowCount > 0;
  const disabledTooltip =
    deviceCount === 0 && workflowCount === 0
      ? PREREQ_TOOLTIPS.NO_DEVICE_AND_WORKFLOW_FOR_DASHBOARD
      : deviceCount === 0
        ? PREREQ_TOOLTIPS.NO_DEVICE_FOR_DASHBOARD
        : PREREQ_TOOLTIPS.NO_WORKFLOW_FOR_DASHBOARD;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setIsCreateOpen(true)}
          disabled={!canCreateDashboard}
          title={!canCreateDashboard ? disabledTooltip : ''}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            !canCreateDashboard
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <Plus className="h-4 w-4" />
          Create Dashboard
        </button>
      </div>

      {dashboards.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-slate-200 dark:border-slate-700">
          <p className="text-gray-600 dark:text-slate-400">No dashboards in this application</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
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
                  className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/dashboards/${dashboard.dashboardId}?applicationId=${applicationId}`}
                      className="text-indigo-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      {dashboard.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                    {dashboard.blocks?.length || 0} blocks
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                    {formatDate(dashboard.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/dashboards/${dashboard.dashboardId}?applicationId=${applicationId}`}
                        className="text-indigo-600 hover:text-blue-700 dark:text-blue-400"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setDeletingDashboardId(dashboard.dashboardId)}
                        className="text-rose-600 hover:text-red-700 dark:text-red-400"
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

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateDashboardModal
          applicationId={applicationId}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingDashboardId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-slate-900 dark:text-white shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-rose-600">Delete Dashboard</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              Are you sure? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingDashboardId(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingDashboardId)}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
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
