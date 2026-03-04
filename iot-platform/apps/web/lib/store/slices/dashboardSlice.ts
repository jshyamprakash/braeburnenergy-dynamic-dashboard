import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { dashboardConfig } from '@/lib/config';
import { apiClient } from '@/lib/api-client';

/**
 * Layout interface (react-grid-layout)
 */
export interface Layout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  static?: boolean;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
}

/**
 * Responsive layouts
 */
export type Layouts = { [breakpoint: string]: Layout[] };

/**
 * Dashboard block interface
 */
export interface DashboardBlock {
  id: string;
  type: 'gauge' | 'chart' | 'liveStream' | 'activeAlarms' | 'statusText';
  layouts: {
    lg: Layout;
    md: Layout;
    sm: Layout;
  };
  config: {
    title?: string;
    deviceId?: string;
    fields?: string[];
    chartType?: 'line' | 'area' | 'bar';
    gaugeConfig?: {
      min?: number;
      max?: number;
      unit?: string;
      warningThreshold?: number;
      criticalThreshold?: number;
    };
    [key: string]: any;
  };
}

/**
 * Dashboard state interface
 */
export interface DashboardState {
  dashboardId: string;
  applicationId: string;
  name: string;
  description: string;
  blocks: DashboardBlock[];
  layouts: Layouts;
  isEditMode: boolean;
  selectedBlockId: string | null;
  isDirty: boolean;
  lastSaved: number | null;
  // Sync state
  syncStatus: 'idle' | 'loading' | 'syncing' | 'synced' | 'error';
  syncError: string | null;
  isOnline: boolean;
}

/**
 * Load dashboard from localStorage
 */
function loadDashboardFromStorage(dashboardId: string): Partial<DashboardState> {
  if (typeof window === 'undefined') return {};

  try {
    const key = `${dashboardConfig.storageKey}_${dashboardId}`;
    const saved = localStorage.getItem(key);

    if (saved) {
      const data = JSON.parse(saved);
      return {
        blocks: data.blocks || [],
        layouts: data.layouts || {},
        lastSaved: data.timestamp || null,
      };
    }
  } catch (error) {
    console.error('Failed to load dashboard from storage:', error);
  }

  return {};
}

/**
 * Save dashboard to localStorage
 */
function saveDashboardToStorage(state: DashboardState) {
  if (typeof window === 'undefined') return;

  try {
    const key = `${dashboardConfig.storageKey}_${state.dashboardId}`;
    const data = {
      blocks: state.blocks,
      layouts: state.layouts,
      timestamp: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save dashboard to storage:', error);
  }
}

/**
 * Async Thunk: Load dashboard from backend
 */
export const loadDashboardFromBackend = createAsyncThunk(
  'dashboard/loadFromBackend',
  async ({ dashboardId, applicationId }: { dashboardId: string; applicationId: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.get<any>(
        `/dashboards/${dashboardId}?applicationId=${applicationId}`
      );
      return response.data ?? null;
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      return rejectWithValue(error?.message || 'Failed to load dashboard from backend');
    }
  }
);

/**
 * Async Thunk: Save dashboard to backend
 */
export const saveDashboardToBackend = createAsyncThunk(
  'dashboard/saveToBackend',
  async (
    payload: {
      dashboardId: string;
      applicationId: string;
      name: string;
      description: string;
      blocks: DashboardBlock[];
      layouts: Layouts;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await apiClient.post<any>('/dashboards', payload);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to save dashboard to backend');
    }
  }
);

/**
 * Async Thunk: Sync dashboard with backend (hybrid mode)
 * 1. Save to localStorage first (fast, offline-safe)
 * 2. Then sync to backend if online
 */
export const syncDashboardWithBackend = createAsyncThunk(
  'dashboard/syncWithBackend',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const state = getState() as { dashboard: DashboardState };
    const dashboard = state.dashboard;

    // Step 1: Save to localStorage first (always works, even offline)
    saveDashboardToStorage(dashboard);

    // Step 2: If online, sync to backend
    if (!dashboard.isOnline) {
      return { synced: false, reason: 'offline' };
    }

    try {
      const result = await dispatch(
        saveDashboardToBackend({
          dashboardId: dashboard.dashboardId,
          applicationId: dashboard.applicationId,
          name: dashboard.name,
          description: dashboard.description,
          blocks: dashboard.blocks,
          layouts: dashboard.layouts,
        })
      ).unwrap();

      return { synced: true, data: result };
    } catch (error: any) {
      // Even if backend fails, localStorage save succeeded
      return rejectWithValue({
        synced: false,
        reason: 'backend-error',
        error: error.message,
      });
    }
  }
);

