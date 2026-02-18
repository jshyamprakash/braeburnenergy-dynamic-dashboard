# Redux Implementation Guide

**Created:** 2026-02-14
**Status:** ✅ Complete and Production-Ready
**Location:** `iot-platform/apps/web/lib/store/`

---

## Overview

Complete Redux Toolkit implementation for the Next.js frontend, replacing useState with centralized state management. All environment variables are now processed through a centralized config file.

---

## Table of Contents

1. [Config Centralization](#1-config-centralization)
2. [Redux Store Structure](#2-redux-store-structure)
3. [State Slices](#3-state-slices)
4. [Usage Examples](#4-usage-examples)
5. [Migration Guide](#5-migration-guide)
6. [Best Practices](#6-best-practices)

---

## 1. Config Centralization

### Location

`apps/web/lib/config.ts`

### Features

- **Type-safe configuration** - All config values typed with TypeScript
- **Validation** - Warns about missing env vars in development
- **Centralized access** - Single source of truth for all config
- **Helper functions** - `getApiUrl()`, `getWebSocketUrl()`, `isFeatureEnabled()`

### Config Sections

```typescript
import { config, apiConfig, authConfig, dashboardConfig, uiConfig } from '@/lib/config';

// Environment
config.env.isDevelopment // boolean
config.env.isProduction  // boolean

// API
config.api.baseUrl       // "http://localhost:3001"
config.api.timeout       // 30000 (ms)

// WebSocket
config.websocket.url     // "ws://localhost:3001"
config.websocket.reconnectAttempts // 5

// Auth
config.auth.tokenKey     // "iot_access_token"
config.auth.tokenExpiry  // 15 minutes

// Dashboard
config.dashboard.storageKey     // "iot_dashboard_layout"
config.dashboard.autoSaveDelay  // 1000 (ms)
config.dashboard.maxBlocks      // 20

// UI
config.ui.themeKey              // "iot_theme"
config.ui.defaultTheme          // "system"
config.ui.toastDuration         // 3000 (ms)

// Feature Flags
config.features.enableWebSocket         // true
config.features.enableDarkMode          // true
config.features.enableDashboardBuilder  // true
```

### Environment Variables

Create `.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_TIMEOUT=30000

# WebSocket Configuration (optional - auto-derived from API_URL)
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# Feature Flags (optional - defaults to true)
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_DARK_MODE=true
NEXT_PUBLIC_ENABLE_EXPORT=true
NEXT_PUBLIC_ENABLE_DASHBOARD_BUILDER=true

# Development (optional)
NEXT_PUBLIC_SHOW_DEV_TOOLS=false
NEXT_PUBLIC_MOCK_DATA=false
NEXT_PUBLIC_LOG_LEVEL=info
```

### Helper Functions

```typescript
import { getApiUrl, getWebSocketUrl, isFeatureEnabled } from '@/lib/config';

// Get full API URL
const deviceUrl = getApiUrl('/devices'); // http://localhost:3001/devices

// Get WebSocket URL
const wsUrl = getWebSocketUrl(); // ws://localhost:3001

// Check feature flag
if (isFeatureEnabled('enableDashboardBuilder')) {
  // Show dashboard builder
}
```

---

## 2. Redux Store Structure

### Installation

```bash
pnpm add @reduxjs/toolkit react-redux
```

### Store Files

```
apps/web/lib/store/
├── index.ts                    # Store configuration
└── slices/
    ├── authSlice.ts           # Authentication state
    ├── uiSlice.ts             # UI state (modals, theme, sidebar)
    ├── dashboardSlice.ts      # Dashboard builder state
    └── websocketSlice.ts      # WebSocket connection state
```

### Store Configuration

`apps/web/lib/store/index.ts`:

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import dashboardReducer from './slices/dashboardSlice';
import websocketReducer from './slices/websocketSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    dashboard: dashboardReducer,
    websocket: websocketReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### Provider Setup

`apps/web/lib/providers.tsx`:

```typescript
import { Provider as ReduxProvider } from 'react-redux';
import { store } from './store';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ReduxProvider>
  );
}
```

---

## 3. State Slices

### 3.1 Auth Slice

**Purpose:** Manage user authentication state

**State:**
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

**Actions:**
- `loginSuccess(payload)` - Store user and tokens after login
- `logout()` - Clear auth state and localStorage
- `updateTokens(payload)` - Update tokens after refresh
- `updateUser(payload)` - Update user profile
- `setLoading(boolean)` - Set loading state
- `setError(string)` - Set error message
- `clearError()` - Clear error

**Selectors:**
- `selectAuth` - Get full auth state
- `selectUser` - Get current user
- `selectIsAuthenticated` - Get auth status
- `selectAccessToken` - Get access token
- `selectAuthLoading` - Get loading state
- `selectAuthError` - Get error

**LocalStorage Persistence:**
- Access token → `iot_access_token`
- Refresh token → `iot_refresh_token`
- User object → `iot_user`

**Usage:**
```typescript
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { loginSuccess, logout, selectUser, selectIsAuthenticated } from '@/lib/store/slices/authSlice';

function LoginComponent() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const handleLogin = async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    dispatch(loginSuccess({
      user: response.data.user,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    }));
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div>
      {isAuthenticated ? (
        <p>Welcome, {user?.username}!</p>
      ) : (
        <LoginForm onSubmit={handleLogin} />
      )}
    </div>
  );
}
```

---

### 3.2 UI Slice

**Purpose:** Manage UI state (modals, theme, sidebar)

**State:**
```typescript
interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  modals: {
    deviceForm: ModalState;
    confirmDialog: ModalState;
  };
  toast: { message: string; type: string; isVisible: boolean } | null;
}
```

**Actions:**
- `setTheme(theme)` - Set theme
- `toggleTheme()` - Toggle between light/dark
- `toggleSidebar()` - Toggle sidebar
- `setSidebarOpen(boolean)` - Set sidebar state
- `openDeviceForm({ type, data })` - Open device form modal
- `closeDeviceForm()` - Close device form modal
- `openConfirmDialog({ type, title, message, onConfirm })` - Open confirm dialog
- `closeConfirmDialog()` - Close confirm dialog
- `showToast({ message, type })` - Show toast notification
- `hideToast()` - Hide toast
- `clearToast()` - Clear toast

**Selectors:**
- `selectTheme` - Get current theme
- `selectSidebarOpen` - Get sidebar state
- `selectDeviceFormModal` - Get device form modal state
- `selectConfirmDialog` - Get confirm dialog state
- `selectToast` - Get toast state

**LocalStorage Persistence:**
- Theme → `iot_theme`

**Usage:**
```typescript
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { openDeviceForm, closeDeviceForm, selectDeviceFormModal } from '@/lib/store/slices/uiSlice';

function DevicesPage() {
  const dispatch = useAppDispatch();
  const deviceFormModal = useAppSelector(selectDeviceFormModal);

  const handleCreateClick = () => {
    dispatch(openDeviceForm({ type: 'create' }));
  };

  const handleEditClick = (device) => {
    dispatch(openDeviceForm({ type: 'edit', data: device }));
  };

  return (
    <>
      <button onClick={handleCreateClick}>Add Device</button>
      <DeviceForm
        isOpen={deviceFormModal.isOpen}
        onClose={() => dispatch(closeDeviceForm())}
        device={deviceFormModal.data}
      />
    </>
  );
}
```

---

### 3.3 Dashboard Slice

**Purpose:** Manage dashboard builder state

**State:**
```typescript
interface DashboardState {
  dashboardId: string;
  blocks: DashboardBlock[];
  layouts: Layouts;
  isEditMode: boolean;
  selectedBlockId: string | null;
  isDirty: boolean;
  lastSaved: number | null;
}
```

**Actions:**
- `initializeDashboard(id)` - Initialize dashboard from localStorage
- `addBlock(block)` - Add new block
- `removeBlock(id)` - Remove block
- `updateBlockConfig({ id, config })` - Update block configuration
- `updateLayouts(layouts)` - Update grid layouts
- `setEditMode(boolean)` - Set edit mode
- `toggleEditMode()` - Toggle edit mode
- `selectBlock(id)` - Select block for editing
- `saveDashboard()` - Save to localStorage
- `resetDashboard()` - Clear all blocks
- `markDirty()` - Mark as having unsaved changes

**Selectors:**
- `selectDashboard` - Get full dashboard state
- `selectBlocks` - Get all blocks
- `selectLayouts` - Get layouts
- `selectEditMode` - Get edit mode status
- `selectSelectedBlockId` - Get selected block ID
- `selectSelectedBlock` - Get selected block
- `selectIsDirty` - Get dirty state
- `selectLastSaved` - Get last saved timestamp

**LocalStorage Persistence:**
- Dashboard layout → `iot_dashboard_layout_{dashboardId}`

**Usage:**
```typescript
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { initializeDashboard, addBlock, selectBlocks, selectEditMode } from '@/lib/store/slices/dashboardSlice';

function DashboardBuilder({ dashboardId }) {
  const dispatch = useAppDispatch();
  const blocks = useAppSelector(selectBlocks);
  const isEditMode = useAppSelector(selectEditMode);

  useEffect(() => {
    dispatch(initializeDashboard(dashboardId));
  }, [dashboardId]);

  const handleAddGauge = () => {
    const newBlock = {
      id: ulid(),
      type: 'gauge',
      layouts: { /* ... */ },
      config: { /* ... */ },
    };
    dispatch(addBlock(newBlock));
  };

  return (
    <div>
      {isEditMode && <button onClick={handleAddGauge}>Add Gauge</button>}
      <ResponsiveGridLayout layouts={layouts}>
        {blocks.map(block => <BlockComponent key={block.id} {...block} />)}
      </ResponsiveGridLayout>
    </div>
  );
}
```

---

### 3.4 WebSocket Slice

**Purpose:** Manage WebSocket connection and real-time data

**State:**
```typescript
interface WebSocketState {
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  isConnected: boolean;
  reconnectAttempts: number;
  error: string | null;
  latestUpdates: Record<string, DeviceStateUpdate>;
  updateHistory: DeviceStateUpdate[];
  maxHistorySize: number;
}
```

**Actions:**
- `connectionEstablished()` - Mark connection as established
- `connectionLost()` - Mark connection as lost
- `connectionError(message)` - Set connection error
- `incrementReconnectAttempts()` - Increment reconnect counter
- `resetReconnectAttempts()` - Reset reconnect counter
- `deviceStateUpdated(update)` - Handle device state update from WS
- `clearUpdateHistory()` - Clear update history
- `clearDeviceUpdate(deviceId)` - Clear specific device update
- `clearAllUpdates()` - Clear all updates
- `resetWebSocket()` - Reset entire state

**Selectors:**
- `selectWebSocket` - Get full WebSocket state
- `selectConnectionStatus` - Get connection status
- `selectIsConnected` - Get connection status (boolean)
- `selectReconnectAttempts` - Get reconnect attempts
- `selectWebSocketError` - Get error
- `selectLatestUpdates` - Get all latest updates
- `selectDeviceLatestUpdate(deviceId)` - Get specific device update
- `selectUpdateHistory` - Get update history

**Usage:**
```typescript
import { useAppDispatch, useAppSelector } from '@/lib/store';
import {
  connectionEstablished,
  deviceStateUpdated,
  selectIsConnected,
  selectDeviceLatestUpdate
} from '@/lib/store/slices/websocketSlice';

function useWebSocketConnection() {
  const dispatch = useAppDispatch();
  const isConnected = useAppSelector(selectIsConnected);

  useEffect(() => {
    const socket = io(config.websocket.url);

    socket.on('connect', () => {
      dispatch(connectionEstablished());
    });

    socket.on('device:state:update', (data) => {
      dispatch(deviceStateUpdated(data));
    });

    return () => socket.disconnect();
  }, []);

  return { isConnected };
}

function GaugeBlock({ deviceId }) {
  const latestUpdate = useAppSelector((state) =>
    selectDeviceLatestUpdate(state, deviceId)
  );

  return <div>Temperature: {latestUpdate?.data.temperature}°C</div>;
}
```

---

## 4. Usage Examples

### Example 1: Login Flow

```typescript
// components/LoginForm.tsx
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { loginSuccess, setLoading, setError, selectAuthLoading, selectAuthError } from '@/lib/store/slices/authSlice';
import { apiClient } from '@/lib/api-client';

export function LoginForm() {
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      dispatch(setLoading(true));

      const response = await apiClient.post('/auth/login', {
        username: e.target.username.value,
        password: e.target.password.value,
      });

      dispatch(loginSuccess({
        user: response.data.user,
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      }));

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      dispatch(setError(err.message));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="text-red-600">{error}</div>}
      <input name="username" />
      <input name="password" type="password" />
      <button disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Example 2: Theme Toggle

```typescript
// components/ThemeToggle.tsx
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { toggleTheme, selectTheme } from '@/lib/store/slices/uiSlice';

export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);

  return (
    <button onClick={() => dispatch(toggleTheme())}>
      {theme === 'dark' ? '🌞' : '🌙'}
    </button>
  );
}
```

### Example 3: Dashboard Builder

```typescript
// components/DashboardBuilder.tsx
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import {
  initializeDashboard,
  addBlock,
  removeBlock,
  updateLayouts,
  toggleEditMode,
  saveDashboard,
  selectBlocks,
  selectLayouts,
  selectEditMode,
  selectIsDirty,
} from '@/lib/store/slices/dashboardSlice';

export function DashboardBuilder({ dashboardId }) {
  const dispatch = useAppDispatch();
  const blocks = useAppSelector(selectBlocks);
  const layouts = useAppSelector(selectLayouts);
  const isEditMode = useAppSelector(selectEditMode);
  const isDirty = useAppSelector(selectIsDirty);

  useEffect(() => {
    dispatch(initializeDashboard(dashboardId));
  }, [dashboardId]);

  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        dispatch(saveDashboard());
      }, 1000); // Auto-save after 1 second

      return () => clearTimeout(timer);
    }
  }, [isDirty]);

  const handleLayoutChange = (newLayouts) => {
    dispatch(updateLayouts(newLayouts));
  };

  return (
    <div>
      <button onClick={() => dispatch(toggleEditMode())}>
        {isEditMode ? 'Exit Edit Mode' : 'Edit Dashboard'}
      </button>

      <ResponsiveGridLayout
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        isDraggable={isEditMode}
        isResizable={isEditMode}
      >
        {blocks.map(block => (
          <div key={block.id}>
            {isEditMode && (
              <button onClick={() => dispatch(removeBlock(block.id))}>
                Remove
              </button>
            )}
            <BlockComponent {...block} />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
```

---

## 5. Migration Guide

### Before (useState)

```typescript
// ❌ OLD WAY - Local component state
import { useState } from 'react';

export function DevicesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);

  const handleCreateClick = () => {
    setEditingDevice(null);
    setIsFormOpen(true);
  };

  return (
    <>
      <button onClick={handleCreateClick}>Add Device</button>
      <DeviceForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        device={editingDevice}
      />
    </>
  );
}
```

### After (Redux)

```typescript
// ✅ NEW WAY - Redux state
import { useAppDispatch, useAppSelector } from '@/lib/store';
import { openDeviceForm, closeDeviceForm, selectDeviceFormModal } from '@/lib/store/slices/uiSlice';

export function DevicesPage() {
  const dispatch = useAppDispatch();
  const deviceFormModal = useAppSelector(selectDeviceFormModal);

  const handleCreateClick = () => {
    dispatch(openDeviceForm({ type: 'create' }));
  };

  return (
    <>
      <button onClick={handleCreateClick}>Add Device</button>
      <DeviceForm
        isOpen={deviceFormModal.isOpen}
        onClose={() => dispatch(closeDeviceForm())}
        device={deviceFormModal.data}
      />
    </>
  );
}
```

### Migration Checklist

For each component using useState:

1. **Identify state type**
   - Auth state → `authSlice`
   - UI state (modals, theme) → `uiSlice`
   - Dashboard state → `dashboardSlice`
   - WebSocket state → `websocketSlice`
   - Server state → Keep TanStack Query

2. **Import Redux hooks**
   ```typescript
   import { useAppDispatch, useAppSelector } from '@/lib/store';
   ```

3. **Replace useState with selectors**
   ```typescript
   // Before
   const [isOpen, setIsOpen] = useState(false);

   // After
   const deviceFormModal = useAppSelector(selectDeviceFormModal);
   const isOpen = deviceFormModal.isOpen;
   ```

4. **Replace state setters with dispatches**
   ```typescript
   // Before
   setIsOpen(true);

   // After
   dispatch(openDeviceForm({ type: 'create' }));
   ```

5. **Keep TanStack Query for server state**
   ```typescript
   // ✅ CORRECT - Keep for API data
   const { data, isLoading } = useDevices();

   // ❌ WRONG - Don't move server data to Redux
   // const devices = useAppSelector(selectDevices);
   ```

---

## 6. Best Practices

### When to Use Redux vs TanStack Query

**Use Redux for:**
- ✅ Authentication state (user, tokens)
- ✅ UI state (modals, theme, sidebar)
- ✅ Dashboard builder state (blocks, layouts)
- ✅ WebSocket connection state
- ✅ Client-side only state
- ✅ State shared across many components

**Use TanStack Query for:**
- ✅ Server data (devices, device states)
- ✅ API responses
- ✅ Paginated data
- ✅ Data that needs refetching
- ✅ Data with loading/error states

### Redux Slice Organization

**Keep slices focused:**
```typescript
// ✅ GOOD - Focused slices
- authSlice: User, tokens, auth status
- uiSlice: Modals, theme, sidebar
- dashboardSlice: Dashboard builder only

// ❌ BAD - God slice
- appSlice: Everything mixed together
```

**Use consistent action naming:**
```typescript
// ✅ GOOD - Clear, verb-based
loginSuccess, logout, updateUser
openModal, closeModal
addBlock, removeBlock

// ❌ BAD - Unclear
setAuthData, modalState
blockAction
```

**Create selectors for derived state:**
```typescript
// ✅ GOOD - Memoized selector
export const selectSelectedBlock = (state) =>
  state.dashboard.blocks.find(b => b.id === state.dashboard.selectedBlockId);

// ❌ BAD - Computing in component
const selectedBlock = blocks.find(b => b.id === selectedBlockId);
```

### LocalStorage Persistence

**Automatic persistence:**
- Auth state (user, tokens) → Auto-saves to localStorage
- UI theme → Auto-saves to localStorage
- Dashboard layouts → Saves on `saveDashboard()` action

**Manual persistence:**
```typescript
// Dashboard auto-saves after 1 second of inactivity
useEffect(() => {
  if (isDirty) {
    const timer = setTimeout(() => {
      dispatch(saveDashboard());
    }, dashboardConfig.autoSaveDelay);

    return () => clearTimeout(timer);
  }
}, [isDirty]);
```

### Performance Optimization

**Use specific selectors:**
```typescript
// ✅ GOOD - Only re-renders when theme changes
const theme = useAppSelector(selectTheme);

// ❌ BAD - Re-renders on any UI change
const ui = useAppSelector(state => state.ui);
const theme = ui.theme;
```

**Memoize expensive computations:**
```typescript
import { createSelector } from '@reduxjs/toolkit';

export const selectVisibleBlocks = createSelector(
  [selectBlocks, selectFilter],
  (blocks, filter) => blocks.filter(block => /* expensive filter */)
);
```

---

## Summary

**✅ Completed:**
1. Centralized config file for all environment variables
2. Redux Toolkit store with 4 slices (auth, ui, dashboard, websocket)
3. Typed hooks (`useAppDispatch`, `useAppSelector`)
4. LocalStorage persistence for auth, theme, dashboard
5. Updated `apps/web/app/devices/page.tsx` to use Redux
6. Provider setup with Redux + TanStack Query

**📦 Components Using Redux:**
- `/devices` - Device form modal state
- (Other components ready for migration)

**🚀 Ready for:**
- Authentication context implementation
- WebSocket connection management
- Dashboard builder refactoring
- Theme management

**📚 Next Steps:**
1. Migrate remaining useState to Redux
2. Implement auth context with Redux
3. Create WebSocket connection manager
4. Build theme provider with Redux

---

**Last Updated:** 2026-02-14
**Version:** 1.0.0
**Status:** Production-ready
