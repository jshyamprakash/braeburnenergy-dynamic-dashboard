# ADR-024: Implicit Application Context via Route-Based Scoping

## Status
Accepted — 2026-02-23

## Context
ADR-023 established that Device, Workflow, and Dashboard entities all carry an `applicationId`
foreign key. The initial implementation added explicit `applicationId` dropdown selectors to
DeviceForm and CreateWorkflowModal. This is incorrect: it forces users to manually associate
entities to an application and allows entities to exist without application scope.

The correct model (per product intent) is that application context is **implicit via routing**.
When a user is inside an Application, ALL entities they create, view, or edit are automatically
scoped to that Application. There is no cross-application entity selection.

## Decision
Application context is established by the URL route, not by form field selection.

**Routing structure:**
```
/applications                    ← list all applications
/applications/[slug]             ← Application Detail hub (devices + workflows + dashboards)
/applications/[slug]/devices     ← Device list scoped to application (optional sub-route)
```

**Rules:**
1. All entity creation within `/applications/[slug]` inherits `applicationId` from the route.
2. DeviceForm and CreateWorkflowModal must NOT contain applicationId selectors.
3. The Application Detail page is the primary entry point for all application-scoped work.
4. Global `/devices` and `/workflows` routes remain for SuperAdmin cross-app administration.
5. Dashboard blocks are already scoped to the application — no separate application selector.

## Consequences
- Remove `applicationId` dropdowns from DeviceForm and CreateWorkflowModal
- Build `/applications/[slug]` Application Detail page with three sections:
  Devices tab, Workflows tab, Dashboards tab — all filtered by applicationId
- Create/Edit actions on the detail page pass applicationId from URL params, not form
- ARCH_SUMMARY routes section updated to include `/applications/[slug]`
- ADR-023 Rule 1 ("Application first") is enforced at the navigation level, not form level
- SuperAdmin global views (/devices, /workflows) remain unaffected