/**
 * Initial state
 */
const initialState: DashboardState = {
  dashboardId: 'default',
  applicationId: '',
  name: 'My Dashboard',
  description: '',
  blocks: [],
  layouts: {},
  isEditMode: false,
  selectedBlockId: null,
  isDirty: false,
  lastSaved: null,
  syncStatus: 'idle',
  syncError: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
};

/**
 * Dashboard slice
 */
const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    /**
     * Initialize dashboard (synchronous - loads from localStorage immediately)
     * Use loadDashboardFromBackend async thunk for backend sync
     */
    initializeDashboard: (state, action: PayloadAction<string>) => {
      state.dashboardId = action.payload;
      const saved = loadDashboardFromStorage(action.payload);
      state.blocks = saved.blocks || [];
      state.layouts = saved.layouts || {};
      state.lastSaved = saved.lastSaved || null;
      state.isDirty = false;
      state.syncStatus = 'idle';
    },

    /**
     * Add block
     */
    addBlock: (state, action: PayloadAction<DashboardBlock>) => {
      if (state.blocks.length >= dashboardConfig.maxBlocks) {
        console.warn(`Maximum blocks (${dashboardConfig.maxBlocks}) reached`);
        return;
      }

      state.blocks.push(action.payload);
      state.isDirty = true;
    },

    /**
     * Remove block
     */
    removeBlock: (state, action: PayloadAction<string>) => {
      state.blocks = state.blocks.filter((block) => block.id !== action.payload);

      // Remove from layouts
      Object.keys(state.layouts).forEach((breakpoint) => {
        state.layouts[breakpoint] = state.layouts[breakpoint].filter(
          (layout) => layout.i !== action.payload
        );
      });

      // Clear selection if removed block was selected
      if (state.selectedBlockId === action.payload) {
        state.selectedBlockId = null;
      }

      state.isDirty = true;
    },

    /**
     * Update block config
     */
    updateBlockConfig: (
      state,
      action: PayloadAction<{ id: string; config: Partial<DashboardBlock['config']> }>
    ) => {
      const block = state.blocks.find((b) => b.id === action.payload.id);
      if (block) {
        block.config = { ...block.config, ...action.payload.config };
        state.isDirty = true;
      }
    },

    /**
     * Update layouts (react-grid-layout onChange)
     */
    updateLayouts: (state, action: PayloadAction<Layouts>) => {
      state.layouts = action.payload;

      // Update block layouts
      Object.keys(action.payload).forEach((breakpoint) => {
        action.payload[breakpoint].forEach((layout) => {
          const block = state.blocks.find((b) => b.id === layout.i);
          if (block && block.layouts[breakpoint as 'lg' | 'md' | 'sm']) {
            block.layouts[breakpoint as 'lg' | 'md' | 'sm'] = layout;
          }
        });
      });

      state.isDirty = true;
    },

    /**
     * Set edit mode
     */
    setEditMode: (state, action: PayloadAction<boolean>) => {
      state.isEditMode = action.payload;

      // Clear selection when exiting edit mode
      if (!action.payload) {
        state.selectedBlockId = null;
      }
    },

    /**
     * Toggle edit mode
     */
    toggleEditMode: (state) => {
      state.isEditMode = !state.isEditMode;

      if (!state.isEditMode) {
        state.selectedBlockId = null;
      }
    },

    /**
     * Select block
     */
    selectBlock: (state, action: PayloadAction<string | null>) => {
      state.selectedBlockId = action.payload;
    },

    /**
     * Save dashboard (synchronous - saves to localStorage only)
     * Use syncDashboardWithBackend async thunk for backend sync
     */
    saveDashboard: (state) => {
      saveDashboardToStorage(state);
      state.lastSaved = Date.now();
      state.isDirty = false;
    },

    /**
     * Set online status
     */
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },

    /**
     * Update dashboard metadata
     */
    updateDashboardMetadata: (
      state,
      action: PayloadAction<{ name?: string; description?: string; applicationId?: string }>
    ) => {
      if (action.payload.name !== undefined) state.name = action.payload.name;
      if (action.payload.description !== undefined) state.description = action.payload.description;
      if (action.payload.applicationId !== undefined) state.applicationId = action.payload.applicationId;
      state.isDirty = true;
    },

    /**
     * Reset dashboard (clear all blocks)
     */
    resetDashboard: (state) => {
      state.blocks = [];
      state.layouts = {};
      state.selectedBlockId = null;
      state.isDirty = true;
    },

    /**
     * Mark as dirty (unsaved changes)
     */
    markDirty: (state) => {
      state.isDirty = true;
    },
  },
  extraReducers: (builder) => {
    // Load dashboard from backend
    builder
      .addCase(loadDashboardFromBackend.pending, (state) => {
        state.syncStatus = 'loading';
        state.syncError = null;
      })
      .addCase(loadDashboardFromBackend.fulfilled, (state, action) => {
        if (action.payload) {
          // Backend data found, use it
          state.blocks = action.payload.blocks || [];
          state.layouts = action.payload.layouts || {};
          state.name = action.payload.name || 'My Dashboard';
          state.description = action.payload.description || '';
          state.applicationId = action.payload.applicationId || state.applicationId;
          state.lastSaved = action.payload.updatedAt ? new Date(action.payload.updatedAt).getTime() : null;

          // Also save to localStorage for offline access
          saveDashboardToStorage(state);
        } else {
          // Not found in backend, use localStorage (already loaded in initializeDashboard)
        }
        state.syncStatus = 'synced';
        state.isDirty = false;
      })
      .addCase(loadDashboardFromBackend.rejected, (state, action) => {
        state.syncStatus = 'error';
        state.syncError = action.payload as string;
        // Keep localStorage data if backend fails
      });

    // Save dashboard to backend
    builder
      .addCase(saveDashboardToBackend.pending, (state) => {
        state.syncStatus = 'syncing';
        state.syncError = null;
      })
      .addCase(saveDashboardToBackend.fulfilled, (state, action) => {
        state.syncStatus = 'synced';
        state.lastSaved = action.payload.updatedAt ? new Date(action.payload.updatedAt).getTime() : Date.now();
        state.isDirty = false;
      })
      .addCase(saveDashboardToBackend.rejected, (state, action) => {
        state.syncStatus = 'error';
        state.syncError = action.payload as string;
        // Dashboard is still saved in localStorage
      });

    // Sync dashboard with backend (hybrid mode)
    builder
      .addCase(syncDashboardWithBackend.pending, (state) => {
        state.syncStatus = 'syncing';
        state.syncError = null;
      })
      .addCase(syncDashboardWithBackend.fulfilled, (state, action) => {
        if (action.payload.synced) {
          state.syncStatus = 'synced';
          state.lastSaved = Date.now();
          state.isDirty = false;
        } else {
          // Offline - localStorage save succeeded
          state.syncStatus = 'idle';
          state.lastSaved = Date.now();
          state.isDirty = false;
        }
      })
      .addCase(syncDashboardWithBackend.rejected, (state, action: any) => {
        // Even on backend error, localStorage save succeeded
        state.syncStatus = 'error';
        state.syncError = action.payload?.error || 'Sync failed';
        state.lastSaved = Date.now();
        state.isDirty = false;
      });
  },
});

