'use client';

import { useState, useCallback } from 'react';
import { Plus, Upload, Edit2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import CreateWorkflowModal from '@/components/workflow/CreateWorkflowModal';
import { BulkImportModal } from '@/components/workflow/BulkImportModal';
import { toast } from 'sonner';
import { PREREQ_TOOLTIPS } from '@/lib/constants/ui-messages';
import type { Workflow } from '@repo/types';

interface WorkflowsTabProps {
  applicationId: string;
  workflows: Workflow[];
  deviceCount: number;
  onRefresh: () => Promise<void>;
}

export function WorkflowsTab({
  applicationId,
  workflows,
  deviceCount,
  onRefresh,
}: WorkflowsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [deletingWorkflowId, setDeletingWorkflowId] = useState<string | null>(null);

  const handleDelete = useCallback(
    async (workflowId: string) => {
      try {
        await apiClient.delete(`/workflows/${workflowId}`);
        toast.success('Workflow deleted');
        setDeletingWorkflowId(null);
        await onRefresh();
      } catch (error: any) {
        toast.error(error.message || 'Failed to delete workflow');
      }
    },
    [onRefresh]
  );

  const handleSuccess = useCallback(async () => {
    setIsModalOpen(false);
    await onRefresh();
  }, [onRefresh]);

  function formatDate(dateString: string | Date): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setIsBulkImportOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-slate-300"
        >
          <Upload className="h-4 w-4" />
          Import
        </button>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={deviceCount === 0}
          title={deviceCount === 0 ? PREREQ_TOOLTIPS.NO_DEVICE_FOR_WORKFLOW : ''}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            deviceCount === 0
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-60'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <Plus className="h-4 w-4" />
          Add Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-12 border rounded-lg border-slate-200 dark:border-slate-700">
          <p className="text-gray-600 dark:text-slate-400">No workflows in this application</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((workflow) => (
                <tr
                  key={workflow.workflowId}
                  className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-gray-800"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/workflows/${workflow.workflowId}`}
                      className="text-indigo-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      {workflow.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="inline-block px-2 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800">
                      {workflow.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {workflow.isEnabled ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">Enabled</span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">Disabled</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                    {workflow.createdAt ? formatDate(workflow.createdAt) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/workflows/${workflow.workflowId}`}
                        className="text-indigo-600 hover:text-blue-700 dark:text-blue-400"
                        title="Edit Canvas"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setDeletingWorkflowId(workflow.workflowId)}
                        className="text-rose-600 hover:text-red-700 dark:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <CreateWorkflowModal
        isOpen={isModalOpen}
        mode="create"
        applicationId={applicationId}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={handleSuccess}
        applicationId={applicationId}
        existingWorkflows={workflows}
      />

      {/* Delete Confirmation Modal */}
      {deletingWorkflowId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 dark:bg-slate-900 dark:text-white shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-rose-600">Delete Workflow</h2>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              Are you sure? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingWorkflowId(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-slate-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingWorkflowId)}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
