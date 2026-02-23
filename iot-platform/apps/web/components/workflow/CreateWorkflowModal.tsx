'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { Workflow } from '@repo/types';

export type WorkflowType = 'Application' | 'Experience' | 'Embedded' | 'Edge';

export interface CreateWorkflowModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  workflowData?: Partial<Workflow> | null;
  onClose: () => void;
  onSuccess: (workflow: Workflow) => void;
  applicationId?: string; // ADR-024: Application context from route
}

interface FormData {
  name: string;
  type: WorkflowType;
  description: string;
}

const INITIAL_FORM_STATE: FormData = {
  name: '',
  type: 'Application',
  description: '',
};

export default function CreateWorkflowModal({
  isOpen,
  mode,
  workflowData,
  onClose,
  onSuccess,
  applicationId,
}: CreateWorkflowModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_STATE);

  // Initialize form from workflow data (for edit mode)
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && workflowData) {
        setFormData({
          name: workflowData.name || '',
          type: (workflowData.type as WorkflowType) || 'Application',
          description: workflowData.description || '',
        });
      } else {
        setFormData(INITIAL_FORM_STATE);
      }
      setHasChanges(false);
    }
  }, [isOpen, mode, workflowData]);

  // Handle input changes
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, name: e.target.value }));
    setHasChanges(true);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, type: e.target.value as WorkflowType }));
    setHasChanges(true);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, description: e.target.value }));
    setHasChanges(true);
  };

  // Validation
  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Workflow name is required';
    }
    if (formData.name.length > 100) {
      return 'Workflow name must be 100 characters or less';
    }
    if (formData.description.length > 500) {
      return 'Description must be 500 characters or less';
    }
    return null;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSaving(true);
    try {
      let response;
      if (mode === 'create') {
        // Create new workflow with minimal node (trigger)
        const createPayload: any = {
          name: formData.name,
          type: formData.type,
          description: formData.description,
          nodes: [
            {
              id: '1',
              type: 'trigger:manual',
              position: { x: 0, y: 0 },
              data: {
                label: 'Manual Trigger',
                config: {},
              },
            },
          ],
          edges: [],
          isEnabled: false,
          ...(applicationId && { applicationId }), // ADR-024: Application context from props
        };
        response = await apiClient.post<Workflow>('/workflows', createPayload);
        toast.success('Workflow created successfully');
      } else if (mode === 'edit' && workflowData?.workflowId) {
        // Update existing workflow
        const updatePayload: any = {
          name: formData.name,
          type: formData.type,
          description: formData.description,
          ...(applicationId && { applicationId }), // ADR-024: Application context from props
        };
        response = await apiClient.patch<Workflow>(
          `/workflows/${workflowData.workflowId}`,
          updatePayload
        );
        toast.success('Workflow updated successfully');
      } else {
        throw new Error('Invalid mode or workflow ID');
      }

      onSuccess(response.data);
      setHasChanges(false);
      onClose();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${mode === 'create' ? 'create' : 'update'} workflow`);
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

  const isEditMode = mode === 'edit';
  const modalTitle = isEditMode ? 'Edit Workflow' : 'Create New Workflow';
  const modalDescription = isEditMode
    ? 'Update workflow name, type, and description'
    : 'Create a new workflow with basic settings';
  const submitButtonText = isEditMode ? 'Update Workflow' : 'Create Workflow';

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
              {modalTitle}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {modalDescription}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Workflow Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                placeholder="e.g., Temperature Monitor"
                maxLength={100}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Required, 1-100 characters
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formData.name.length}/100
                </p>
              </div>
            </div>

            {/* Type Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Workflow Type *
              </label>
              <select
                value={formData.type}
                onChange={handleTypeChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Application">Application</option>
                <option value="Experience">Experience</option>
                <option value="Embedded">Embedded</option>
                <option value="Edge">Edge</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Choose the deployment target or use case for this workflow
              </p>
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
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
                  {formData.description.length}/500
                </p>
              </div>
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
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                submitButtonText
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
