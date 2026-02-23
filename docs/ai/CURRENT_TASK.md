# CURRENT TASK: Application RBAC Fix + Dashboard List/Detail UI (ADR-025)

## Goal
Fix the "Forbidden" bug on application create/manage, then build the dashboard list
and detail pages per ADR-025 (named entities with list/detail routing).

## Bug Fix — Application RBAC (CRITICAL, do first)
**File:** `iot-platform/apps/api/src/middleware/rbac.middleware.ts`
**Problem:** `application:create`, `application:read`, `application:manage` are missing
from the PERMISSIONS map. `hasPermission()` returns false for undefined keys → 403 for all users.
**Fix:** Add three entries to the PERMISSIONS constant:
```
'application:create': ['SuperAdmin', 'Admin'],
'application:read':   ['SuperAdmin', 'Admin', 'Operator', 'Viewer'],
'application:manage': ['SuperAdmin', 'Admin'],
```

## Dashboard List Page — `/dashboards`
- Fetch `GET /dashboards` → display cards or table rows (name, block count, updated date)
- "Create Dashboard" button → modal (name + description fields) → `POST /dashboards/:id`
- Row click → navigate to `/dashboards/[dashboardId]`
- Delete action per row (confirm pattern)
- ProtectedRoute + dark mode

## Dashboard Detail/Builder Page — `/dashboards/[dashboardId]`
- Load dashboard by ID: `GET /dashboards/:dashboardId`
- Render DashboardBuilder component with dashboardId from URL param
- DashboardBuilder: update to use dashboardId prop from URL (remove hardcoded "main")
- Blocks can be added, moved, resized, configured (existing DashboardBuilder capability)
- Save button persists via existing `POST/PUT /dashboards/:dashboardId` endpoint

## Application Detail — Dashboards Tab
- Replace placeholder with: fetch `GET /dashboards`, filter by `applicationId`
- Show list of scoped dashboards; "Create Dashboard" → modal with applicationId preset
- Dashboard name → link to `/dashboards/[dashboardId]`

## Navigation Update
- Sidebar "Dashboards" link → `/dashboards` (was `/dashboard-builder`)
- Remove or redirect old `/dashboard-builder` and `/dashboard` routes

## Constraints
- Dashboard model already has `applicationId` FK (no backend changes needed for ADR-025)
- Backend routes already exist: `GET /dashboards`, `GET /dashboards/:id`, save, delete, share
- DashboardBuilder component at `/components/dashboard/DashboardBuilder.tsx` is reused
- RBAC fix is backend-only, no frontend changes needed for the fix itself
