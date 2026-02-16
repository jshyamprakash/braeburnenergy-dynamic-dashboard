# ADR-013: Hybrid Dashboard Storage

## Status
Accepted (2026-02-14)

## Context
- Need dashboards to work offline and sync across devices
- Requirements: instant load, cross-device sync, offline capability
- Alternative: MongoDB only (no offline), localStorage only (no sync)

## Decision
Implement hybrid storage: localStorage (cache) + MongoDB (persistence)

**Sync Strategy:**
- Load: Try localStorage → Fallback to API
- Save: Write localStorage + Debounced API call (1 second)
- Conflict: Server timestamp wins (last-write-wins)
- Offline: Queue writes, sync when online

**Implementation:**
- Redux dashboardSlice with syncStatus
- Online/offline detection via `navigator.onLine`
- `dashboard-storage.ts` utility module

## Consequences

### Positive
- Instant page load (no API roundtrip)
- Works offline (view existing layouts)
- Cross-device sync (mobile, desktop)
- Data backup and sharing (MongoDB)

### Negative
- Sync complexity (conflict resolution)
- Storage duplication (local + server)
- localStorage limits (5-10MB)
- Stale data risk if API fails
