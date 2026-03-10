import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { dashboardConfig } from '@/lib/config';
import { apiClient } from '@/lib/api-client';
import type { KosmosPage, KosmosWidget, Dashboard } from '@/components/kosmos/types';

function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

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
  // Kosmos multi-page state
  kosmosPages: KosmosPage[];
  kosmosActivePage: string | null;
  kosmosSharedWithUsers: string[]; // List of User ObjectIds (ADR-045)
  // Viewer dashboards (dashboards shared with current user)
  viewerDashboards: Dashboard[];
}

/* ── Kosmos helpers ── */
function makeDefaultPage(name: string, order: number): KosmosPage {
  return {
    id: `page_${shortId()}`,
    name,
    order,
    widgets: [],
  };
}

/** Migrate old 3-column format to unified widgets[] (ADR-044) */
function migratePageFormat(page: any): KosmosPage {
  if (Array.isArray(page.widgets)) return page as KosmosPage;
  // Old format: page.columns.{left,middle,right}
  const left: KosmosWidget[] = (page.columns?.left ?? []).map((w: any) => ({
    ...w,
    layout: w.layout ?? { x: 0, y: 0, w: 3, h: 3 },
  }));
  const middle: KosmosWidget[] = (page.columns?.middle ?? []).map((w: any) => ({
    ...w,
    layout: w.layout ?? { x: 3, y: 0, w: 6, h: 3 },
  }));
  const right: KosmosWidget[] = (page.columns?.right ?? []).map((w: any) => ({
    ...w,
    layout: w.layout ?? { x: 9, y: 0, w: 3, h: 3 },
  }));
  return {
    id: page.id,
    name: page.name,
    order: page.order ?? 0,
    widgets: [...left, ...middle, ...right],
  };
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

/* ── Kosmos async thunks ── */

export const initKosmosFromBackend = createAsyncThunk(
  'dashboard/initKosmosFromBackend',
  async ({ dashboardId, applicationId }: { dashboardId: string; applicationId: string }, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<any>(`/dashboards/${dashboardId}?applicationId=${applicationId}`);
      return res.data ?? null;
    } catch (err: any) {
      if (err?.status === 404) return null;
      return rejectWithValue(err?.message || 'Failed to load dashboard');
    }
  }
);

export const saveKosmosToBackend = createAsyncThunk(
  'dashboard/saveKosmosToBackend',
  async (
    { dashboardId, applicationId }: { dashboardId: string; applicationId: string },
    { getState, rejectWithValue }
  ) => {
    const state = getState() as { dashboard: DashboardState };
    const { kosmosPages, name, description, blocks, layouts } = state.dashboard;
    try {
      const res = await apiClient.post<any>('/dashboards', {
        dashboardId,
        applicationId,
        name,
        description,
        blocks,
        layouts,
        pages: kosmosPages,
      });
      return res.data;
    } catch (err: any) {
      return rejectWithValue(err?.message || 'Failed to save');
    }
  }
);

/**
 * Async Thunk: Fetch dashboards shared with current user (Viewer kiosk)
 */
export const fetchViewerDashboards = createAsyncThunk<
  Dashboard[],
  void,
  { rejectValue: string }
