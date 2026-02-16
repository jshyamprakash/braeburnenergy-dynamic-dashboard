# Redux Quick Reference

**Quick copy-paste examples for common Redux patterns**

---

## Setup

### 1. Import Redux Hooks

```typescript
import { useAppDispatch, useAppSelector } from '@/lib/store';
```

### 2. Import Config

```typescript
import { config, apiConfig } from '@/lib/config';
```

---

## Auth State

### Login

```typescript
import { loginSuccess, selectIsAuthenticated, selectUser } from '@/lib/store/slices/authSlice';

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
}
```

### Logout

```typescript
import { logout } from '@/lib/store/slices/authSlice';

function LogoutButton() {
  const dispatch = useAppDispatch();

  return (
    <button onClick={() => dispatch(logout())}>
      Logout
    </button>
  );
}
```

### Check Auth Status

```typescript
import { selectIsAuthenticated, selectUser, selectAccessToken } from '@/lib/store/slices/authSlice';

function ProtectedRoute({ children }) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectUser);
  const token = useAppSelector(selectAccessToken);

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
}
```

---

## UI State

### Modal Management

```typescript
import { openDeviceForm, closeDeviceForm, selectDeviceFormModal } from '@/lib/store/slices/uiSlice';

function DevicesPage() {
  const dispatch = useAppDispatch();
  const modal = useAppSelector(selectDeviceFormModal);

  return (
    <>
      <button onClick={() => dispatch(openDeviceForm({ type: 'create' }))}>
        Add Device
      </button>

      <DeviceForm
        isOpen={modal.isOpen}
        onClose={() => dispatch(closeDeviceForm())}
        device={modal.data}
      />
    </>
  );
}
```

### Theme Management

```typescript
import { toggleTheme, setTheme, selectTheme } from '@/lib/store/slices/uiSlice';

function ThemeToggle() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);

  return (
    <>
      <button onClick={() => dispatch(toggleTheme())}>
        Toggle: {theme}
      </button>

      <button onClick={() => dispatch(setTheme('dark'))}>
        Set Dark
      </button>
    </>
  );
}
```

### Sidebar Management

```typescript
import { toggleSidebar, selectSidebarOpen } from '@/lib/store/slices/uiSlice';

function Layout() {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector(selectSidebarOpen);

  return (
    <div className={sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}>
      <button onClick={() => dispatch(toggleSidebar())}>
        {sidebarOpen ? 'Close' : 'Open'} Sidebar
      </button>
    </div>
  );
}
```

### Toast Notifications

```typescript
import { showToast, selectToast } from '@/lib/store/slices/uiSlice';

function MyComponent() {
  const dispatch = useAppDispatch();

  const handleSuccess = () => {
    dispatch(showToast({
      message: 'Device created successfully!',
      type: 'success'
    }));
  };

  const handleError = () => {
    dispatch(showToast({
      message: 'Failed to save device',
      type: 'error'
    }));
  };
}
```

---

## Dashboard State

### Initialize Dashboard

```typescript
import { initializeDashboard, selectBlocks, selectEditMode } from '@/lib/store/slices/dashboardSlice';

function DashboardBuilder({ dashboardId }) {
  const dispatch = useAppDispatch();
  const blocks = useAppSelector(selectBlocks);
  const isEditMode = useAppSelector(selectEditMode);

  useEffect(() => {
    dispatch(initializeDashboard(dashboardId));
  }, [dashboardId]);
}
```

### Add/Remove Blocks

```typescript
import { addBlock, removeBlock } from '@/lib/store/slices/dashboardSlice';
import { ulid } from 'ulid';

function BlockPalette() {
  const dispatch = useAppDispatch();

  const handleAddGauge = () => {
    const newBlock = {
      id: ulid(),
      type: 'gauge',
      layouts: {
        lg: { i: ulid(), x: 0, y: 0, w: 4, h: 4 },
        md: { i: ulid(), x: 0, y: 0, w: 4, h: 4 },
        sm: { i: ulid(), x: 0, y: 0, w: 6, h: 4 },
      },
      config: {
        title: 'New Gauge',
        deviceId: '',
        min: 0,
        max: 100,
      },
    };

    dispatch(addBlock(newBlock));
  };

  const handleRemoveBlock = (blockId) => {
    dispatch(removeBlock(blockId));
  };
}
```

### Edit Mode

```typescript
import { toggleEditMode, setEditMode, selectEditMode } from '@/lib/store/slices/dashboardSlice';

function DashboardHeader() {
  const dispatch = useAppDispatch();
  const isEditMode = useAppSelector(selectEditMode);

  return (
    <button onClick={() => dispatch(toggleEditMode())}>
      {isEditMode ? 'Exit Edit Mode' : 'Edit Dashboard'}
    </button>
  );
}
```

### Block Selection

```typescript
import { selectBlock, selectSelectedBlock, selectSelectedBlockId } from '@/lib/store/slices/dashboardSlice';

function BlockComponent({ blockId }) {
  const dispatch = useAppDispatch();
  const selectedBlockId = useAppSelector(selectSelectedBlockId);
  const isSelected = selectedBlockId === blockId;

  return (
    <div
      className={isSelected ? 'block-selected' : ''}
      onClick={() => dispatch(selectBlock(blockId))}
    >
      Block Content
    </div>
  );
}

function BlockConfigPanel() {
  const selectedBlock = useAppSelector(selectSelectedBlock);

  if (!selectedBlock) return null;

  return <div>Configure: {selectedBlock.config.title}</div>;
}
```

