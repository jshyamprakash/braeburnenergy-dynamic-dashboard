'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

export interface WorkflowMetadata {
  name: string;
  description: string;
  tags: string[];
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isEnabled: boolean;
}

export interface SettingsModalProps {
  isOpen: boolean;
  workflowId: string | null;
  currentValues: WorkflowMetadata;
  onClose: () => void;
  onSave: (updatedValues: Partial<WorkflowMetadata>) => void;
}

export default function SettingsModal({
  isOpen,
  workflowId,
  currentValues,
  onClose,
  onSave,
}: SettingsModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Form state
  const [formValues, setFormValues] = useState(currentValues);

  // Initialize form from current values
  useEffect(() => {
    if (isOpen) {
      setFormValues(currentValues);
      setHasChanges(false);
    }
  }, [isOpen, currentValues]);

  // Handle input changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormValues((prev) => ({ ...prev, name: value }));
    setHasChanges(true);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormValues((prev) => ({ ...prev, description: value }));
    setHasChanges(true);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'HIGH' | 'MEDIUM' | 'LOW';
    setFormValues((prev) => ({ ...prev, priority: value }));
    setHasChanges(true);
  };

  const handleEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked;
    setFormValues((prev) => ({ ...prev, isEnabled: value }));
    setHasChanges(true);
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Parse comma-separated tags
    const tags = value.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0);
    setFormValues((prev) => ({ ...prev, tags }));
    setHasChanges(true);
  };

  // Validation
  const validateForm = (): string | null => {
    if (!formValues.name.trim()) {
      return 'Workflow name is required';
    }
    if (formValues.name.length > 100) {
      return 'Workflow name must be 100 characters or less';
    }
    if (formValues.description.length > 500) {
      return 'Description must be 500 characters or less';
    }
    if (formValues.tags.length > 50) {
      return 'Maximum 50 tags allowed';
    }
    for (const tag of formValues.tags) {
      if (tag.length > 100) {
        return 'Each tag must be 100 characters or less';
      }
    }
    return null;
  };

  // Handle save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    try {
      // Update workflow via API
      await apiClient.patch(`/workflows/${workflowId}`, {
        name: formValues.name,
        description: formValues.description,
        tags: formValues.tags,
        priority: formValues.priority,
        isEnabled: formValues.isEnabled,
      });

      toast.success('Workflow settings updated successfully');
      onSave(formValues);
      setHasChanges(false);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update workflow settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle close with unsaved changes warning
  const handleRequestClose = () => {
    if (hasChanges) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  };

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleRequestClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, hasChanges]);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleRequestClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Main Modal */}
      <div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={handleBackdropClick}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 sticky top-0 bg-white dark:bg-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Workflow Settings
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Edit workflow metadata and properties
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Workflow Name *
              </label>
              <input
                type="text"
                value={formValues.name}
                onChange={handleNameChange}
                placeholder="e.g., Temperature Alert Monitor"
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Required, 1-100 characters
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formValues.name.length}/100
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formValues.description}
                onChange={handleDescriptionChange}
                placeholder="Brief description of what this workflow does..."
                maxLength={500}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Optional, max 500 characters
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formValues.description.length}/500
                </p>
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                value={formValues.priority}
                onChange={handlePriorityChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="enabled"
                checked={formValues.isEnabled}
                onChange={handleEnabledChange}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label
                htmlFor="enabled"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Enable this workflow
              </label>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tags
              </label>
              <input
                type="text"
                value={formValues.tags.join(', ')}
                onChange={handleTagsChange}
                placeholder="e.g., temperature, alerts, critical"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Comma-separated tags for categorization (max 50 tags)
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={handleRequestClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 cursor-disabled"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || !hasChanges}
              className="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[51]"
          onClick={() => setShowUnsavedWarning(false)}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Unsaved Changes
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You have unsaved changes. Do you want to discard them?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowUnsavedWarning(false)}
                  className="px-4 py-2 rounded-lg font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Keep Editing
                </button>
                <button
                  onClick={() => {
                    setShowUnsavedWarning(false);
                    setHasChanges(false);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Discard Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
