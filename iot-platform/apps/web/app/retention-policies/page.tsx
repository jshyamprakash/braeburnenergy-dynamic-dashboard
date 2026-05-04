'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { apiClient } from '@/lib/api-client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Archive, Trash2, Edit2, Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import {
  fetchPolicyData,
  fetchPolicies,
  fetchStats,
  selectPolicies,
  selectPolicyStats,
  selectPolicyStatus,
} from '@/lib/store/slices/policySlice';

import type { RetentionPolicy, StatCard } from '@/lib/store/slices/policySlice';

// Utility: convert seconds to human-readable duration
function secondsToDuration(seconds: number): string {
  if (seconds === 0) return 'Permanent';
  const days = Math.round(seconds / 86400);
  if (days < 365) return `${days}d`;
  const years = Math.round(days / 365);
  return `${years}y`;
}

// Utility: convert days to seconds
function daysToSeconds(days: number): number {
  return days * 86400;
}

// Utility: convert seconds to days
function secondsToDays(seconds: number): number {
  return Math.round(seconds / 86400);
}

const CATEGORIES = [
  { value: 'device_states', label: 'Device States' },
  { value: 'audit_logs', label: 'Audit Logs' },
  { value: 'alarms', label: 'Alarms' },
  { value: 'calibration_records', label: 'Calibration Records' },
];

function StorageTierBar({ policy }: { policy: RetentionPolicy }) {
  const hot = policy.hotStorageDuration;
  const warm = policy.warmStorageDuration;
  const cold = policy.coldStorageDuration;
  const total = hot + warm + cold;

  if (total === 0) return <div className="text-sm text-gray-500">No retention</div>;

  const hotPercent = (hot / total) * 100;
  const warmPercent = (warm / total) * 100;
  const coldPercent = (cold / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex h-6 overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
        {hot > 0 && (
          <div
            className="bg-indigo-500 hover:bg-indigo-600 transition-colors"
            style={{ width: `${hotPercent}%` }}
            title={`Hot: ${secondsToDuration(hot)}`}
          />
        )}
        {warm > 0 && (
          <div
            className="bg-yellow-500 hover:bg-yellow-600 transition-colors"
            style={{ width: `${warmPercent}%` }}
            title={`Warm: ${secondsToDuration(warm)}`}
          />
        )}
        {cold > 0 && (
          <div
            className="bg-gray-400 hover:bg-gray-500 transition-colors"
            style={{ width: `${coldPercent}%` }}
            title={`Cold: ${secondsToDuration(cold)}`}
          />
        )}
      </div>
      <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
        {hot > 0 && (
          <span>
            <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 mr-1" />
            Hot: {secondsToDuration(hot)}
          </span>
        )}
        {warm > 0 && (
          <span>
            <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 mr-1" />
            Warm: {secondsToDuration(warm)}
          </span>
        )}
        {cold > 0 && (
          <span>
            <span className="inline-block h-2 w-2 rounded-full bg-gray-400 mr-1" />
            Cold: {secondsToDuration(cold)}
          </span>
        )}
      </div>
    </div>
  );
}

