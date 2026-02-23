# CURRENT_DECISIONS: Application Detail Page + Context Selector Cleanup (ADR-024)

## What Changed

1. **New Page:** `/applications/[applicationId]/page.tsx`
   - Application Detail hub with three tabs: Devices, Workflows, Dashboards
   - Displays application name, slug, and active status in header
   - Filters and displays scoped entities (devices/workflows filtered by applicationId)
   - "Add Device" and "Add Workflow" buttons pass applicationId as props

2. **DeviceForm Cleanup:**
   - Added `applicationId?: string` prop to `DeviceFormProps`
   - Removed applicationId state, fetch logic, and dropdown UI
   - Submit payload uses `props.applicationId` via spread operator

3. **CreateWorkflowModal Cleanup:**
   - Added `applicationId?: string` prop to `CreateWorkflowModalProps`
   - Removed applicationId from FormData interface and INITIAL_FORM_STATE
   - Removed applications fetch and handleApplicationChange handler
   - Application dropdown UI section removed

4. **Applications List Page:**
   - Application names now clickable links → `/applications/[applicationId]`
   - Updated /applications/page.tsx with Link import and href

## Technical Implications

- **Routing Pattern:** ADR-024 Rule 1 enforced — application context implicit via URL route, not form selection
- **Client-Side Filtering:** Devices and workflows filtered by applicationId after fetch (not backend-filtered)
- **Prop Propagation:** applicationId extracted from route params and passed down component tree
- **Form Decoupling:** Forms no longer responsible for selecting application scope — parent context provides scope
- **Build Success:** Web app compiles without TypeScript errors; backend has pre-existing Fastify type issues (unrelated)

## Constraints Introduced

1. **Global Views Unchanged:** `/devices` and `/workflows` routes (SuperAdmin views) remain unaffected
2. **Dark Mode Required:** Detail page uses ProtectedRoute + dark mode classes throughout
3. **Dashboards Placeholder:** Dashboards tab is "coming soon" — not integrated yet
4. **No Backend Changes Needed:** All filtering done client-side; existing endpoints reused
5. **ULID Routing:** Route param is applicationId (ULID), not slug-based routing
