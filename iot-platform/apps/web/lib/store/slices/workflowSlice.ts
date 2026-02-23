import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { Node, Edge, Connection } from 'reactflow';
import type { WorkflowExecutionStepEvent, WorkflowExecutionCompletedEvent } from '@repo/types';
import { apiClient } from '@/lib/api-client';

/**
 * Workflow State Management (Redux Slice)
 *
 * Manages the state of the visual workflow editor:
 * - Current workflow metadata
 * - React Flow nodes and edges
 * - Editor state (selection, edit mode, validation)
 * - Sync status with backend
 */

// Workflow API response type
export interface Workflow {
  workflowId: string;
  name: string;
  type: 'Application' | 'Experience' | 'Embedded' | 'Edge';
  description?: string;
  tags: string[];
  nodes: Node[];
  edges: Edge[];
  isEnabled: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowState {
  // Current workflow
  workflowId: string | null;
  name: string;
  type: 'Application' | 'Experience' | 'Embedded' | 'Edge';
  description: string;
  tags: string[];
  isEnabled: boolean;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  version: number;

  // React Flow state
  nodes: Node[];
  edges: Edge[];

  // Editor state
  selectedNodeId: string | null;
  isEditMode: boolean;
  isDirty: boolean;

  // Sync state
  syncStatus: 'idle' | 'loading' | 'saving' | 'saved' | 'error';
  syncError: string | null;

  // Validation
  validationErrors: string[];

  // Execution
  currentExecutionId: string | null;
  executionStatus: 'idle' | 'running' | 'completed' | 'failed';

  // Execution streaming (real-time updates)
  executionLog: WorkflowExecutionStepEvent[];
  isStreaming: boolean;
  currentNodeId: string | null;
  executionError: string | null;

  // Execution history
  executionHistory: any[];
  executionHistoryTotal: number;
  executionHistoryLoading: boolean;

  // Debug panel
  isDebugPanelOpen: boolean;
}

const initialState: WorkflowState = {
  workflowId: null,
  name: 'Untitled Workflow',
  type: 'Application',
  description: '',
  tags: [],
  isEnabled: false,
  priority: 'MEDIUM',
  version: 1,

  nodes: [],
  edges: [],

  selectedNodeId: null,
  isEditMode: true,
  isDirty: false,

  syncStatus: 'idle',
  syncError: null,

  validationErrors: [],

  currentExecutionId: null,
  executionStatus: 'idle',

  executionLog: [],
  isStreaming: false,
  currentNodeId: null,
  executionError: null,

  executionHistory: [],
  executionHistoryTotal: 0,
  executionHistoryLoading: false,

  isDebugPanelOpen: false,
};

/**
 * Async Thunks
 */

// Load workflow from API
export const loadWorkflow = createAsyncThunk<Workflow, string>(
  'workflow/load',
  async (workflowId: string) => {
    const response = await apiClient.get<Workflow>(`/workflows/${workflowId}`);
    return response.data;
  }
);

// Helper: transform React Flow nodes to backend format
// React Flow nodes use visual type ('trigger') + data.nodeType for semantic type ('trigger:manual')
// Backend expects type='trigger:manual' and data without nodeType/executionStatus
function toBackendNodes(nodes: any[]) {
  return nodes.map(node => ({
    id: node.id,
    type: node.data?.nodeType || node.type, // Use semantic type if available
    position: node.position,
    data: {
      label: node.data?.label,
      description: node.data?.description,
      config: node.data?.config || {},
    },
  }));
}

// Save workflow to API (create or update)
export const saveWorkflow = createAsyncThunk<Workflow, void, { state: { workflow: WorkflowState } }>(
  'workflow/save',
  async (_, { getState }) => {
    const state = getState().workflow;

    const payload = {
      name: state.name,
      type: state.type,
      description: state.description,
      tags: state.tags,
      nodes: toBackendNodes(state.nodes),
      edges: state.edges,
      isEnabled: state.isEnabled,
      priority: state.priority,
    };

    if (state.workflowId) {
      // Update existing
      const response = await apiClient.patch<Workflow>(`/workflows/${state.workflowId}`, payload);
      return response.data;
    } else {
      // Create new
      const response = await apiClient.post<Workflow>('/workflows', payload);
      return response.data;
    }
  }
);

// Execute workflow
export const executeWorkflow = createAsyncThunk<{ executionId: string }, { workflowId: string; inputData?: any }>(
  'workflow/execute',
  async ({ workflowId, inputData }) => {
    const response = await apiClient.post<{ executionId: string }>(`/workflows/${workflowId}/execute`, {
      inputData: inputData || {},
    });
    return response.data;
  }
);

// Load execution history (paginated)
export const loadExecutionHistory = createAsyncThunk<
  { executions: any[]; total: number },
  { workflowId: string; limit?: number; offset?: number }
>(
  'workflow/loadExecutionHistory',
  async ({ workflowId, limit = 10, offset = 0 }) => {
    const response = await apiClient.get<{
      data: any[];
      pagination: { total: number };
    }>(`/workflows/${workflowId}/executions?limit=${limit}&offset=${offset}`);
    return {
      executions: response.data.data,
      total: response.data.pagination.total,
    };
  }
);

// Load single execution detail
export const loadExecutionDetail = createAsyncThunk<any, string>(
  'workflow/loadExecutionDetail',
  async (executionId: string) => {
    const response = await apiClient.get<any>(`/executions/${executionId}`);
    return response.data;
  }
);

// Auto-save workflow (1-second debounce)
let autoSaveTimeout: NodeJS.Timeout | null = null;

export const autoSaveWorkflow = createAsyncThunk<Workflow | null, void, { state: { workflow: WorkflowState } }>(
  'workflow/autoSave',
  async (_, { getState, dispatch }) => {
    const state = getState().workflow;

    // Only save if dirty
    if (!state.isDirty) {
      return null;
    }

    // Only save if workflow exists (don't auto-save new unsaved workflows)
    if (!state.workflowId) {
      return null;
    }

    const payload = {
      name: state.name,
      type: state.type,
      description: state.description,
      tags: state.tags,
      nodes: toBackendNodes(state.nodes),
      edges: state.edges,
      isEnabled: state.isEnabled,
      priority: state.priority,
    };

    try {
      const response = await apiClient.patch<Workflow>(`/workflows/${state.workflowId}`, payload);
      return response.data;
    } catch (error) {
      // Log error but don't fail - let manual save handle it
      console.error('Auto-save failed:', error);
      return null;
    }
  }
);

// Debounced auto-save trigger
export const triggerAutoSave = () => (dispatch: any) => {
  // Cancel previous save timeout
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout);
  }

  // Schedule new save after 1 second of inactivity
  autoSaveTimeout = setTimeout(() => {
    dispatch(autoSaveWorkflow());
    autoSaveTimeout = null;
  }, 1000);
};

