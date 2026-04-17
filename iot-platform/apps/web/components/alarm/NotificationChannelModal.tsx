'use client';

import { useState, useEffect } from 'react';
import type { NotificationChannel, CreateNotificationChannelBody, UpdateNotificationChannelBody, NotificationChannelType } from '@repo/types';
import { toast } from 'sonner';
import { X } from 'lucide-react';

interface NotificationChannelModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  channel?: NotificationChannel;
  onClose: () => void;
  onSubmit: (body: CreateNotificationChannelBody | UpdateNotificationChannelBody) => Promise<void>;
  isLoading?: boolean;
}

export function NotificationChannelModal({
  isOpen,
  mode,
  channel,
  onClose,
  onSubmit,
  isLoading = false,
}: NotificationChannelModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'email' as NotificationChannelType,
    isActive: true,
    config: {} as Record<string, any>,
  });

  useEffect(() => {
    if (mode === 'edit' && channel) {
      setFormData({
        name: channel.name,
        type: channel.type,
        isActive: channel.isActive,
        config: channel.config || {},
      });
    } else {
      setFormData({
        name: '',
        type: 'email',
        isActive: true,
        config: {},
      });
    }
  }, [mode, channel, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
      toast.success(mode === 'create' ? 'Channel created' : 'Channel updated');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save channel');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {mode === 'create' ? 'Create Notification Channel' : 'Edit Notification Channel'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  type: e.target.value as NotificationChannelType,
                  config: {}, // Reset config on type change
                });
              }}
              className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
            >
              <option value="email">Email</option>
              <option value="webhook">Webhook</option>
              <option value="in-app">In-App</option>
            </select>
          </div>

          {/* Type-specific config */}
          {formData.type === 'email' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Recipient Email(s)
              </label>
              <input
                type="text"
                placeholder="user@example.com or user1@example.com,user2@example.com"
                value={formData.config.to || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, to: e.target.value },
                  })
                }
                required
                className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Comma-separated email addresses
              </p>
            </div>
          )}

          {formData.type === 'webhook' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/webhook"
                  value={formData.config.url || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, url: e.target.value },
                    })
                  }
                  required
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Headers (JSON)
                </label>
                <textarea
                  placeholder='{"Authorization": "Bearer token"}'
                  value={
                    formData.config.headers
                      ? JSON.stringify(formData.config.headers, null, 2)
                      : ''
                  }
                  onChange={(e) => {
                    try {
                      const headers = e.target.value ? JSON.parse(e.target.value) : {};
                      setFormData({
                        ...formData,
                        config: { ...formData.config, headers },
                      });
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white font-mono text-sm"
                  rows={3}
                />
              </div>
            </>
          )}

          {formData.type === 'in-app' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              In-app notifications require no configuration
            </p>
          )}

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>

          {/* Submit */}
          <div className="pt-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
