# FEATURE_TASKS: Application RBAC Fix + Dashboard List/Detail UI (ADR-025)

## Tasks

1. [ ] **RBAC Fix:** Add `application:create`, `application:read`, `application:manage` to PERMISSIONS map in `rbac.middleware.ts`
2. [ ] Create `/dashboards` list page: fetch `GET /dashboards`, render cards (name, block count, updated date)
3. [ ] Add "Create Dashboard" button on list page: modal with name + description → `POST /dashboards/:id` (ULID)
4. [ ] Add delete action per dashboard row (confirm dialog pattern)
5. [ ] Create `/dashboards/[dashboardId]/page.tsx`: load dashboard from `GET /dashboards/:dashboardId`
6. [ ] Update `DashboardBuilder` component: accept `dashboardId` prop from URL instead of hardcoded "main"
7. [ ] Embed DashboardBuilder in detail page; save button uses existing `POST /dashboards/:dashboardId`
8. [ ] Update Application Detail Dashboards tab: fetch and filter dashboards by `applicationId`, render list
9. [ ] Application Detail Dashboards tab: "Create Dashboard" opens modal with `applicationId` preset
10. [ ] Application Detail Dashboards tab: dashboard name is clickable link → `/dashboards/[dashboardId]`
11. [ ] Update sidebar nav: "Dashboards" link → `/dashboards`
12. [ ] Remove or redirect `/dashboard` and `/dashboard-builder` routes (or keep as legacy redirect)
13. [ ] Verify build; verify create dashboard → appears in list → opens builder → save persists
