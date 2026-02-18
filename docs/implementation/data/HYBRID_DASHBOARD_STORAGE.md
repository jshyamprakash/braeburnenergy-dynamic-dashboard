# Hybrid Dashboard Storage System

**Status:** ✅ Implemented (2026-02-14)
**Type:** Cross-Device Sync with Local Cache

---

## Overview

The IoT Platform implements a **hybrid dashboard storage system** that combines the speed of localStorage with the reliability of backend database storage. This enables:

- ✅ **Instant local saves** (works offline)
- ✅ **Cross-device sync** (access dashboards anywhere)
- ✅ **Automatic conflict resolution** (backend is source of truth)
- ✅ **Graceful offline fallback** (localStorage cache)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard Builder UI                  │
│         (DashboardBuilder component + Redux)            │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ Hybrid Sync Strategy
                 │
        ┌────────▼───────────┐
        │                    │
   ┌────▼─────┐      ┌──────▼──────┐
   │          │      │             │
   │ Browser  │      │  Backend    │
   │localStorage│◄────►│  MongoDB   │
   │          │      │             │
   │ (Cache)  │      │ (Source of  │
   │ (Fast)   │      │  Truth)     │
   └──────────┘      └─────────────┘
```

### Component Breakdown

1. **Frontend (Redux + localStorage)**
   - `apps/web/lib/store/slices/dashboardSlice.ts` - Redux slice with async thunks
   - `apps/web/components/dashboard/DashboardBuilder.tsx` - UI component
   - localStorage: `iot_dashboard_layout_{dashboardId}`

2. **Backend (MongoDB)**
   - `apps/api/src/models/dashboard.model.ts` - Mongoose schema
   - `apps/api/src/services/dashboard.service.ts` - Business logic
   - `apps/api/src/controllers/dashboard.controller.ts` - HTTP handlers
   - `apps/api/src/routes/dashboard.routes.ts` - API endpoints
   - MongoDB collection: `dashboards`

---

## Data Flow

### 1. Dashboard Load (Component Mount)

```typescript
useEffect(() => {
  // Step 1: Load from localStorage immediately (instant)
  dispatch(initializeDashboard(dashboardId));

  // Step 2: Load from backend (sync)
  dispatch(loadDashboardFromBackend(dashboardId));
}, [dashboardId]);
```

**Sequence:**
1. Component renders with empty state
2. localStorage loads instantly (< 1ms)
3. Component re-renders with cached data
4. Backend API call initiates
5. If backend has newer data, component re-renders with synced data
6. Backend data saved to localStorage for next offline session

**Result:** User sees cached data instantly, then syncs silently in background.

---

### 2. Dashboard Save (Auto-save)

```typescript
useEffect(() => {
  if (isDirty) {
    const timer = setTimeout(() => {
      // Hybrid sync (localStorage + backend)
      dispatch(syncDashboardWithBackend());
    }, 1000); // 1 second debounce

    return () => clearTimeout(timer);
  }
}, [isDirty]);
```

**Sequence (Online):**
1. User modifies dashboard (adds block, changes layout)
2. Redux marks state as `isDirty`
3. Auto-save timer starts (1 second debounce)
4. Timer fires → `syncDashboardWithBackend()`
5. **Step 1:** Save to localStorage (always succeeds, even offline)
6. **Step 2:** POST to backend API `/dashboards`
7. Backend responds with updated dashboard
8. Redux updates `lastSaved` timestamp
9. Redux marks `syncStatus = 'synced'`

**Sequence (Offline):**
1-5. Same as online
6. Backend call fails (network error)
7. Redux marks `syncStatus = 'idle'` (localStorage save succeeded)
8. User sees "Offline mode - changes saved locally" toast

**Result:** Changes are always saved locally, backend sync is opportunistic.

---

### 3. Online/Offline Detection

```typescript
useEffect(() => {
  const handleOnline = () => {
    dispatch(setOnlineStatus(true));
    toast.success('Back online - dashboard will sync');

    // Sync pending changes
    if (isDirty) {
      dispatch(syncDashboardWithBackend());
    }
  };

  const handleOffline = () => {
    dispatch(setOnlineStatus(false));
    toast.warning('Offline mode - changes saved locally');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => { /* cleanup */ };
}, []);
```

**Behavior:**
- Detects browser online/offline events
- When coming back online, automatically syncs pending changes
- Shows user-friendly toast notifications
- Updates sync status indicator in UI

---

## API Endpoints

### Backend Routes

All routes are registered in `apps/api/src/server.ts` under tag `Dashboards`.

#### 1. Get User Dashboards

```http
GET /dashboards
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "userId": "admin",
      "organizationId": "aaaaaaaaaaaaaaaaaaaaaaaa",
      "dashboardId": "default",
      "name": "My Dashboard",
      "description": "Main monitoring dashboard",
      "blocks": [...],
      "layouts": {...},
      "isShared": false,
      "sharedWith": [],
      "createdAt": "2026-02-14T10:30:00.000Z",
      "updatedAt": "2026-02-14T12:45:00.000Z"
    }
  ]
}
```

#### 2. Get Specific Dashboard

```http
GET /dashboards/:dashboardId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dashboardId": "default",
    "blocks": [
      {
        "id": "block_1707912345678",
        "type": "gauge",
        "layouts": {
          "lg": { "i": "block_1707912345678", "x": 0, "y": 0, "w": 2, "h": 5 },
          "md": { "i": "block_1707912345678", "x": 0, "y": 0, "w": 3, "h": 5 },
          "sm": { "i": "block_1707912345678", "x": 0, "y": 0, "w": 3, "h": 5 }
        },
        "config": {
          "title": "Temperature",
          "deviceId": "01KGPQZ53TRMAG5Y1H2S2SHPVG",
          "gaugeConfig": {
            "min": 0,
            "max": 100,
            "unit": "°C",
            "warningThreshold": 30,
            "criticalThreshold": 40
          }
        }
      }
    ],
    "layouts": {
      "lg": [{ "i": "block_1707912345678", "x": 0, "y": 0, "w": 2, "h": 5 }],
      "md": [...],
      "sm": [...]
    }
  }
}
```

#### 3. Save Dashboard (Upsert)

```http
POST /dashboards
Content-Type: application/json

