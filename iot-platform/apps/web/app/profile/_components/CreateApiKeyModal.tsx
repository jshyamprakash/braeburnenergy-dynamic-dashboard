'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateApiKey } from '@/lib/hooks/useApiKeys';
import type { CreateApiKeyInput } from '@repo/types';
import { ApiKeyCreatedModal } from './ApiKeyCreatedModal';

interface CreateApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PERMISSION_GROUPS = {
  Device: [
    { value: 'device:read', label: 'Read' },
    { value: 'device:create', label: 'Create' },
    { value: 'device:update', label: 'Update' },
    { value: 'device:delete', label: 'Delete' },
  ],
  'Device State': [
    { value: 'device-state:read', label: 'Read' },
    { value: 'device-state:create', label: 'Create' },
    { value: 'device-state:export', label: 'Export' },
  ],
  Alarm: [
    { value: 'alarm:read', label: 'Read' },
    { value: 'alarm:create', label: 'Create' },
    { value: 'alarm:acknowledge', label: 'Acknowledge' },
  ],
  Workflow: [
    { value: 'workflow:read', label: 'Read' },
    { value: 'workflow:execute', label: 'Execute' },
  ],
  Application: [
    { value: 'application:read', label: 'Read' },
    { value: 'application:manage', label: 'Manage' },
  ],
};

export function CreateApiKeyModal({
  isOpen,
  onClose,
}: CreateApiKeyModalProps) {
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState<'iot_test_' | 'iot_live_'>('iot_test_');
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    'device:read',
    'device-state:read',
  ]);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [createdKey, setCreatedKey] = useState('');

  const createMutation = useCreateApiKey();

  const handlePermissionToggle = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    const data: CreateApiKeyInput = {
      name: name.trim(),
      prefix,
      permissions: selectedPermissions,
    };

    if (expiresAt) {
      data.expiresAt = new Date(expiresAt).toISOString();
    }

    try {
      const result = await createMutation.mutateAsync(data);
      setCreatedKey(result.key);
      setShowKeyModal(true);
    } catch (error) {
      toast.error('Failed to create API key');
    }
  };

  const handleClose = () => {
    setName('');
    setPrefix('iot_test_');
    setExpiresAt('');
    setSelectedPermissions(['device:read', 'device-state:read']);
    onClose();
  };

  const handleKeyModalClose = () => {
    setShowKeyModal(false);
    setCreatedKey('');
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-6 sticky top-0 bg-white dark:bg-gray-900 z-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Create API Key
            </h2>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Production Server, Mobile App"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Prefix */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prefix
              </label>
              <div className="flex gap-4">
                {(['iot_test_', 'iot_live_'] as const).map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="prefix"
                      value={p}
                      checked={prefix === p}
                      onChange={(e) =>
                        setPrefix(e.target.value as 'iot_test_' | 'iot_live_')
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {p === 'iot_test_' ? (
                        <>
                          <code className="bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded font-mono text-xs">
                            iot_test_
                          </code>
                          <span className="text-gray-500 text-xs ml-1">
                            (Development)
                          </span>
                        </>
                      ) : (
                        <>
                          <code className="bg-amber-100 dark:bg-amber-900 px-2 py-0.5 rounded font-mono text-xs">
                            iot_live_
                          </code>
                          <span className="text-gray-500 text-xs ml-1">
                            (Production)
                          </span>
                        </>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiration (Optional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave empty for no expiration
              </p>
            </div>

            {/* Permissions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Permissions
              </label>
              <div className="space-y-4">
                {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                  <div key={group}>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      {group}
                    </h4>
                    <div className="space-y-2 pl-4">
                      {perms.map((perm) => (
                        <label
                          key={perm.value}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(perm.value)}
                            onChange={() => handlePermissionToggle(perm.value)}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {perm.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-900 z-10">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium"
              disabled={createMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={createMutation.isPending || !name.trim()}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Key'}
            </button>
          </div>
        </div>
      </div>

      {/* Key Created Modal */}
      {showKeyModal && (
        <ApiKeyCreatedModal
          keyValue={createdKey}
          onClose={handleKeyModalClose}
        />
      )}
    </>
  );
}
