import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { uiConfig } from '@/lib/config';

/**
 * Theme type
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * Modal state
 */
export interface ModalState {
  isOpen: boolean;
  type: string | null;
  data: any;
}

/**
 * UI state interface
 */
export interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  modals: {
    deviceForm: ModalState;
    confirmDialog: ModalState;
  };
  toast: {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    isVisible: boolean;
  } | null;
}

/**
 * Load theme from localStorage
 */
function loadThemeFromStorage(): Theme {
  if (typeof window === 'undefined') return uiConfig.defaultTheme;

  try {
    const saved = localStorage.getItem(uiConfig.themeKey);
    if (saved && ['light', 'dark', 'system'].includes(saved)) {
      return saved as Theme;
    }
  } catch (error) {
    console.error('Failed to load theme from storage:', error);
  }

  return uiConfig.defaultTheme;
}

/**
 * Save theme to localStorage
 */
function saveThemeToStorage(theme: Theme) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(uiConfig.themeKey, theme);
  } catch (error) {
    console.error('Failed to save theme to storage:', error);
  }
}

/**
 * Initial state
 */
const initialState: UIState = {
  theme: loadThemeFromStorage(),
  sidebarOpen: true,
  modals: {
    deviceForm: {
      isOpen: false,
      type: null,
      data: null,
    },
    confirmDialog: {
      isOpen: false,
      type: null,
      data: null,
    },
  },
  toast: null,
};

/**
 * UI slice
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Set theme
     */
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      saveThemeToStorage(action.payload);
    },

    /**
     * Toggle theme between light and dark
     */
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      saveThemeToStorage(state.theme);
    },

    /**
     * Toggle sidebar
     */
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },

    /**
     * Set sidebar state
     */
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },

    /**
     * Open device form modal
     */
    openDeviceForm: (
      state,
      action: PayloadAction<{ type: 'create' | 'edit'; data?: any }>
    ) => {
      state.modals.deviceForm = {
        isOpen: true,
        type: action.payload.type,
        data: action.payload.data || null,
      };
    },

    /**
     * Close device form modal
     */
    closeDeviceForm: (state) => {
      state.modals.deviceForm = {
        isOpen: false,
        type: null,
        data: null,
      };
    },

    /**
     * Open confirm dialog
     */
    openConfirmDialog: (
      state,
      action: PayloadAction<{
        type: string;
        title: string;
        message: string;
        onConfirm: () => void;
      }>
    ) => {
      state.modals.confirmDialog = {
        isOpen: true,
        type: action.payload.type,
        data: action.payload,
      };
    },

    /**
     * Close confirm dialog
     */
    closeConfirmDialog: (state) => {
      state.modals.confirmDialog = {
        isOpen: false,
        type: null,
        data: null,
      };
    },

    /**
     * Show toast notification
     */
    showToast: (
      state,
      action: PayloadAction<{
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
      }>
    ) => {
      state.toast = {
        message: action.payload.message,
        type: action.payload.type,
        isVisible: true,
      };
    },

    /**
     * Hide toast notification
     */
    hideToast: (state) => {
      if (state.toast) {
        state.toast.isVisible = false;
      }
    },

    /**
     * Clear toast notification
     */
    clearToast: (state) => {
      state.toast = null;
    },
  },
});

/**
 * Export actions
 */
export const {
  setTheme,
  toggleTheme,
  toggleSidebar,
  setSidebarOpen,
  openDeviceForm,
  closeDeviceForm,
  openConfirmDialog,
  closeConfirmDialog,
  showToast,
  hideToast,
  clearToast,
} = uiSlice.actions;

/**
 * Export reducer
 */
export default uiSlice.reducer;

/**
 * Selectors
 */
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectSidebarOpen = (state: { ui: UIState }) => state.ui.sidebarOpen;
export const selectDeviceFormModal = (state: { ui: UIState }) =>
  state.ui.modals.deviceForm;
export const selectConfirmDialog = (state: { ui: UIState }) =>
  state.ui.modals.confirmDialog;
export const selectToast = (state: { ui: UIState }) => state.ui.toast;