### Auto-Save

```typescript
import { saveDashboard, selectIsDirty } from '@/lib/store/slices/dashboardSlice';
import { dashboardConfig } from '@/lib/config';

function DashboardBuilder() {
  const dispatch = useAppDispatch();
  const isDirty = useAppSelector(selectIsDirty);

  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        dispatch(saveDashboard());
      }, dashboardConfig.autoSaveDelay);

      return () => clearTimeout(timer);
    }
  }, [isDirty]);
}
```

---

## WebSocket State

### Connection Management

```typescript
import {
  connectionEstablished,
  connectionLost,
  connectionError,
  selectIsConnected,
  selectConnectionStatus
} from '@/lib/store/slices/websocketSlice';
import { io } from 'socket.io-client';
import { wsConfig } from '@/lib/config';

function useWebSocketConnection() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const socket = io(wsConfig.url, {
      reconnectionAttempts: wsConfig.reconnectAttempts,
      reconnectionDelay: wsConfig.reconnectDelay,
    });

    socket.on('connect', () => {
      dispatch(connectionEstablished());
    });

    socket.on('disconnect', () => {
      dispatch(connectionLost());
    });

    socket.on('error', (error) => {
      dispatch(connectionError(error.message));
    });

    return () => socket.disconnect();
  }, []);
}
```

### Real-Time Updates

```typescript
import { deviceStateUpdated, selectDeviceLatestUpdate } from '@/lib/store/slices/websocketSlice';

function useDeviceRealtime(deviceId) {
  const dispatch = useAppDispatch();
  const latestUpdate = useAppSelector((state) =>
    selectDeviceLatestUpdate(state, deviceId)
  );

  useEffect(() => {
    const socket = io(wsConfig.url);

    socket.on('device:state:update', (data) => {
      dispatch(deviceStateUpdated(data));
    });

    return () => socket.disconnect();
  }, []);

  return latestUpdate;
}

function GaugeBlock({ deviceId }) {
  const latestUpdate = useDeviceRealtime(deviceId);

  return (
    <div>
      <h3>Temperature</h3>
      <p>{latestUpdate?.data.temperature}°C</p>
    </div>
  );
}
```

### Connection Status Display

```typescript
import { selectIsConnected, selectConnectionStatus } from '@/lib/store/slices/websocketSlice';

function ConnectionIndicator() {
  const isConnected = useAppSelector(selectIsConnected);
  const status = useAppSelector(selectConnectionStatus);

  return (
    <div className={`status-${status}`}>
      {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
    </div>
  );
}
```

---

## Config Usage

### API Calls

```typescript
import { apiConfig, getApiUrl } from '@/lib/config';

// Get base URL
const baseUrl = apiConfig.baseUrl; // "http://localhost:3001"

// Build full URL
const deviceUrl = getApiUrl('/devices'); // "http://localhost:3001/devices"

// Timeout
const timeout = apiConfig.timeout; // 30000
```

### WebSocket

```typescript
import { wsConfig, getWebSocketUrl } from '@/lib/config';

const wsUrl = getWebSocketUrl(); // "ws://localhost:3001"
const reconnectAttempts = wsConfig.reconnectAttempts; // 5
```

### Feature Flags

```typescript
import { isFeatureEnabled } from '@/lib/config';

if (isFeatureEnabled('enableDashboardBuilder')) {
  // Show dashboard builder
}

if (isFeatureEnabled('enableWebSocket')) {
  // Initialize WebSocket connection
}
```

### Storage Keys

```typescript
import { authConfig, dashboardConfig, uiConfig } from '@/lib/config';

// Auth
const tokenKey = authConfig.tokenKey; // "iot_access_token"

// Dashboard
const layoutKey = `${dashboardConfig.storageKey}_${dashboardId}`;

// Theme
const themeKey = uiConfig.themeKey; // "iot_theme"
```

---

## Migration Patterns

### Before: useState

```typescript
// ❌ OLD
const [isOpen, setIsOpen] = useState(false);

<button onClick={() => setIsOpen(true)}>Open</button>
```

### After: Redux

```typescript
// ✅ NEW
const modal = useAppSelector(selectDeviceFormModal);

<button onClick={() => dispatch(openDeviceForm({ type: 'create' }))}>
  Open
</button>
```

---

## Common Patterns

### Derived State

```typescript
// Get multiple related values
const { user, isAuthenticated, isLoading } = useAppSelector((state) => ({
  user: state.auth.user,
  isAuthenticated: state.auth.isAuthenticated,
  isLoading: state.auth.isLoading,
}));
```

### Conditional Rendering

```typescript
const isAuthenticated = useAppSelector(selectIsAuthenticated);
const theme = useAppSelector(selectTheme);
const isEditMode = useAppSelector(selectEditMode);

if (!isAuthenticated) return <LoginPage />;
if (isEditMode) return <DashboardEditor />;
if (theme === 'dark') return <DarkThemeLayout />;
```

### Form Submission

```typescript
const dispatch = useAppDispatch();

const handleSubmit = async (formData) => {
  dispatch(setLoading(true));

  try {
    const response = await apiClient.post('/devices', formData);
    dispatch(showToast({ message: 'Device created!', type: 'success' }));
    dispatch(closeDeviceForm());
  } catch (error) {
    dispatch(setError(error.message));
    dispatch(showToast({ message: 'Failed to create device', type: 'error' }));
  } finally {
    dispatch(setLoading(false));
  }
};
```

---

**Last Updated:** 2026-02-14
