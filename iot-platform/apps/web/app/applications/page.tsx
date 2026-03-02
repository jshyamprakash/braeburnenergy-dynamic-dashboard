'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/lib/hooks/useAuth';
import { apiClient } from '@/lib/api-client';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Copy, Trash2, Edit2, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import Link from 'next/link';
import type { Application, PaginatedResponse } from '@repo/types';

interface AppStats {
  deviceCount: number;
  workflowCount: number;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

function CreateEditModal({
  application,
  onClose,
  onSave,
}: {
  application?: Application;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(application?.name || '');
  const [description, setDescription] = useState(application?.description || '');
  const [slug, setSlug] = useState(application?.slug || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (application) {
      setName(application.name);
      setDescription(application.description || '');
      setSlug(application.slug);
    } else {
      setName('');
      setDescription('');
      setSlug('');
    }
  }, [application]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!name.trim()) {
        toast.error('Application name is required');
        setLoading(false);
        return;
      }

      const payload = { name: name.trim(), description: description.trim() || undefined };

      if (application) {
        await apiClient.patch(`/applications/${application.applicationId}`, payload);
        toast.success('Application updated successfully');
      } else {
        await apiClient.post('/applications', payload);
        toast.success('Application created successfully');
      }

      onSave();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save application');
    } finally {
      setLoading(false);
    }
  };

  // Compute slug preview for display
  const slugPreview = !application ? generateSlug(name) : slug;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900 dark:text-white shadow-xl">
        <h2 className="mb-4 text-xl font-bold">
          {application ? 'Edit Application' : 'Create Application'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Application name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Brief description"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <div className="px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
              {slugPreview}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Auto-generated from name (read-only)
            </p>
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
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  application,
  onClose,
  onDelete,
}: {
  application: Application;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [blockingEntities, setBlockingEntities] = useState<Record<string, number> | null>(null);

  const handleDelete = async () => {
    if (confirmText !== application.name) {
      toast.error('Application name does not match');
      return;
    }

    setLoading(true);
    setDeleteError('');
    setBlockingEntities(null);
    try {
      await apiClient.delete(`/applications/${application.applicationId}`);
      toast.success('Application deleted successfully');
      onDelete();
      onClose();
    } catch (error: any) {
      const blocking = error?.details?.details?.blocking || error?.details?.blocking || error?.blocking;
      if ((error?.statusCode === 409 || error?.code === 409 || error?.message?.includes('Cannot delete')) && blocking) {
        setBlockingEntities(blocking);
      } else {
        setDeleteError(error?.message || 'Failed to delete application');
        toast.error(error?.message || 'Failed to delete application');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900 dark:text-white shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-red-600">Delete Application</h2>
        <div className="mb-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>Warning:</strong> This action will permanently delete this application.
          </p>
          {blockingEntities && (
            <div className="rounded border border-red-300 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300">
              <p className="font-semibold mb-1">Cannot delete — remove these first:</p>
              <ul className="list-disc pl-4 space-y-1">
                {blockingEntities.devices && <li>{blockingEntities.devices} Device(s)</li>}
                {blockingEntities.workflows && <li>{blockingEntities.workflows} Workflow(s)</li>}
                {blockingEntities.dashboards && <li>{blockingEntities.dashboards} Dashboard(s)</li>}
              </ul>
              <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                Go to the Application detail page to delete linked entities.
              </p>
            </div>
          )}
          {deleteError && (
            <p className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-2 rounded">
              {deleteError}
            </p>
          )}
          <p>To confirm, type the application name below:</p>
        </div>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={`Type: ${application.name}`}
          className="w-full px-3 py-2 border rounded-lg mb-4 dark:bg-gray-800 dark:border-gray-700"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={confirmText !== application.name || loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplicationsContent() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<Record<string, AppStats>>({});
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [deletingApp, setDeletingApp] = useState<Application | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const debouncedSearch = useDebounce(search, 300);
  const limit = 10;

  const fetchApplications = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const response = await apiClient.get<any>(`/applications?${params.toString()}`);
      setApplications(response.data || []);
      setTotal((response as any).pagination?.total || 0);

      // For now, set default stats (backend doesn't return device/workflow counts in list)
      if (response.data && response.data.length > 0) {
        const defaultStats: Record<string, AppStats> = {};
        response.data.forEach((app: Application) => {
          defaultStats[app.applicationId] = { deviceCount: 0, workflowCount: 0 };
        });
        setStats(defaultStats);
      }
    } catch (error) {
      toast.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }, [offset, debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchApplications();
  }, [offset, debouncedSearch, fetchApplications]);

  const handleCopySlug = (slug: string) => {
    navigator.clipboard.writeText(slug);
    toast.success('Slug copied to clipboard');
  };

  const handleToggleActive = async (app: Application) => {
    try {
      await apiClient.patch(`/applications/${app.applicationId}`, {
        isActive: !app.isActive,
      });
      toast.success(`Application ${!app.isActive ? 'enabled' : 'disabled'}`);
      fetchApplications();
    } catch (error) {
      toast.error('Failed to update application');
    }
  };

  const canNavigateNext = offset + limit < total;
  const canNavigatePrev = offset > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Applications</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage application containers (top-level project scope)
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => {
              setEditingApp(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Application
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or slug..."
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            {debouncedSearch ? 'No applications match your search' : 'No applications yet'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Slug</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                {isSuperAdmin && (
                  <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr
                  key={app.applicationId}
                  className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/applications/${app.applicationId}`}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      {app.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded dark:bg-gray-800">
                        {app.slug}
                      </code>
                      <button
                        onClick={() => handleCopySlug(app.slug)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        title="Copy slug"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isSuperAdmin ? (
                      <button
                        onClick={() => handleToggleActive(app)}
                        className="flex items-center gap-2 px-2 py-1 rounded text-sm font-medium"
                        title={app.isActive ? 'Disable' : 'Enable'}
                      >
                        {app.isActive ? (
                          <>
                            <ToggleRight className="h-4 w-4 text-green-600" />
                            <span className="text-green-600">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500">Inactive</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${
                          app.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {app.isActive ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(app.createdAt.toString())}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingApp(app)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingApp(app)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={!canNavigatePrev}
                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={!canNavigateNext}
                className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal || editingApp ? (
        <CreateEditModal
          application={editingApp || undefined}
          onClose={() => {
            setShowCreateModal(false);
            setEditingApp(null);
          }}
          onSave={() => fetchApplications()}
        />
      ) : null}

      {deletingApp && (
        <DeleteConfirmModal
          application={deletingApp}
          onClose={() => setDeletingApp(null)}
          onDelete={() => fetchApplications()}
        />
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <ApplicationsContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}
