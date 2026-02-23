# CURRENT_DECISIONS: Application RBAC Fix + Dashboard List/Detail UI (ADR-025)

## What Changed (Task 4)

**1. Backend RBAC Fix:**
- Added missing permissions to `rbac.middleware.ts` PERMISSIONS map:
  - `application:create`: ['SuperAdmin', 'Admin']
  - `application:read`: ['SuperAdmin', 'Admin', 'Operator', 'Viewer']
  - `application:manage`: ['SuperAdmin', 'Admin']
- Fixed 403 Forbidden error on application creation

**2. New Pages:**
- `/dashboards` — List page: table of user dashboards with name, block count, updated date
- `/dashboards/[dashboardId]` — Detail/builder page: loads dashboard and renders DashboardBuilder
- Create Dashboard modal: on both list page and Application Detail Dashboards tab

**3. Sidebar Navigation:**
- `Dashboards` item now points to `/dashboards` (was `/dashboard-builder`)
- `/dashboard-builder` and `/dashboard` routes still exist but unmapped from nav

**4. Application Detail Update:**
- Dashboards tab now lists dashboards scoped to applicationId
- "Create Dashboard" button opens modal (applicationId preset)
- Dashboard names are clickable links → `/dashboards/[dashboardId]`

## Technical Implications

- **Backend Support:** Dashboard model already has `applicationId` FK; no new backend endpoints needed
- **Component Reuse:** DashboardBuilder accepts `dashboardId` from URL params (was hardcoded "main")
- **API Integration:** Uses existing `GET /dashboards` and `POST /dashboards/:id` endpoints
- **Filtering:** Client-side applicationId filtering matches ADR-024 pattern (route-based scoping)
- **Build Status:** Web app compiles successfully; RBAC fix requires no deployment blocker

## Constraints

1. **Old Routes:** `/dashboard` and `/dashboard-builder` still accessible but not recommended
2. **Application Hierarchy:** Dashboards fully scoped to applications; can't cross-create
3. **Dashboard Ownership:** Owned by user who created it + belongs to organization + application
