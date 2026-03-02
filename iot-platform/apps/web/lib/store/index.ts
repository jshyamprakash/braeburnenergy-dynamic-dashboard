import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Import reducers
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import dashboardReducer from './slices/dashboardSlice';
import websocketReducer from './slices/websocketSlice';
import workflowReducer from './slices/workflowSlice';
import alarmReducer from './slices/alarmSlice';
import userReducer from './slices/userSlice';
import policyReducer from './slices/policySlice';

/**
 * Configure Redux store
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    dashboard: dashboardReducer,
    websocket: websocketReducer,
    workflow: workflowReducer,
    alarm: alarmReducer,
    user: userReducer,
    policy: policyReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types that may contain non-serializable values
        ignoredActions: ['ui/openConfirmDialog'],
        // Ignore these paths in the state
        ignoredPaths: ['ui.modals.confirmDialog.data.onConfirm'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

/**
 * Infer types from store
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Typed hooks for Redux
 */
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * Export store as default
 */
export default store;
