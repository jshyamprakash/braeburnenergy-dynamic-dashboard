'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Trash2, Edit2, Plus, Check } from 'lucide-react';
import { useOrganizations, useCreateOrganization, useUpdateOrganization, useDeleteOrganization, type Organization, type OrgStats } from '@/lib/hooks/useOrganizations';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { useDebounce } from '@/lib/hooks/useDebounce';

// Utility: Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 100);
}

// Utility: Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}


function CreateEditModal({
  organization,
  onClose,
  onSave,
}: {
  organization?: Organization;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(organization?.name || '');
  const [slug, setSlug] = useState(organization?.slug || '');
  const [autoSlug, setAutoSlug] = useState(!organization);

  const create = useCreateOrganization();
  const update = useUpdateOrganization();
  const loading = create.isPending || update.isPending;

  const handleNameChange = (value: string) => {
    setName(value);
    if (autoSlug) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!slug.match(/^[a-z0-9-]+$/)) {
      toast.error('Slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    const payload = { name, slug };

    try {
      if (organization) {
        await update.mutateAsync({ id: organization._id, payload });
        toast.success('Organization updated successfully');
      } else {
        await create.mutateAsync(payload);
        toast.success('Organization created successfully');
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save organization');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 shadow-[var(--shadow-modal)] border border-slate-200 dark:border-slate-700">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {organization ? 'Edit Organization' : 'Create Organization'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Organization name"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Slug</label>
              {!organization && (
                <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={autoSlug} onChange={(e) => setAutoSlug(e.target.checked)}
                    className="h-3.5 w-3.5 rounded" />
                  Auto-generate
                </label>
              )}
            </div>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={autoSlug && !organization}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 disabled:opacity-60 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="organization-slug"
              required
            />
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              URL-friendly identifier (lowercase, hyphens only)
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  organization,
  onClose,
  onDelete,
}: {
  organization: Organization;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');

  const del = useDeleteOrganization();
  const loading = del.isPending;

  const handleDelete = async () => {
    if (confirmText !== organization.name) {
      toast.error('Organization name does not match');
      return;
    }

    try {
      await del.mutateAsync(organization._id);
      toast.success('Organization deleted successfully');
      onDelete();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete organization');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 shadow-[var(--shadow-modal)] border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-base font-semibold text-rose-600 dark:text-rose-400 mb-1">Delete Organization</h2>
        <div className="space-y-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
          <p><strong className="text-slate-700 dark:text-slate-300">Warning:</strong> This will permanently delete this organization and all associated devices and data. This cannot be undone.</p>
          <p>To confirm, type the organization name below:</p>
        </div>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={`Type: ${organization.name}`}
          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 mb-5 focus:outline-none focus:ring-2 focus:ring-rose-500"
        />
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={confirmText !== organization.name || loading}
            className="flex-1 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrganizationsContent() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState<Record<string, OrgStats>>({});

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const debouncedSearch = useDebounce(search, 300);
  const limit = 10;

  const { data, isLoading } = useOrganizations({
    search: debouncedSearch,
    limit,
    offset,
  });

  const organizations = data?.data ?? [];
  const total = data?.pagination?.total ?? 0;

  const handleCopySlug = (slug: string) => {
    navigator.clipboard.writeText(slug);
    toast.success('Slug copied to clipboard');
  };

  const canNavigateNext = offset + limit < total;
  const canNavigatePrev = offset > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Organizations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage multi-tenant organizations and device grouping
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => {
              setEditingOrg(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Organization
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or slug…"
          className="w-full px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full">
            <tbody>
              {[...Array(5)].map((_, i) => <TableRowSkeleton key={i} cols={6} />)}
            </tbody>
          </table>
        </div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-12 border rounded-xl border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {debouncedSearch ? 'No organizations match your search' : 'No organizations yet'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Users</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Devices</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Created</th>
                {isSuperAdmin && (
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {organizations.map((org) => (
                <tr key={org._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{org.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                        {org.slug}
                      </span>
                      <button onClick={() => handleCopySlug(org.slug)} title="Copy slug"
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 dark:text-violet-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      {stats[org._id]?.userCount || 0} users
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                      {stats[org._id]?.deviceCount || 0} devices
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                    {formatDate(org.createdAt)}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditingOrg(org)} title="Edit"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => setDeletingOrg(org)} title="Delete"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
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
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </p>
            <div className="flex gap-1.5">
              <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={!canNavigatePrev}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
                Previous
              </button>
              <button onClick={() => setOffset(offset + limit)} disabled={!canNavigateNext}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal || editingOrg ? (
        <CreateEditModal
          organization={editingOrg || undefined}
          onClose={() => {
            setShowCreateModal(false);
            setEditingOrg(null);
          }}
          onSave={() => {}}
        />
      ) : null}

      {deletingOrg && (
        <DeleteConfirmModal
          organization={deletingOrg}
          onClose={() => setDeletingOrg(null)}
          onDelete={() => setDeletingOrg(null)}
        />
      )}
    </div>
  );
}

export default function OrganizationsPage() {
  return <OrganizationsContent />;
}