/**
 * Workflow Slice
 */
export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    // Reset to initial state
    resetWorkflow: () => initialState,

    // Update metadata
    updateMetadata: (
      state,
      action: PayloadAction<{ name?: string; type?: 'Application' | 'Experience' | 'Embedded' | 'Edge'; description?: string; tags?: string[]; priority?: 'HIGH' | 'MEDIUM' | 'LOW'; isEnabled?: boolean }>
    ) => {
      if (action.payload.name !== undefined) state.name = action.payload.name;
      if (action.payload.type !== undefined) state.type = action.payload.type;
      if (action.payload.description !== undefined) state.description = action.payload.description;
      if (action.payload.tags !== undefined) state.tags = action.payload.tags;
      if (action.payload.priority !== undefined) state.priority = action.payload.priority;
      if (action.payload.isEnabled !== undefined) state.isEnabled = action.payload.isEnabled;
      state.isDirty = true;
    },

    // Update settings
    updateSettings: (
      state,
      action: PayloadAction<{ isEnabled?: boolean; priority?: 'HIGH' | 'MEDIUM' | 'LOW' }>
    ) => {
      if (action.payload.isEnabled !== undefined) state.isEnabled = action.payload.isEnabled;
      if (action.payload.priority !== undefined) state.priority = action.payload.priority;
      state.isDirty = true;
    },

    // Add node
    addNode: (state, action: PayloadAction<Node>) => {
      state.nodes.push(action.payload);
      state.isDirty = true;
    },

    // Remove node
    removeNode: (state, action: PayloadAction<string>) => {
      state.nodes = state.nodes.filter(n => n.id !== action.payload);
      // Remove connected edges
      state.edges = state.edges.filter(
        e => e.source !== action.payload && e.target !== action.payload
      );
      state.isDirty = true;
    },

    // Update node
    updateNode: (state, action: PayloadAction<{ id: string; data: any }>) => {
      const node = state.nodes.find(n => n.id === action.payload.id);
      if (node) {
        node.data = { ...node.data, ...action.payload.data };
        state.isDirty = true;
      }
    },

    // Set nodes (for React Flow onNodesChange)
    setNodes: (state, action: PayloadAction<Node[]>) => {
      state.nodes = action.payload;
      state.isDirty = true;
    },

    // Add edge
    addEdge: (state, action: PayloadAction<Edge | Connection>) => {
      const edge = action.payload as Edge;
      // Include source/target handle in ID to allow multiple edges between the same pair of nodes
      const handleSuffix = [edge.sourceHandle, edge.targetHandle].filter(Boolean).join('-');
      edge.id = `e-${edge.source}-${edge.target}${handleSuffix ? `-${handleSuffix}` : ''}`;
      // Deduplicate — don't add if same ID already exists
      if (!state.edges.some(e => e.id === edge.id)) {
        state.edges.push(edge);
        state.isDirty = true;
      }
    },

    // Remove edge
    removeEdge: (state, action: PayloadAction<string>) => {
      state.edges = state.edges.filter(e => e.id !== action.payload);
      state.isDirty = true;
    },

    // Set edges (for React Flow onEdgesChange)
    setEdges: (state, action: PayloadAction<Edge[]>) => {
      state.edges = action.payload;
      state.isDirty = true;
    },

    // Select node
    selectNode: (state, action: PayloadAction<string | null>) => {
      state.selectedNodeId = action.payload;
    },

    // Toggle edit mode
    toggleEditMode: state => {
      state.isEditMode = !state.isEditMode;
    },

    // Set validation errors
    setValidationErrors: (state, action: PayloadAction<string[]>) => {
      state.validationErrors = action.payload;
    },

    // Set execution status
    setExecutionStatus: (state, action: PayloadAction<'idle' | 'running' | 'completed' | 'failed'>) => {
      state.executionStatus = action.payload;
    },

    // Add execution log entry (per-node step)
    addExecutionLogEntry: (state, action: PayloadAction<WorkflowExecutionStepEvent>) => {
      state.executionLog.push(action.payload);
      state.currentNodeId = action.payload.nodeId;

      // Update node execution status
      const node = state.nodes.find(n => n.id === action.payload.nodeId);
      if (node) {
        node.data.executionStatus = action.payload.status;
      }
    },

    // Start execution stream
    startExecutionStream: (state, action: PayloadAction<string>) => {
      state.currentExecutionId = action.payload;
      state.isStreaming = true;
      state.executionLog = [];
      state.currentNodeId = null;
      state.executionError = null;
      state.executionStatus = 'running';
    },

    // Complete execution stream
    completeExecutionStream: (state, action: PayloadAction<{ status: 'completed' | 'failed'; error?: string }>) => {
      state.isStreaming = false;
      state.executionStatus = action.payload.status;
      state.executionError = action.payload.error || null;
    },

    // Clear execution log
    clearExecutionLog: state => {
      state.executionLog = [];
      state.currentNodeId = null;
      state.executionError = null;
      state.currentExecutionId = null;
      state.executionStatus = 'idle';

      // Reset all nodes' execution status to idle
      state.nodes.forEach(node => {
        node.data.executionStatus = 'idle';
      });
    },

    // Mark as saved
    markAsSaved: state => {
      state.isDirty = false;
      state.syncStatus = 'saved';
    },

    // Toggle debug panel
    toggleDebugPanel: state => {
      state.isDebugPanelOpen = !state.isDebugPanelOpen;
    },
  },
  extraReducers: builder => {
    // Load workflow
    builder.addCase(loadWorkflow.pending, state => {
      state.syncStatus = 'loading';
      state.syncError = null;
    });
    builder.addCase(loadWorkflow.fulfilled, (state, action) => {
      state.workflowId = action.payload.workflowId;
      state.name = action.payload.name;
      state.type = action.payload.type || 'Application';
      state.description = action.payload.description || '';
      state.tags = action.payload.tags || [];
      // Re-map backend nodes to React Flow format:
      // backend stores type='trigger:manual', React Flow renders by type='trigger'
      // Semantic type is stored in data.nodeType for the workflow engine
      state.nodes = (action.payload.nodes || []).map((node: any) => {
        const visualType = node.type.split(':')[0]; // 'trigger:manual' → 'trigger'
        return {
          ...node,
          type: visualType,
          data: { ...node.data, nodeType: node.type },
        };
      });
      state.edges = action.payload.edges || [];
      state.isEnabled = action.payload.isEnabled;
      state.priority = action.payload.priority;
      state.version = action.payload.version;
      state.isDirty = false;
      state.syncStatus = 'saved';
    });
    builder.addCase(loadWorkflow.rejected, (state, action) => {
      state.syncStatus = 'error';
      state.syncError = action.error.message || 'Failed to load workflow';
    });

    // Save workflow
    builder.addCase(saveWorkflow.pending, state => {
      state.syncStatus = 'saving';
      state.syncError = null;
    });
    builder.addCase(saveWorkflow.fulfilled, (state, action) => {
      state.workflowId = action.payload.workflowId;
      if (action.payload.name) state.name = action.payload.name;
      if (action.payload.type) state.type = action.payload.type;
      if (action.payload.description) state.description = action.payload.description;
      if (action.payload.tags) state.tags = action.payload.tags;
      if (action.payload.isEnabled !== undefined) state.isEnabled = action.payload.isEnabled;
      if (action.payload.priority) state.priority = action.payload.priority;
      if (action.payload.version) state.version = action.payload.version;
      state.isDirty = false;
      state.syncStatus = 'saved';
    });
    builder.addCase(saveWorkflow.rejected, (state, action) => {
      state.syncStatus = 'error';
      state.syncError = action.error.message || 'Failed to save workflow';
    });

    // Execute workflow
    builder.addCase(executeWorkflow.pending, state => {
      state.executionStatus = 'running';
      state.isStreaming = true;
      state.executionLog = [];
      state.executionError = null;
    });
    builder.addCase(executeWorkflow.fulfilled, (state, action) => {
      state.currentExecutionId = action.payload.executionId;
      state.executionStatus = 'running';
      state.isStreaming = true;
    });
    builder.addCase(executeWorkflow.rejected, (state, action) => {
      state.executionStatus = 'failed';
      state.isStreaming = false;
      state.executionError = action.error.message || 'Execution failed';
    });

    // Load execution history
    builder.addCase(loadExecutionHistory.pending, state => {
      state.executionHistoryLoading = true;
    });
    builder.addCase(loadExecutionHistory.fulfilled, (state, action) => {
      state.executionHistory = action.payload.executions;
      state.executionHistoryTotal = action.payload.total;
      state.executionHistoryLoading = false;
    });
    builder.addCase(loadExecutionHistory.rejected, state => {
      state.executionHistoryLoading = false;
    });

    // Load execution detail (repopulates live log)
    builder.addCase(loadExecutionDetail.pending, state => {
      state.isStreaming = false;
    });
    builder.addCase(loadExecutionDetail.fulfilled, (state, action) => {
      // Populate execution log from historical data
      state.executionLog = action.payload.executionLog || [];
      state.currentExecutionId = action.payload.executionId;
      state.executionStatus = action.payload.status;
      state.executionError = action.payload.error?.message || null;
    });

    // Auto-save workflow
    builder.addCase(autoSaveWorkflow.pending, state => {
      state.syncStatus = 'saving';
    });
    builder.addCase(autoSaveWorkflow.fulfilled, (state, action) => {
      if (action.payload) {
        state.isDirty = false;
        state.syncStatus = 'saved';
        state.version = action.payload.version;
      }
    });
    builder.addCase(autoSaveWorkflow.rejected, state => {
      // Don't fail auto-save - just mark as idle so next save can retry
      state.syncStatus = 'idle';
    });
  },
});

