'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { loadWorkflow, saveWorkflow, resetWorkflow, executeWorkflow, removeNode, addExecutionLogEntry, completeExecutionStream, clearExecutionLog, setNodes, setEdges, updateMetadata, addNode, selectNode, toggleDebugPanel } from '@/lib/store/slices/workflowSlice';
import { useWorkflowExecutionUpdates } from '@/lib/hooks/useWebSocket';
import WorkflowCanvas from '@/components/workflow/WorkflowCanvas';
import NodePalette from '@/components/workflow/NodePalette';
import NodeConfigPanel from '@/components/workflow/NodeConfigPanel';
import SettingsPanel from '@/components/workflow/SettingsPanel';
import WorkflowToolbar from '@/components/workflow/WorkflowToolbar';
import ExecutionInputModal from '@/components/workflow/ExecutionInputModal';
import ExecutionHistoryModal from '@/components/workflow/ExecutionHistoryModal';
import ValidationPanel from '@/components/workflow/ValidationPanel';
import KeyboardShortcutsHelp from '@/components/workflow/KeyboardShortcutsHelp';
import ContextDebugPanel from '@/components/workflow/ContextDebugPanel';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useWorkflowKeyboardShortcuts } from '@/hooks/useWorkflowKeyboardShortcuts';
import { exportWorkflowToJSON } from '@/lib/utils/workflow-export';
import { toast } from 'sonner';
import NodeContextMenu from '@/components/workflow/NodeContextMenu';
import { ReactFlowProvider } from 'reactflow';
import { ulid } from 'ulid';
import type { Workflow } from '@repo/types';

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
    type,
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
    selectedNodeId,
    isDebugPanelOpen,
    executionLog,
  } = useAppSelector(state => state.workflow);

  const [isSaving, setIsSaving] = useState(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [isExecutionHistoryModalOpen, setIsExecutionHistoryModalOpen] = useState(false);
  const [isValidationPanelOpen, setIsValidationPanelOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string; nodeData: any } | null>(null);
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

  // Load pending template on mount
  // Use setTimeout(0) to defer past React 18 StrictMode's synchronous cleanup/remount cycle.
  // Without the defer: effect sets nodes → cleanup runs resetWorkflow() (clears nodes) →
  // remount effect finds sessionStorage already cleared → canvas stays empty.
  useEffect(() => {
    if (!isNewWorkflow) return; // Only for new workflows

    const pendingTemplate = sessionStorage.getItem('pendingTemplate');
    if (!pendingTemplate) return;

    const timer = setTimeout(() => {
      try {
        const template = JSON.parse(pendingTemplate);
        dispatch(setNodes(template.nodes || []));
        dispatch(setEdges(template.edges || []));
        if (template.name) {
          dispatch(updateMetadata({ name: template.name }));
        }
        sessionStorage.removeItem('pendingTemplate');
      } catch (err) {
        console.error('Failed to load template:', err);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [dispatch, isNewWorkflow]);

  // Show toast on sync errors
  useEffect(() => {
    if (syncError) {
      toast.error(syncError);
    }
  }, [syncError]);

  // Subscribe to workflow execution updates
  useWorkflowExecutionUpdates(
    workflowId, // Only subscribe when we have a workflow ID
    // Handle step updates
    (step) => {
      dispatch(addExecutionLogEntry(step));
    },
    // Handle completion
    (completion) => {
      dispatch(completeExecutionStream({
        status: completion.status,
        error: completion.error?.message,
      }));
    }
  );

  // Clear execution on unmount
  useEffect(() => {
    return () => {
      dispatch(clearExecutionLog());
    };
  }, [dispatch]);

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

  // Handle delete selected node
  const handleDeleteNode = () => {
    if (selectedNodeId) {
      const node = nodes.find(n => n.id === selectedNodeId);
      if (node) {
        dispatch(removeNode(selectedNodeId));
        toast.success(`Deleted node: ${node.data.label || selectedNodeId}`);
      }
    }
  };

  const handleNodeContextMenu = (event: React.MouseEvent, node: any) => {
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
      nodeData: node.data,
    });
  };

  const handleDuplicateNode = (nodeId: string) => {
    const nodeToClone = nodes.find(n => n.id === nodeId);
    if (!nodeToClone) return;
    const newNode = {
      ...nodeToClone,
      id: ulid(),
      position: {
        x: nodeToClone.position.x + 50,
        y: nodeToClone.position.y + 50,
      },
    };
    dispatch(addNode(newNode));
    toast.success('Node duplicated');
  };

  const handleDeleteContextNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      dispatch(removeNode(nodeId));
      toast.success(`Deleted node: ${node.data.label || nodeId}`);
    }
  };

  const handleConfigureNode = (nodeId: string) => {
    dispatch(selectNode(nodeId));
  };

  // Setup keyboard shortcuts
  useWorkflowKeyboardShortcuts({
    onSave: handleSave,
    onRun: handleRun,  // For keyboard shortcuts (Ctrl+R)
    onExport: handleExport,
    onDelete: handleDeleteNode,
    onShowHelp: () => setIsHelpOpen(true),
  });

  return (
    <ReactFlowProvider>
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
        isDebugPanelOpen={isDebugPanelOpen}
        onSave={handleSave}
        onBack={handleBack}
        onDeploy={handleRun}
        onExport={handleExport}
        onExecutionHistory={() => setIsExecutionHistoryModalOpen(true)}
        onValidation={() => setIsValidationPanelOpen(true)}
        onShowHelp={() => setIsHelpOpen(true)}
        onDebugToggle={() => dispatch(toggleDebugPanel())}
      />

      {/* Execution Input Modal */}
      <ExecutionInputModal
        isOpen={isExecutionModalOpen}
        isLoading={executionStatus === 'running'}
        workflowId={workflowId}
        onClose={() => setIsExecutionModalOpen(false)}
        onExecute={handleExecute}
      />

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      {/* Execution History Modal */}
      <ExecutionHistoryModal
        isOpen={isExecutionHistoryModalOpen}
        onClose={() => setIsExecutionHistoryModalOpen(false)}
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
            <WorkflowCanvas onNodeContextMenu={handleNodeContextMenu} />
          )}
        </div>

        {/* Right panel: Settings or Node Config */}
        {selectedNodeId ? (
          <NodeConfigPanel />
        ) : (
          <SettingsPanel
            workflow={{
              workflowId: workflowId || '',
              name,
              type,
              description: description || '',
              tags: tags || [],
              nodes: nodes as any,
              edges: edges as any,
              isEnabled: isEnabled || false,
              priority: priority || 'MEDIUM',
              maxConcurrentExecutions: 1,
              timeoutSeconds: 300,
              executionCount: 0,
              version: version || 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            }}
            isDirty={isDirty}
            onSave={(updates) => {
              dispatch(updateMetadata(updates));
              toast.success('Settings updated');
            }}
            isSaving={isSaving}
          />
        )}
      </div>

      {/* Validation Panel (bottom drawer) */}
      <ValidationPanel
        isOpen={isValidationPanelOpen}
        onToggle={() => setIsValidationPanelOpen(!isValidationPanelOpen)}
      />

      {/* Context Menu */}
      {contextMenu && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          nodeData={contextMenu.nodeData}
          executionStatus={nodes.find(n => n.id === contextMenu.nodeId)?.data?.executionStatus}
          onClose={() => setContextMenu(null)}
          onConfigure={handleConfigureNode}
          onDuplicate={handleDuplicateNode}
          onDelete={handleDeleteContextNode}
        />
      )}

      {/* Context Debug Panel */}
      <ContextDebugPanel
        isOpen={isDebugPanelOpen}
        onClose={() => dispatch(toggleDebugPanel())}
        executionLog={executionLog}
        executionStatus={executionStatus}
        nodes={nodes}
      />
    </div>
    </ReactFlowProvider>
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