>(
  'dashboard/fetchViewerDashboards',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get<Dashboard[]>('/dashboards/my');
      return res.data ?? [];
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Failed to fetch dashboards');
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
  // Kosmos
  kosmosPages: [],
  kosmosActivePage: null,
  kosmosSharedWithUsers: [],
  viewerDashboards: [],
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

    /* ══ Kosmos Page actions ══ */

    addKosmosPage: (state, action: PayloadAction<{ name: string }>) => {
      const page = makeDefaultPage(action.payload.name, state.kosmosPages.length);
      state.kosmosPages.push(page);
      state.kosmosActivePage = page.id;
    },

    removeKosmosPage: (state, action: PayloadAction<string>) => {
      const idx = state.kosmosPages.findIndex((p) => p.id === action.payload);
      if (idx === -1) return;
      state.kosmosPages.splice(idx, 1);
      if (state.kosmosActivePage === action.payload) {
        state.kosmosActivePage = state.kosmosPages[Math.max(0, idx - 1)]?.id ?? null;
      }
    },

    renameKosmosPage: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const page = state.kosmosPages.find((p) => p.id === action.payload.id);
      if (page) page.name = action.payload.name;
    },

    setKosmosActivePage: (state, action: PayloadAction<string>) => {
      state.kosmosActivePage = action.payload;
    },

    reorderKosmosPages: (state, action: PayloadAction<string[]>) => {
      const ordered = action.payload
        .map((id, i) => {
          const p = state.kosmosPages.find((pg) => pg.id === id);
          if (p) p.order = i;
          return p;
        })
        .filter(Boolean) as KosmosPage[];
      state.kosmosPages = ordered;
    },

    /* ══ Kosmos Widget actions (ADR-044: unified canvas, no column param) ══ */

    addKosmosWidget: (
      state,
      action: PayloadAction<{ pageId: string; widget: KosmosWidget }>
    ) => {
      const { pageId, widget } = action.payload;
      const page = state.kosmosPages.find((p) => p.id === pageId);
      if (page) page.widgets.push(widget);
    },

    removeKosmosWidget: (
      state,
      action: PayloadAction<{ pageId: string; widgetId: string }>
    ) => {
      const { pageId, widgetId } = action.payload;
      const page = state.kosmosPages.find((p) => p.id === pageId);
      if (page) {
        page.widgets = page.widgets.filter((w) => w.id !== widgetId);
      }
    },

    updateKosmosWidgetLayout: (
      state,
      action: PayloadAction<{
        pageId: string;
        widgetId: string;
        layout: { x: number; y: number; w: number; h: number };
      }>
    ) => {
      const { pageId, widgetId, layout } = action.payload;
      const page = state.kosmosPages.find((p) => p.id === pageId);
      if (!page) return;
      const widget = page.widgets.find((w) => w.id === widgetId);
      if (widget) widget.layout = layout;
    },

    updateKosmosWidgetConfig: (
      state,
      action: PayloadAction<{
        pageId: string;
        widgetId: string;
        config: Record<string, any>;
      }>
    ) => {
      const { pageId, widgetId, config } = action.payload;
      const page = state.kosmosPages.find((p) => p.id === pageId);
      if (!page) return;
      const widget = page.widgets.find((w) => w.id === widgetId);
      if (widget) widget.config = { ...widget.config, ...config };
    },

    setKosmosSharedWithUsers: (state, action: PayloadAction<string[]>) => {
      state.kosmosSharedWithUsers = action.payload;
    },

    /** Load pages directly (skip API call) — used by Viewer kiosk (ADR-045) */
    setKosmosFromDashboard: (
      state,
      action: PayloadAction<{ pages: any[]; sharedWithUsers?: string[] }>
    ) => {
      const migrated = action.payload.pages.map(migratePageFormat);
      state.kosmosPages = migrated;
      state.kosmosActivePage = migrated[0]?.id ?? null;
      if (action.payload.sharedWithUsers) {
        state.kosmosSharedWithUsers = action.payload.sharedWithUsers;
      }
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
          state.syncStatus = 'idle';
          state.lastSaved = Date.now();
          state.isDirty = false;
        }
      })
      .addCase(syncDashboardWithBackend.rejected, (state, action: any) => {
        state.syncStatus = 'error';
        state.syncError = action.payload?.error || 'Sync failed';
        state.lastSaved = Date.now();
        state.isDirty = false;
      });

    // Kosmos: init from backend (ADR-044: migrate old columns format on load; ADR-045: use sharedWithUsers)
    builder
      .addCase(initKosmosFromBackend.fulfilled, (state, action) => {
        if (!action.payload) {
          // New dashboard: seed a default page
          if (state.kosmosPages.length === 0) {
            const page = makeDefaultPage('Overview', 0);
            state.kosmosPages = [page];
            state.kosmosActivePage = page.id;
          }
          return;
        }
        const data = action.payload;
        if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
          // Migrate old column-based pages to unified widgets[] format
          state.kosmosPages = data.pages.map(migratePageFormat);
          state.kosmosActivePage = state.kosmosPages[0].id;
        } else if (state.kosmosPages.length === 0) {
          const page = makeDefaultPage('Overview', 0);
          state.kosmosPages = [page];
          state.kosmosActivePage = page.id;
        }
        if (data.sharedWithUsers) state.kosmosSharedWithUsers = data.sharedWithUsers;
        state.name = data.name || state.name;
      });

    // Kosmos: save to backend
    builder
      .addCase(saveKosmosToBackend.fulfilled, (state, action) => {
        if (action.payload?.sharedWithUsers) {
          state.kosmosSharedWithUsers = action.payload.sharedWithUsers;
        }
        state.lastSaved = Date.now();
      });

    // Fetch viewer dashboards
    builder
      .addCase(fetchViewerDashboards.fulfilled, (state, action) => {
        state.viewerDashboards = action.payload;
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
  // Kosmos actions
  addKosmosPage,
  removeKosmosPage,
  renameKosmosPage,
  setKosmosActivePage,
  reorderKosmosPages,
  addKosmosWidget,
  removeKosmosWidget,
  updateKosmosWidgetLayout,
  updateKosmosWidgetConfig,
  setKosmosSharedWithUsers,
  setKosmosFromDashboard,
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

// Kosmos selectors
export const selectKosmosPages = (state: { dashboard: DashboardState }) =>
  state.dashboard.kosmosPages;
export const selectKosmosActivePage = (state: { dashboard: DashboardState }) =>
  state.dashboard.kosmosActivePage;
export const selectKosmosSharedWithUsers = (state: { dashboard: DashboardState }) =>
  state.dashboard.kosmosSharedWithUsers;
export const selectViewerDashboards = (state: { dashboard: DashboardState }) =>
  state.dashboard.viewerDashboards;
