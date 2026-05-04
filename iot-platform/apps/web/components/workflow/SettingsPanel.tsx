'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { Workflow } from '@repo/types';

export interface SettingsPanelProps {
  workflow: Workflow | null;
  isDirty: boolean;
  onSave: (updates: Partial<Workflow>) => void;
  isSaving?: boolean;
}

interface FormData {
  name: string;
  type: 'Application' | 'Experience' | 'Embedded' | 'Edge';
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  isEnabled: boolean;
}

const INITIAL_FORM_STATE: FormData = {
  name: '',
  type: 'Application',
  description: '',
  priority: 'MEDIUM',
  isEnabled: false,
};

export default function SettingsPanel({
  workflow,
  isDirty,
  onSave,
  isSaving = false,
}: SettingsPanelProps) {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_STATE);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form from workflow
  useEffect(() => {
    if (workflow) {
      setFormData({
        name: workflow.name || '',
        type: workflow.type || 'Application',
        description: workflow.description || '',
        priority: workflow.priority || 'MEDIUM',
        isEnabled: workflow.isEnabled || false,
      });
      setHasChanges(false);
    }
  }, [workflow]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, name: e.target.value }));
    setHasChanges(true);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      type: e.target.value as 'Application' | 'Experience' | 'Embedded' | 'Edge',
    }));
    setHasChanges(true);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, description: e.target.value }));
    setHasChanges(true);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      priority: e.target.value as 'HIGH' | 'MEDIUM' | 'LOW',
    }));
    setHasChanges(true);
  };

  const handleEnabledChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, isEnabled: e.target.checked }));
    setHasChanges(true);
  };

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

  const handleSubmit = async () => {
    if (!workflow) return;

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    // Only send changed fields
    const updates: Partial<Workflow> = {};
    if (formData.name !== workflow.name) updates.name = formData.name;
    if (formData.type !== workflow.type) updates.type = formData.type;
    if (formData.description !== workflow.description) updates.description = formData.description;
    if (formData.priority !== workflow.priority) updates.priority = formData.priority;
    if (formData.isEnabled !== workflow.isEnabled) updates.isEnabled = formData.isEnabled;

    onSave(updates);
    setHasChanges(false);
  };

  if (!workflow) {
    return (
      <div className="w-64 bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 flex items-center justify-center h-full">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          No workflow selected
        </p>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Workflow Settings
        </h3>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name Field */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Workflow Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="Workflow name"
            maxLength={100}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {formData.name.length}/100
          </p>
        </div>

        {/* Type Dropdown */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Type *
          </label>
          <select
            value={formData.type}
            onChange={handleTypeChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="Application">Application</option>
            <option value="Experience">Experience</option>
            <option value="Embedded">Embedded</option>
            <option value="Edge">Edge</option>
          </select>
        </div>

        {/* Description Field */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={handleDescriptionChange}
            placeholder="Workflow description"
            maxLength={500}
            rows={3}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {formData.description.length}/500
          </p>
        </div>

        {/* Priority Dropdown */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Priority
          </label>
          <select
            value={formData.priority}
            onChange={handlePriorityChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>

        {/* Enabled Toggle */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.isEnabled}
            onChange={handleEnabledChange}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <label
            htmlFor="enabled"
            className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            Enable workflow
          </label>
        </div>
      </div>

      {/* Footer - Save Button */}
      <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSubmit}
          disabled={!hasChanges || isSaving}
          className="w-full px-3 py-2 rounded font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
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
            'Update'
          )}
        </button>
      </div>
    </div>
  );
}
