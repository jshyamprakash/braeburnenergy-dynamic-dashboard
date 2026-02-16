'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { loadWorkflow, saveWorkflow, resetWorkflow, executeWorkflow } from '@/lib/store/slices/workflowSlice';
import WorkflowCanvas from '@/components/workflow/WorkflowCanvas';
import NodePalette from '@/components/workflow/NodePalette';
import NodeConfigPanel from '@/components/workflow/NodeConfigPanel';
import WorkflowToolbar from '@/components/workflow/WorkflowToolbar';
import ExecutionInputModal from '@/components/workflow/ExecutionInputModal';
import ValidationPanel from '@/components/workflow/ValidationPanel';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { exportWorkflowToJSON } from '@/lib/utils/workflow-export';
import { toast } from 'sonner';

/**
 * Workflow Builder Page
 *
 * Visual workflow editor with drag-and-drop canvas.
 * URL: /workflows/[workflowId] or /workflows/new
 */

function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    workflowId,
    name,
    description,
    tags,
    nodes,
    edges,
    isEnabled,
    priority,
    version,
    syncStatus,
    syncError,
    isDirty,
    validationErrors,
    currentExecutionId,
    executionStatus,
  } = useAppSelector(state => state.workflow);

  const [isSaving, setIsSaving] = useState(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [isValidationPanelOpen, setIsValidationPanelOpen] = useState(false);
  const isNewWorkflow = params.workflowId === 'new';

  // Load workflow on mount (if editing existing)
  useEffect(() => {
    if (!isNewWorkflow) {
      dispatch(loadWorkflow(params.workflowId as string));
    } else {
      dispatch(resetWorkflow());
    }

    // Cleanup on unmount
    return () => {
      dispatch(resetWorkflow());
    };
  }, [dispatch, params.workflowId, isNewWorkflow]);

  // Show toast on sync errors
  useEffect(() => {
    if (syncError) {
      toast.error(syncError);
    }
  }, [syncError]);

  // Handle save
  const handleSave = async () => {
    if (validationErrors.length > 0) {
      toast.error('Cannot save: Workflow has validation errors');
      return;
    }

    setIsSaving(true);
    try {
      const result = await dispatch(saveWorkflow()).unwrap() as { workflowId?: string };
      toast.success('Workflow saved successfully');

      // If new workflow, redirect to edit page
      if (isNewWorkflow && result.workflowId) {
        router.push(`/workflows/${result.workflowId}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle back to list
  const handleBack = () => {
    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        router.push('/workflows');
      }
    } else {
      router.push('/workflows');
    }
  };

  const handleRun = () => {
    setIsExecutionModalOpen(true);
  };

  const handleExecute = async (inputData: Record<string, any>) => {
    if (!workflowId) {
      toast.error('Workflow not saved yet');
      return;
    }

    try {
      const result = await dispatch(executeWorkflow({ workflowId, inputData })).unwrap();
      toast.success(`Workflow started: ${result.executionId}`, {
        description: 'Execution ID copied to clipboard',
      });
      setIsExecutionModalOpen(false);

      // Auto-clear execution status after 5 seconds
      setTimeout(() => {
        // Status will be updated by WebSocket in production
      }, 5000);
    } catch (error: any) {
      toast.error(error.message || 'Failed to execute workflow');
    }
  };

  const handleExport = () => {
    try {
      exportWorkflowToJSON({
        name,
        description,
        tags,
        nodes,
        edges,
        isEnabled,
        priority,
        version,
        workflowId: workflowId || undefined,
      });
      toast.success('Workflow exported successfully');
    } catch (error) {
      toast.error('Failed to export workflow');
    }
  };

  const handleSettings = () => {
    toast.info('Settings modal coming in Week 3.7');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Toolbar */}
      <WorkflowToolbar
        name={name}
        isDirty={isDirty}
        syncStatus={syncStatus}
        validationErrors={validationErrors}
        isSaving={isSaving}
        isExecuting={executionStatus === 'running'}
        executionId={currentExecutionId}
        onSave={handleSave}
        onBack={handleBack}
        onRun={handleRun}
        onExport={handleExport}
        onSettings={handleSettings}
        onValidation={() => setIsValidationPanelOpen(true)}
      />

      {/* Execution Input Modal */}
      <ExecutionInputModal
        isOpen={isExecutionModalOpen}
        isLoading={executionStatus === 'running'}
        workflowId={workflowId}
        onClose={() => setIsExecutionModalOpen(false)}
        onExecute={handleExecute}
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette (left sidebar) */}
        <NodePalette />

        {/* Canvas */}
        <div className="flex-1 relative">
          {syncStatus === 'loading' ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
              <div className="text-center">
                <svg
                  className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600"
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Loading workflow...</p>
              </div>
            </div>
          ) : (
            <WorkflowCanvas />
          )}
        </div>

        {/* Configuration panel (right sidebar) */}
        <NodeConfigPanel />
      </div>

      {/* Validation Panel (bottom drawer) */}
      <ValidationPanel
        isOpen={isValidationPanelOpen}
        onToggle={() => setIsValidationPanelOpen(!isValidationPanelOpen)}
      />
    </div>
  );
}

// Wrap with ProtectedRoute
export default function Page() {
  return (
    <ProtectedRoute>
      <WorkflowBuilderPage />
    </ProtectedRoute>
  );
}