export const {
  resetWorkflow,
  updateMetadata,
  updateSettings,
  addNode,
  removeNode,
  updateNode,
  setNodes,
  addEdge,
  removeEdge,
  setEdges,
  selectNode,
  toggleEditMode,
  setValidationErrors,
  setExecutionStatus,
  addExecutionLogEntry,
  startExecutionStream,
  completeExecutionStream,
  clearExecutionLog,
  markAsSaved,
  toggleDebugPanel,
} = workflowSlice.actions;

export default workflowSlice.reducer;

/**
 * Default configurations for new node types (ADR-017).
 * Used by NodePalette and NodeConfigPanel to populate initial config.
 */
export const defaultNodeConfig: Record<string, Record<string, any>> = {
  'data:modbusRead': {
    label: 'Read Modbus Register',
    description: '',
    gatewayId: '',
    registerName: '',
    outputField: 'modbusData',
  },
  'data:modbusWrite': {
    label: 'Write Modbus Register',
    description: '',
    gatewayId: '',
    startAddress: 0,
    values: [],
  },
  'data:queryDeviceStates': {
    label: 'Query Device States',
    description: '',
    deviceId: '',
    startTime: '',
    endTime: '',
    limit: 100,
    outputField: 'deviceStates',
  },
  'logic:function': {
    label: 'Custom Function',
    description: '',
    code: 'result.output = data;',
    outputField: 'computed',
  },
};