{
  "dashboardId": "default",
  "organizationId": "aaaaaaaaaaaaaaaaaaaaaaaa",
  "name": "My Dashboard",
  "description": "Updated dashboard",
  "blocks": [...],
  "layouts": {...}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
    "dashboardId": "default",
    "name": "My Dashboard",
    "description": "Updated dashboard",
    "blocks": [...],
    "layouts": {...},
    "createdAt": "2026-02-14T10:30:00.000Z",
    "updatedAt": "2026-02-14T13:00:00.000Z"
  },
  "message": "Dashboard saved successfully"
}
```

#### 4. Delete Dashboard

```http
DELETE /dashboards/:dashboardId
```

**Response:**
```json
{
  "success": true,
  "message": "Dashboard deleted successfully"
}
```

#### 5. Share Dashboard

```http
POST /dashboards/:dashboardId/share
Content-Type: application/json

{
  "sharedWith": ["user1", "user2"]
}
```

#### 6. Get Shared Dashboards

```http
GET /dashboards/shared/all
```

---

## Redux State Structure

```typescript
interface DashboardState {
  // Dashboard metadata
  dashboardId: string;              // "default"
  organizationId: string;           // "aaaaaaaaaaaaaaaaaaaaaaaa"
  name: string;                     // "My Dashboard"
  description: string;              // "Main monitoring dashboard"

  // Dashboard content
  blocks: DashboardBlock[];         // Array of gauge/chart/liveStream blocks
  layouts: Layouts;                 // Responsive layouts (lg, md, sm)

  // UI state
  isEditMode: boolean;              // Edit mode toggle
  selectedBlockId: string | null;   // Currently selected block

  // Local changes
  isDirty: boolean;                 // Unsaved changes
  lastSaved: number | null;         // Timestamp of last save

