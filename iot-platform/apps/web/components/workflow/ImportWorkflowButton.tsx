'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { importWorkflowFromFile, formatFileSize } from '@/lib/utils/workflow-export';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface ImportWorkflowButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
}

export default function ImportWorkflowButton({
  variant = 'primary',
  size = 'md',
}: ImportWorkflowButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      toast.error('Invalid file type. Please upload a .json file.');
      resetFileInput();
      return;
    }

    // Validate file size (max 5MB for safety)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is ${formatFileSize(maxSize)}.`);
      resetFileInput();
      return;
    }

    setIsLoading(true);
    try {
      // Import and validate workflow from file
      const workflowData = await importWorkflowFromFile(file);

      // Create workflow via API
      const response = await apiClient.post<{ workflowId: string }>(
        '/workflows',
        {
          name: workflowData.name,
          description: workflowData.description,
          tags: workflowData.tags || [],
          nodes: workflowData.nodes,
          edges: workflowData.edges,
          isEnabled: workflowData.isEnabled ?? false,
          priority: workflowData.priority || 'MEDIUM',
        }
      );

      // Load the newly created workflow into editor
      const createdWorkflowId = response.data?.workflowId;
      if (createdWorkflowId) {
        toast.success('Workflow imported successfully');
        router.push(`/workflows/${createdWorkflowId}`);
      } else {
        throw new Error('Failed to get workflow ID from response');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to import workflow';
      toast.error(errorMessage);
      console.error('Import error:', error);
    } finally {
      setIsLoading(false);
      resetFileInput();
    }
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Size and variant styles
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const variantClasses = {
    primary:
      'bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-gray-300 dark:disabled:bg-gray-600',
    secondary:
      'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600',
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={isLoading}
      />

      {/* Styled button */}
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          rounded-lg font-medium transition-all duration-200 flex items-center gap-2
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${isLoading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}
        `}
        title="Import workflow from JSON file"
      >
        {isLoading ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
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
            Importing...
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Import Workflow
          </>
        )}
      </button>
    </>
  );
}
