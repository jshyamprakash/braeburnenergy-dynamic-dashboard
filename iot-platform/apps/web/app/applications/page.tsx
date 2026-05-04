'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { apiClient } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Copy, Trash2, Edit2, Plus, ToggleLeft, ToggleRight, Search, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useApplications, applicationKeys } from '@/lib/hooks/useApplications';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { Application } from '@repo/types';

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
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-[var(--shadow-modal)] ring-1 ring-slate-900/5 dark:ring-slate-700/60">
        <h2 className="mb-5 text-lg font-semibold text-slate-900 dark:text-white">
          {application ? 'Edit Application' : 'Create Application'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              placeholder="Application name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
              placeholder="Brief description (optional)"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Slug</label>
            <div className="px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-sm font-mono text-slate-500 dark:text-slate-400">
              {slugPreview || <span className="text-slate-300 dark:text-slate-600">auto-generated</span>}
            </div>
            <p className="mt-1 text-xs text-slate-400">Auto-generated from name</p>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Saving…' : 'Save'}
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
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 p-6 shadow-[var(--shadow-modal)] ring-1 ring-slate-900/5 dark:ring-slate-700/60">
        <h2 className="mb-4 text-lg font-semibold text-rose-600">Delete Application</h2>
        <div className="mb-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
          <p><strong className="text-slate-800 dark:text-slate-200">Warning:</strong> This action will permanently delete this application.</p>
          {blockingEntities && (
            <div className="rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50 dark:bg-rose-950/30 p-3 text-sm text-rose-700 dark:text-rose-300">
              <p className="font-semibold mb-1">Cannot delete — remove these first:</p>
              <ul className="list-disc pl-4 space-y-1">
                {blockingEntities.devices && <li>{blockingEntities.devices} Device(s)</li>}
                {blockingEntities.workflows && <li>{blockingEntities.workflows} Workflow(s)</li>}
                {blockingEntities.dashboards && <li>{blockingEntities.dashboards} Dashboard(s)</li>}
              </ul>
              <p className="mt-2 text-xs text-rose-500 dark:text-rose-400">Go to the Application detail page to delete linked entities.</p>
            </div>
          )}
          {deleteError && (
            <p className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 p-2 rounded-lg">{deleteError}</p>
          )}
          <p>To confirm, type the application name below:</p>
        </div>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={`Type: ${application.name}`}
          className="w-full px-3 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white mb-4 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={confirmText !== application.name || loading} className="px-4 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplicationsContent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [deletingApp, setDeletingApp] = useState<Application | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Delay role check until after hydration — user comes from Redux/localStorage (client-only)
  const isSuperAdmin = mounted && user?.role === 'SuperAdmin';
  const canManageApps = mounted && (user?.role === 'SuperAdmin' || user?.role === 'Admin');
  const debouncedSearch = useDebounce(search, 300);
  const limit = 10;

  const { data, isLoading } = useApplications({
    search: debouncedSearch,
    limit,
    offset,
  });

  const applications = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;

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
      qc.invalidateQueries({ queryKey: applicationKeys.all });
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Applications</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage application containers for your IoT deployments
          </p>
        </div>
        {canManageApps && (
          <button
            onClick={() => { setEditingApp(null); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Application
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or slug…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Card Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-3" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700/60 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <LayoutGrid className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {debouncedSearch ? 'No applications match' : 'No applications yet'}
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {debouncedSearch ? 'Try a different search term.' : 'Create your first application to get started.'}
          </p>
          {!debouncedSearch && canManageApps && (
            <button
              onClick={() => { setEditingApp(null); setShowCreateModal(true); }}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium transition-colors mx-auto"
            >
              <Plus className="h-4 w-4" />
              Create Application
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {applications.map((app) => (
              <div
                key={app.applicationId}
                className={`group rounded-xl border bg-white dark:bg-slate-800/50 p-5 hover:shadow-md transition-all duration-200 ${
                  app.isActive
                    ? 'border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700'
                    : 'border-slate-200 dark:border-slate-700 opacity-70'
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/applications/${app.applicationId}`}
                      className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1"
                    >
                      {app.name}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-1">
                      <code className="text-[11px] font-mono bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                        {app.slug}
                      </code>
                      <button onClick={() => handleCopySlug(app.slug)} title="Copy slug" className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors">
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    app.isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${app.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {app.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Description */}
                {app.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">{app.description}</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700/60">
                  <span className="text-[11px] text-slate-400">{formatDate(app.createdAt.toString())}</span>
                  {canManageApps && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {app.isActive !== undefined && (
                        <button onClick={() => handleToggleActive(app)} title={app.isActive ? 'Disable' : 'Enable'} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                          {app.isActive ? <ToggleRight className="h-3.5 w-3.5 text-emerald-600" /> : <ToggleLeft className="h-3.5 w-3.5 text-slate-400" />}
                        </button>
                      )}
                      <button onClick={() => setEditingApp(app)} title="Edit" className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeletingApp(app)} title="Delete" className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={!canNavigatePrev} className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors">
                  Previous
                </button>
                <button onClick={() => setOffset(offset + limit)} disabled={!canNavigateNext} className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showCreateModal || editingApp ? (
        <CreateEditModal
          application={editingApp || undefined}
          onClose={() => {
            setShowCreateModal(false);
            setEditingApp(null);
          }}
          onSave={() => qc.invalidateQueries({ queryKey: applicationKeys.all })}
        />
      ) : null}

      {deletingApp && (
        <DeleteConfirmModal
          application={deletingApp}
          onClose={() => setDeletingApp(null)}
          onDelete={() => qc.invalidateQueries({ queryKey: applicationKeys.all })}
        />
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <div className="min-h-screen">
      <ApplicationsContent />
    </div>
  );
}
