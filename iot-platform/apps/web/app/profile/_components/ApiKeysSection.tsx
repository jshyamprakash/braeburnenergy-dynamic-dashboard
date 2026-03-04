'use client';

import { useState } from 'react';
import { Plus, Copy, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useApiKeys, useRevokeApiKey, useDeleteApiKey, useRotateApiKey } from '@/lib/hooks/useApiKeys';
import { CreateApiKeyModal } from './CreateApiKeyModal';
import { ApiKeyCreatedModal } from './ApiKeyCreatedModal';

export function ApiKeysSection() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [rotatedKey, setRotatedKey] = useState('');
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: apiKeys, isLoading } = useApiKeys();
  const revokeMutation = useRevokeApiKey();
  const deleteMutation = useDeleteApiKey();
  const rotateMutation = useRotateApiKey();

  const handleRevoke = async (id: string) => {
    try {
      await revokeMutation.mutateAsync(id);
      toast.success('API key revoked');
      setRevokeConfirm(null);
    } catch (error) {
      toast.error('Failed to revoke API key');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('API key deleted');
      setDeleteConfirm(null);
    } catch (error) {
      toast.error('Failed to delete API key');
    }
  };

  const handleRotate = async (id: string) => {
    try {
      const result = await rotateMutation.mutateAsync(id);
      setRotatedKey(result.key);
      setShowKeyModal(true);
      toast.success('API key rotated');
    } catch (error) {
      toast.error('Failed to rotate API key');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRelativeTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return formatDate(dateString);
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              API Keys
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Create and manage API keys for machine-to-machine authentication
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Key
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading API keys...</div>
          ) : !apiKeys || apiKeys.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No API keys yet. Create one to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Prefix
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Permissions
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Last Used
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Expires
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {apiKeys.map((key) => (
                    <tr
                      key={key.id}
                      className={`${
                        !key.isActive
                          ? 'bg-gray-50 dark:bg-gray-900 opacity-60'
                          : ''
                      } hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors`}
                    >
                      <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                        {key.name}
                      </td>
                      <td className="py-3 px-4">
                        <code
                          className={`text-xs px-2 py-1 rounded font-mono ${
                            key.prefix === 'iot_test_'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {key.prefix}
                        </code>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {key.permissions.length}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {getRelativeTime(key.lastUsedAt)}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                        {formatDate(key.expiresAt)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            key.isActive
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {key.isActive ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {key.isActive && (
                            <>
                              <button
                                onClick={() => handleRotate(key.id)}
                                disabled={rotateMutation.isPending}
                                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors disabled:opacity-50"
                                title="Rotate key"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setRevokeConfirm(key.id)}
                                className="p-2 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-lg transition-colors"
                                title="Revoke key"
                              >
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(key.id)}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                            title="Delete key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Revoke Confirmation Dialog */}
      {revokeConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-sm w-full shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Revoke API Key?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  This will deactivate the key. It will no longer work but the record will be kept for audit.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRevokeConfirm(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevoke(revokeConfirm)}
                disabled={revokeMutation.isPending}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {revokeMutation.isPending ? 'Revoking...' : 'Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-sm w-full shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Delete API Key?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  This action cannot be undone. The key will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateApiKeyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {showKeyModal && (
        <ApiKeyCreatedModal
          keyValue={rotatedKey}
          onClose={() => {
            setShowKeyModal(false);
            setRotatedKey('');
          }}
        />
      )}
    </>
  );
}
