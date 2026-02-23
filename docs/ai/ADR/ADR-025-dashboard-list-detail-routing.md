# ADR-025: Dashboard as Named Entities with List/Detail Routing

## Status
Accepted — 2026-02-23

## Context
The current dashboard implementation uses a single hardcoded `/dashboard-builder` page
with `dashboardId="main"`. The Dashboard model already exists in MongoDB with `name`,
`blocks`, `layouts`, `applicationId`, `isShared` fields, and 6 backend API routes
(`GET /dashboards`, `GET /dashboards/:dashboardId`, etc.). The frontend does not expose
the multi-dashboard capability.

The expected product behavior (confirmed by user) is:
- A dashboard list page showing all saved dashboards
- Clicking a dashboard in the list opens it in view/edit mode
- Dashboards are created, named, edited, and deleted as entities
- Inside an Application, the Dashboards tab lists dashboards scoped to that application

## Decision

1. **Route structure:**
   - `/dashboards` → List page (all user dashboards, card/table layout)
   - `/dashboards/new` → Create dialog (name + description + applicationId from context)
   - `/dashboards/[dashboardId]` → Full DashboardBuilder for that dashboard
   - `/applications/[applicationId]` → Dashboards tab lists scoped dashboards

2. **Navigation:** Sidebar "Dashboards" link → `/dashboards` (was `/dashboard-builder`)

3. **DashboardBuilder** becomes the detail page at `/dashboards/[dashboardId]`; receives
   dashboardId from URL params (not hardcoded).

4. **Application scoping:** Creating a dashboard from within an Application Detail page
   sets `applicationId` automatically (ADR-024 pattern). Global `/dashboards` shows all.

5. **Old pages retired:** `/dashboard` (static live demo) and `/dashboard-builder`
   (hardcoded single builder) are replaced by the new routing.

## Consequences
- New page: `/dashboards` (list)
- New page: `/dashboards/[dashboardId]` (builder detail)
- DashboardBuilder component updated to accept dashboardId as prop from URL
- Application Detail "Dashboards" tab: fetch scoped dashboards, render list + Create button
- Sidebar nav updated: Dashboards → `/dashboards`
- Old `/dashboard` and `/dashboard-builder` pages removed or redirected