  // Sync state
  syncStatus: 'idle' | 'loading' | 'syncing' | 'synced' | 'error';
  syncError: string | null;         // Error message if sync fails
  isOnline: boolean;                // Browser online/offline status
}
```

---

## Async Thunks (Redux Toolkit)

### 1. Load Dashboard from Backend

```typescript
dispatch(loadDashboardFromBackend(dashboardId));
```

**States:**
- `pending` → syncStatus = 'loading'
- `fulfilled` → Updates blocks/layouts, saves to localStorage
- `rejected` → syncStatus = 'error', keeps localStorage data

### 2. Save Dashboard to Backend

```typescript
dispatch(saveDashboardToBackend({
  dashboardId,
  organizationId,
  name,
  description,
  blocks,
  layouts,
}));
```

**States:**
- `pending` → syncStatus = 'syncing'
- `fulfilled` → syncStatus = 'synced', updates lastSaved
- `rejected` → syncStatus = 'error', localStorage still has data

### 3. Sync Dashboard with Backend (Hybrid)

```typescript
dispatch(syncDashboardWithBackend());
```

**Flow:**
1. Saves to localStorage (always succeeds)
2. If online, calls `saveDashboardToBackend`
3. If offline, returns `{ synced: false, reason: 'offline' }`

**Return Values:**
- `{ synced: true, data: {...} }` - Backend sync succeeded
- `{ synced: false, reason: 'offline' }` - Offline, localStorage only
- Rejects with `{ synced: false, reason: 'backend-error', error: '...' }`

---

## Sync Status Indicators

The DashboardBuilder UI shows real-time sync status:

| Status | Icon | Color | Meaning |
|--------|------|-------|---------|
| `loading` | Pulse dot | Blue | Loading from backend |
| `syncing` | Pulse dot | Blue | Saving to backend |
| `synced` | Checkmark | Green | Fully synced with backend |
| `error` | Warning | Red | Sync failed (saved locally) |
| `offline` | Offline icon | Orange | No network (localStorage only) |

**UI Code:**
```tsx
{syncStatus === 'synced' && !isDirty && (
  <div className="flex items-center gap-2 text-xs text-green-600">
    <CheckIcon />
    <span>Synced</span>
  </div>
)}
```

---

## Conflict Resolution

**Strategy:** Backend is the source of truth.

### Scenario 1: User edits on Device A, then opens Device B

1. Device B loads from localStorage (stale data from previous session)
2. Device B calls backend API
3. Backend returns latest data from Device A
4. Device B overwrites localStorage with backend data
5. User sees up-to-date dashboard

**Result:** ✅ No conflict, backend wins

### Scenario 2: User edits offline on Device A, edits online on Device B

1. Device A edits offline (localStorage only)
2. Device B edits online (localStorage + backend synced)
3. Device A comes back online
4. Device A loads from backend → gets Device B's changes
5. Device A's offline changes are **lost** (backend wins)

**Result:** ⚠️ Offline changes may be overwritten

**Future Enhancement:** Implement last-write-wins with timestamp comparison or CRDTs for conflict-free merging.

### Scenario 3: Multiple browser tabs on same device

1. Tab A and Tab B both edit dashboard
2. Both tabs share same localStorage
3. Both tabs sync to backend
4. Last POST to backend wins

**Result:** ⚠️ Last tab to save overwrites others

**Current Limitation:** No real-time sync between tabs (would require WebSocket or BroadcastChannel).

---

## Offline Support

### localStorage Cache

**Key Pattern:** `iot_dashboard_layout_{dashboardId}`

**Data Structure:**
```json
{
  "blocks": [...],
  "layouts": {...},
  "timestamp": 1707912345678
}
```

**Cache Strategy:**
- **Write:** Every save (both auto-save and manual save)
- **Read:** Component mount (before backend API call)
- **Invalidation:** When backend returns newer data
- **Persistence:** Survives browser restart, no expiry

### Offline Detection

**Browser APIs:**
- `navigator.onLine` - Initial online status
- `window.addEventListener('online', ...)` - Network restored
- `window.addEventListener('offline', ...)` - Network lost

**Behavior:**
- Offline → Auto-save continues (localStorage only)
- Online → Pending changes sync to backend
- User sees toast notifications for status changes

---

## Performance Characteristics

| Operation | localStorage | Backend API | Total UX |
|-----------|--------------|-------------|----------|
| Load dashboard | < 1ms | 50-200ms | Instant (cached) + silent sync |
| Save dashboard | < 1ms | 100-500ms | Instant feedback + background sync |
| Delete dashboard | < 1ms | 100-300ms | Instant |
| Conflict check | N/A | 50-200ms | On load only |

**Optimization:**
- **Debounced auto-save:** 1 second delay prevents excessive writes
- **Optimistic UI:** Changes appear instantly (no waiting for backend)
- **Async thunks:** Non-blocking background sync
- **localStorage first:** Ensures instant UX even if backend is slow

---

## Security & Multi-Tenancy

### Current Implementation (POC)

**Authentication:** Hardcoded `userId = 'admin'` in controller (marked TODO)

**Authorization:** None (all users can access all dashboards)

**Multi-Tenancy:** Organization ID included in schema but not enforced

### Production Requirements

**TODO (MVP Phase):**

1. **JWT Authentication:**
```typescript
// In controller
const userId = request.user.id; // From JWT token
```

2. **Row-Level Security:**
```typescript
// Only return user's own dashboards
const dashboards = await Dashboard.find({ userId });
```

3. **Organization Scoping:**
```typescript
// Only return dashboards from user's organization
const dashboards = await Dashboard.find({
  userId,
  organizationId: request.user.organizationId
});
```

4. **Shared Dashboards:**
```typescript
// Return owned + shared dashboards
const dashboards = await Dashboard.find({
  $or: [
    { userId },
    { isShared: true, sharedWith: userId }
  ]
});
```

---

## Testing

### Unit Tests (TODO)

**Backend:**
- `DashboardService.saveDashboard()` - Upsert logic
- `DashboardService.shareDashboard()` - Sharing logic
- `DashboardService.hasAccess()` - Permission checks

**Frontend:**
- `dashboardSlice` reducers
- `loadDashboardFromBackend` thunk
- `syncDashboardWithBackend` thunk
- Sync status transitions

### Integration Tests (TODO)

**API:**
- POST `/dashboards` - Create/update dashboard
- GET `/dashboards/:id` - Fetch dashboard
- DELETE `/dashboards/:id` - Delete cascade
- POST `/dashboards/:id/share` - Share workflow

**E2E:**
- Create dashboard → save → reload → verify persistence
- Edit dashboard offline → go online → verify sync
- Open dashboard on "Device A" → edit on "Device B" → reload "Device A" → verify sync

---

## Usage Examples

### Creating a New Dashboard

```typescript
import { useAppDispatch } from '@/lib/store';
import { initializeDashboard, addBlock } from '@/lib/store/slices/dashboardSlice';

