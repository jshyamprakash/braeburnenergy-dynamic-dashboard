# CURRENT_DECISIONS: POC Demo UX Polish (5 tasks)

## What Changed

**Task 1 — NodeConfigPanel device-select picker:**
- Added `'device-select'` to `FieldSchema` type union in NodeConfigPanel
- `trigger:deviceStateChange`, `action:writeDeviceState`, `data:queryDeviceStates` deviceId fields → `type: 'device-select'`
- Renders `<select>` populated via `useDevices()` hook; filters by `applicationId` when present in Redux

**Task 2 — GaugeBlock fallback fix:**
- `DashboardBuilder.tsx`: `block.config.value || 75` → `block.config.min ?? 0`
- Gauges now show 0 (not 75) when no live data; correct min-value fallback

**Task 3 — Device detail ULID copy + simulator command:**
- Copy-to-clipboard button next to device ULID on device detail page
- Ready-to-run simulator command block: `pnpm run simulate -- --deviceId <ULID> --interval 1s`
- Uses `navigator.clipboard.writeText`, 2-second "Copied!" feedback state

**Task 4 — Application-scoped device picker:**
- `/dashboards/[dashboardId]/page.tsx`: fetches dashboard → extracts `applicationId` → passes to `DashboardBuilder`
- `DashboardBuilder`: added `applicationId?: string` prop → passes to `BlockConfigPanel`
- `BlockConfigPanel`: `filteredDevices = applicationId ? devices.filter(d.applicationId===applicationId) : devices`

**Task 5 — Application Detail POC Setup Guide:**
- Detects: `devices.length === 0 || workflows.length === 0 || dashboards.length === 0`
- Renders 4-step checklist (Add Device, Run Simulator, Create Workflow, Create Dashboard)
- Each step shows green check when complete, blue circle with number when pending
- Banner hidden automatically when all steps are complete

## Technical Implications
- Device picker in NodeConfigPanel reads from global device list; `applicationId` filter is client-side
- Dashboard detail page now requires one extra API call (GET /dashboards/:id) to resolve applicationId
- ULID copy uses navigator.clipboard (requires HTTPS or localhost)

## Constraints
1. NodeConfigPanel device-select filter relies on Redux `workflowSlice.applicationId` being set
2. Application setup banner only checks count > 0, not actual configuration completeness
3. Simulator command block hardcodes `--interval 1s` (adjust if needed per device)