/**
 * Export actions
 */
export const {
  initializeDashboard,
  addBlock,
  removeBlock,
  updateBlockConfig,
  updateLayouts,
  setEditMode,
  toggleEditMode,
  selectBlock,
  saveDashboard,
  resetDashboard,
  markDirty,
  setOnlineStatus,
  updateDashboardMetadata,
} = dashboardSlice.actions;

/**
 * Export reducer
 */
export default dashboardSlice.reducer;

/**
 * Selectors
 */
export const selectDashboard = (state: { dashboard: DashboardState }) =>
  state.dashboard;
export const selectBlocks = (state: { dashboard: DashboardState }) =>
  state.dashboard.blocks;
export const selectLayouts = (state: { dashboard: DashboardState }) =>
  state.dashboard.layouts;
export const selectEditMode = (state: { dashboard: DashboardState }) =>
  state.dashboard.isEditMode;
export const selectSelectedBlockId = (state: { dashboard: DashboardState }) =>
  state.dashboard.selectedBlockId;
export const selectSelectedBlock = (state: { dashboard: DashboardState }) =>
  state.dashboard.blocks.find((b) => b.id === state.dashboard.selectedBlockId);
export const selectIsDirty = (state: { dashboard: DashboardState }) =>
  state.dashboard.isDirty;
export const selectLastSaved = (state: { dashboard: DashboardState }) =>
  state.dashboard.lastSaved;
export const selectSyncStatus = (state: { dashboard: DashboardState }) =>
  state.dashboard.syncStatus;
export const selectSyncError = (state: { dashboard: DashboardState }) =>
  state.dashboard.syncError;
export const selectIsOnline = (state: { dashboard: DashboardState }) =>
  state.dashboard.isOnline;
export const selectDashboardMetadata = (state: { dashboard: DashboardState }) => ({
  name: state.dashboard.name,
  description: state.dashboard.description,
  applicationId: state.dashboard.applicationId,
});