function MyComponent() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Initialize dashboard (loads from cache + backend)
    dispatch(initializeDashboard('my-custom-dashboard'));
  }, []);

  const handleAddGauge = () => {
    dispatch(addBlock({
      id: `block_${Date.now()}`,
      type: 'gauge',
      layouts: { lg: {...}, md: {...}, sm: {...} },
      config: {
        title: 'Temperature',
        deviceId: '01KGPQZ53TRMAG5Y1H2S2SHPVG',
        gaugeConfig: { min: 0, max: 100, unit: '°C' }
      }
    }));
  };

  return <button onClick={handleAddGauge}>Add Gauge</button>;
}
```

### Manual Save

```typescript
import { syncDashboardWithBackend } from '@/lib/store/slices/dashboardSlice';

const handleSaveClick = async () => {
  const result = await dispatch(syncDashboardWithBackend());

  if (syncDashboardWithBackend.fulfilled.match(result)) {
    const payload = result.payload;
    if (payload.synced) {
      toast.success('Saved to cloud');
    } else {
      toast.warning('Saved locally (offline)');
    }
  }
};
```

### Monitoring Sync Status

```typescript
import { useAppSelector } from '@/lib/store';
import { selectSyncStatus, selectIsOnline } from '@/lib/store/slices/dashboardSlice';

