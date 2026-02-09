import { toast as sonnerToast } from 'sonner';
import { getUserFriendlyMessage } from '../api-error';

/**
 * Toast Notification Utilities
 *
 * Provides consistent toast notifications throughout the app
 */

export const toast = {
  /**
   * Show success message
   */
  success: (message: string, description?: string) => {
    sonnerToast.success(message, { description });
  },

  /**
   * Show error message (with automatic error parsing)
   */
  error: (error: unknown, fallbackMessage: string = 'An error occurred') => {
    const message = getUserFriendlyMessage(error);
    sonnerToast.error(fallbackMessage, { description: message });
  },

  /**
   * Show warning message
   */
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, { description });
  },

  /**
   * Show info message
   */
  info: (message: string, description?: string) => {
    sonnerToast.info(message, { description });
  },

  /**
   * Show loading message (returns ID for dismissing later)
   */
  loading: (message: string, description?: string) => {
    return sonnerToast.loading(message, { description });
  },

  /**
   * Dismiss a specific toast
   */
  dismiss: (id: string | number) => {
    sonnerToast.dismiss(id);
  },

  /**
   * Promise toast - shows loading, then success/error based on promise result
   */
  promise: <T,>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading,
      success,
      error: (err) => {
        const errorFn = typeof error === 'function' ? error : () => error;
        const message = errorFn(err);
        return `${message}: ${getUserFriendlyMessage(err)}`;
      },
    });
  },
};

// Device-specific toast messages
export const deviceToasts = {
  created: () => toast.success('Device created', 'New device added successfully'),
  updated: () => toast.success('Device updated', 'Device information saved'),
  deleted: () => toast.success('Device deleted', 'Device removed from system'),
  createError: (error: unknown) => toast.error(error, 'Failed to create device'),
  updateError: (error: unknown) => toast.error(error, 'Failed to update device'),
  deleteError: (error: unknown) => toast.error(error, 'Failed to delete device'),
};

// WebSocket connection toasts
export const connectionToasts = {
  connected: () => toast.success('Connected', 'Real-time updates enabled'),
  disconnected: () => toast.warning('Disconnected', 'Real-time updates paused'),
  reconnecting: () => toast.info('Reconnecting', 'Attempting to restore connection...'),
  error: (error: unknown) => toast.error(error, 'Connection error'),
};

// Data operation toasts
export const dataToasts = {
  saved: () => toast.success('Saved', 'Changes saved successfully'),
  saveError: (error: unknown) => toast.error(error, 'Failed to save changes'),
  loaded: () => toast.success('Loaded', 'Data loaded successfully'),
  loadError: (error: unknown) => toast.error(error, 'Failed to load data'),
};