function CreateEditModal({
  policy,
  onClose,
  onSave,
}: {
  policy?: RetentionPolicy;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(policy?.name || '');
  const [category, setCategory] = useState<RetentionPolicy['category']>(
    policy?.category || 'device_states'
  );
  const [hotDays, setHotDays] = useState(secondsToDays(policy?.hotStorageDuration || 90));
  const [warmDays, setWarmDays] = useState(secondsToDays(policy?.warmStorageDuration || 365));
  const [coldDays, setColdDays] = useState(secondsToDays(policy?.coldStorageDuration || 1825));
  const [regulatory, setRegulatory] = useState(policy?.regulatoryRequirement || '');
  const [archiveEnabled, setArchiveEnabled] = useState(policy?.archiveEnabled || false);
  const [archiveDestination, setArchiveDestination] = useState(
    policy?.archiveDestination || ''
  );
  const [compressionEnabled, setCompressionEnabled] = useState(
    policy?.compressionEnabled || false
  );
  const [compressionThreshold, setCompressionThreshold] = useState(
    policy?.compressionThreshold || 30
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name,
        category,
        hotStorageDuration: daysToSeconds(hotDays),
        warmStorageDuration: daysToSeconds(warmDays),
        coldStorageDuration: daysToSeconds(coldDays),
        totalRetentionDuration: daysToSeconds(hotDays + warmDays + coldDays),
        regulatoryRequirement: regulatory,
        archiveEnabled,
        archiveDestination: archiveEnabled ? archiveDestination : undefined,
        compressionEnabled,
        compressionThreshold: compressionEnabled ? compressionThreshold : undefined,
        isActive: true,
      };

      if (policy) {
        await apiClient.patch(`/retention-policies/${policy._id}`, payload);
        toast.success('Policy updated successfully');
      } else {
        await apiClient.post('/retention-policies', payload);
        toast.success('Policy created successfully');
      }

      onSave();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save policy'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-slate-900 dark:text-white shadow-[var(--shadow-modal)]">
        <h2 className="mb-4 text-xl font-bold">
          {policy ? 'Edit Policy' : 'Create Policy'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Policy Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-gray-700"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as RetentionPolicy['category'])}
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-gray-700"
              disabled={!!policy}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hot Storage (days)</label>
              <input
                type="number"
                value={hotDays}
                onChange={(e) => setHotDays(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-gray-700"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Warm Storage (days)</label>
              <input
                type="number"
                value={warmDays}
                onChange={(e) => setWarmDays(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-gray-700"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cold Storage (days)</label>
              <input
                type="number"
                value={coldDays}
                onChange={(e) => setColdDays(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-gray-700"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Regulatory Requirement</label>
            <input
              type="text"
              value={regulatory}
              onChange={(e) => setRegulatory(e.target.value)}
              placeholder="e.g., EPA 40 CFR Part 141"
              className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-gray-700"
            />
          </div>

          <div className="border-t pt-4 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="archive"
                checked={archiveEnabled}
                onChange={(e) => setArchiveEnabled(e.target.checked)}
              />
              <label htmlFor="archive" className="text-sm font-medium">
                Enable Archive
              </label>
            </div>
            {archiveEnabled && (
              <input
                type="text"
                value={archiveDestination}
                onChange={(e) => setArchiveDestination(e.target.value)}
                placeholder="Archive destination (S3, etc.)"
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-gray-700 mb-3"
              />
            )}

            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="compression"
                checked={compressionEnabled}
                onChange={(e) => setCompressionEnabled(e.target.checked)}
              />
              <label htmlFor="compression" className="text-sm font-medium">
                Enable Compression
              </label>
            </div>
            {compressionEnabled && (
              <input
                type="number"
                value={compressionThreshold}
                onChange={(e) => setCompressionThreshold(Number(e.target.value))}
                placeholder="Compress after (days)"
                className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-gray-700"
                min="1"
              />
            )}
          </div>

          <div className="flex gap-3 justify-end">
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
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  policy,
  onClose,
  onDelete,
}: {
  policy: RetentionPolicy;
  onClose: () => void;
  onDelete: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== policy.name) {
      toast.error('Policy name does not match');
      return;
    }

    setLoading(true);
    try {
      await apiClient.delete(`/retention-policies/${policy._id}`);
      toast.success('Policy deleted successfully');
      onDelete();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-slate-900 dark:text-white shadow-[var(--shadow-modal)]">
        <h2 className="mb-4 text-xl font-bold text-red-600">Delete Policy</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          This action cannot be undone. Type the policy name to confirm.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={`Type: ${policy.name}`}
          className="w-full px-3 py-2 border rounded-lg mb-4 dark:bg-slate-800 dark:border-gray-700"
        />
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={confirmText !== policy.name || loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RetentionPoliciesContent() {
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  // --- Redux state: fetched data ---
  const policies = useAppSelector(selectPolicies);
  const stats = useAppSelector(selectPolicyStats);
  const policyStatus = useAppSelector(selectPolicyStatus);
  const loading = policyStatus === 'loading' || policyStatus === 'idle';

  // --- Local state: transient UI ---
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<RetentionPolicy | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isSuperAdmin = user?.role === 'SuperAdmin';

  const refreshData = () => {
    dispatch(fetchPolicies());
    dispatch(fetchStats());
  };

  useEffect(() => {
    dispatch(fetchPolicyData());
  }, [dispatch]);

  const filteredPolicies = selectedCategory
    ? policies.filter((p) => p.category === selectedCategory)
    : policies;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Retention Policies
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            EPA-compliant data retention tiers and archival policies
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={() => {
              setEditingPolicy(null);
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Policy
          </button>
        )}
      </div>

      {/* Category Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.category}
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-slate-900 dark:text-white"
            >
              <h3 className="font-semibold text-sm mb-3">{stat.label}</h3>
              <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <div>Hot: {stat.hotDays}d</div>
                <div>Warm: {stat.warmDays}d</div>
                <div>Cold: {stat.coldDays}d</div>
                <div className="pt-2 border-t dark:border-gray-700 font-semibold text-slate-900 dark:text-white">
                  Total: {stat.totalDays}d
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Policies Table */}
      {loading ? (
        <div className="text-center py-8">Loading policies...</div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-slate-900 overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold">All Policies</h2>
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-3 py-1 text-sm border rounded dark:bg-slate-800 dark:border-gray-700"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-slate-50 dark:border-gray-700 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Storage Tiers</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Regulatory</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  {isSuperAdmin && (
                    <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map((policy) => (
                  <tr
                    key={policy._id}
                    className="border-b border-gray-200 hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <td className="px-4 py-3 font-medium">{policy.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded dark:bg-indigo-900 dark:text-blue-200">
                        {CATEGORIES.find((c) => c.value === policy.category)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StorageTierBar policy={policy} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {policy.regulatoryRequirement || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          policy.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-slate-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300'
                        }`}
                      >
                        {policy.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingPolicy(policy)}
                            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeletingPolicy(policy)}
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
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal || editingPolicy ? (
        <CreateEditModal
          policy={editingPolicy || undefined}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPolicy(null);
          }}
          onSave={refreshData}
        />
      ) : null}

      {deletingPolicy && (
        <DeleteConfirmModal
          policy={deletingPolicy}
          onClose={() => setDeletingPolicy(null)}
          onDelete={refreshData}
        />
      )}
    </div>
  );
}

export default function RetentionPoliciesPage() {
  return (
    <>
      <div className="min-h-screen">
        <div className="mx-auto max-w-7xl">
          <RetentionPoliciesContent />
        </div>
      </div>
    </>
  );
}