function SyncIndicator() {
  const syncStatus = useAppSelector(selectSyncStatus);
  const isOnline = useAppSelector(selectIsOnline);

  if (syncStatus === 'syncing') {
    return <span>Syncing...</span>;
  }

  if (!isOnline) {
    return <span>Offline mode</span>;
  }

  if (syncStatus === 'synced') {
    return <span>✓ Synced</span>;
  }

  return null;
}
```

---

## Future Enhancements

### Phase 2 (MVP)

1. **Real-time Collaboration**
   - WebSocket notifications when dashboard is edited by others
   - BroadcastChannel API for cross-tab sync
   - Operational Transforms (OT) for concurrent edits

2. **Versioning & History**
   - Store dashboard snapshots with timestamps
   - Rollback to previous versions
   - Audit trail of changes

3. **Conflict Resolution**
   - Timestamp-based last-write-wins
   - Diff visualization (show what changed)
   - User choice: "Keep local" vs "Use cloud version"

### Phase 3 (Enterprise)

4. **Dashboard Templates**
   - Pre-built dashboard templates
   - Clone/duplicate dashboards
   - Organization-wide template library

5. **Granular Permissions**
   - Read-only vs Edit permissions
   - Share with specific users/roles
   - Public dashboards (view-only links)

6. **Advanced Sync**
   - CRDTs (Conflict-free Replicated Data Types)
   - Merge strategies for concurrent edits
   - Sync queue with retry logic

---

## Troubleshooting

### Dashboard Not Syncing

**Symptoms:**
- Sync status shows "Error"
- Changes lost after browser restart

**Checks:**
1. Verify backend API is running: `curl http://localhost:3001/health`
2. Check browser console for network errors
3. Verify online status: `navigator.onLine` in DevTools console
4. Check localStorage: `localStorage.getItem('iot_dashboard_layout_default')`

**Solutions:**
- If offline: Changes saved locally, will sync when online
- If backend error: Check server logs, verify MongoDB connection
- If localStorage full: Clear old dashboards, implement cache eviction

### Changes Lost After Reload

**Cause:** Backend sync failed, browser cache cleared

**Prevention:**
- Monitor sync status indicator
- Manual save before closing browser
- Enable "Synced" confirmation before navigation

**Recovery:**
- localStorage backup still exists (if not cleared)
- Check browser history: DevTools → Application → Local Storage

### Slow Dashboard Load

**Symptoms:**
- Dashboard takes 3-5 seconds to load
- Spinner shows for extended time

**Diagnosis:**
- Check `syncStatus` transitions: loading → synced
- Network tab: Look for slow `/dashboards/:id` request
- MongoDB performance: Check indexes on `userId + dashboardId`

**Optimization:**
- Add database indexes: `Dashboard.index({ userId: 1, dashboardId: 1 })`
- Reduce blocks size: Paginate large dashboards
- Enable backend caching (Redis)

---

## Summary

The **Hybrid Dashboard Storage System** provides:

✅ **Instant UX** - localStorage cache for zero-latency saves
✅ **Cross-Device Sync** - Backend database for multi-device access
✅ **Offline Support** - Works without network, syncs when online
✅ **Automatic Sync** - No manual sync button required
✅ **Visual Feedback** - Real-time sync status indicators

**Trade-offs:**
- Backend is source of truth (offline edits may be lost)
- No real-time collaboration (last write wins)
- Simple conflict resolution (no merge strategies)

**Ready for POC/MVP** - Production-ready with TODO notes for authentication and advanced features.

---

**Last Updated:** 2026-02-14
**Status:** Fully Implemented
**Next Steps:** Add JWT authentication, implement conflict resolution UI

