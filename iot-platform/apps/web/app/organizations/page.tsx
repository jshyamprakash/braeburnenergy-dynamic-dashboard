'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Copy, Trash2, Edit2, Plus, Check } from 'lucide-react';

interface Organization {
  _id: string;
  id: string;
  name: string;
  slug: string;
  settings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface OrgStats {
  deviceCount: number;
  stateCount: number;
}

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

// Utility: Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
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
  const [loading, setLoading] = useState(false);

  const handleNameChange = (value: string) => {
    setName(value);
    if (autoSlug) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!slug.match(/^[a-z0-9-]+$/)) {
        toast.error('Slug can only contain lowercase letters, numbers, and hyphens');
        setLoading(false);
        return;
      }

      const payload = { name, slug };

      if (organization) {
        await apiClient.patch(`/organizations/${organization._id}`, payload);
        toast.success('Organization updated successfully');
      } else {
        await apiClient.post('/organizations', payload);
        toast.success('Organization created successfully');
      }

      onSave();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900 dark:text-white shadow-xl">
        <h2 className="mb-4 text-xl font-bold">
          {organization ? 'Edit Organization' : 'Create Organization'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Organization name"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Slug</label>
              {!organization && (
                <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={autoSlug}
                    onChange={(e) => setAutoSlug(e.target.checked)}
                  />
                  Auto-generate
                </label>
              )}
            </div>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={autoSlug && !organization}
              className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:disabled:bg-gray-700"
              placeholder="organization-slug"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              URL-friendly identifier (lowercase, hyphens only)
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
  organization,
  onClose,
  onDelete,
}: {
  organization: Organization;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== organization.name) {
      toast.error('Organization name does not match');
      return;
    }

    setLoading(true);
    try {
      await apiClient.delete(`/organizations/${organization._id}`);
      toast.success('Organization deleted successfully');
      onDelete();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete organization');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-900 dark:text-white shadow-xl">
        <h2 className="mb-4 text-xl font-bold text-red-600">Delete Organization</h2>
        <div className="mb-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>Warning:</strong> This action will permanently delete this organization and
            all associated devices and data states. This cannot be undone.
          </p>
          <p>To confirm, type the organization name below:</p>
        </div>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={`Type: ${organization.name}`}
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
            disabled={confirmText !== organization.name || loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OrganizationsContent() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<Record<string, OrgStats>>({});
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isSuperAdmin = user?.role === 'SuperAdmin';
  const debouncedSearch = useDebounce(search, 300);
  const limit = 10;

  const fetchOrganizations = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const response = await apiClient.get<any>(`/organizations?${params.toString()}`);
      setOrganizations(response.data || []);
      setTotal((response as any).pagination?.total || 0);

      // Fetch stats for all organizations in parallel
      if (response.data && response.data.length > 0) {
        const statsPromises = response.data.map((org: Organization) =>
          apiClient.get<OrgStats>(`/organizations/${org._id}/stats`)
            .then((res) => ({ [org._id]: res.data }))
            .catch(() => ({ [org._id]: { deviceCount: 0, stateCount: 0 } }))
        );

        const statsResults = await Promise.all(statsPromises);
        const statsMap = statsResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setStats(statsMap);
      }
    } catch (error) {
      toast.error('Failed to fetch organizations');
    } finally {
      setLoading(false);
    }
  }, [offset, debouncedSearch]);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchOrganizations();
  }, [offset, debouncedSearch, fetchOrganizations]);

  const handleCopySlug = (slug: string) => {
    navigator.clipboard.writeText(slug);
    toast.success('Slug copied to clipboard');
  };

  const canNavigateNext = offset + limit < total;
  const canNavigatePrev = offset > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Organizations</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage multi-tenant organizations and device grouping
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => {
              setEditingOrg(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
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
          placeholder="Search by name or slug..."
          className="w-full px-4 py-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:text-white"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">Loading organizations...</div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-gray-200 dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-400">
            {debouncedSearch ? 'No organizations match your search' : 'No organizations yet'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Slug</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Devices</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">States</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                {isSuperAdmin && (
                  <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr
                  key={org._id}
                  className="border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3 font-medium">{org.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded dark:bg-gray-800">
                        {org.slug}
                      </code>
                      <button
                        onClick={() => handleCopySlug(org.slug)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        title="Copy slug"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {stats[org._id]?.deviceCount || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {stats[org._id]?.stateCount || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {formatDate(org.createdAt)}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingOrg(org)}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeletingOrg(org)}
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
      {showCreateModal || editingOrg ? (
        <CreateEditModal
          organization={editingOrg || undefined}
          onClose={() => {
            setShowCreateModal(false);
            setEditingOrg(null);
          }}
          onSave={() => fetchOrganizations()}
        />
      ) : null}

      {deletingOrg && (
        <DeleteConfirmModal
          organization={deletingOrg}
          onClose={() => setDeletingOrg(null)}
          onDelete={() => fetchOrganizations()}
        />
      )}
    </div>
  );
}

export default function OrganizationsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <OrganizationsContent />
        </div>
      </div>
    </ProtectedRoute>
  );
}
