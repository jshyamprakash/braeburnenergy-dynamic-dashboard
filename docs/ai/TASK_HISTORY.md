# Task History

## Completed

- ADR-039 Dashboard Derived State Endpoint — GET /devices/:deviceId/derived-state added (DeviceStateController + route); useDeviceRealtime queryFn switched from /states/latest (time-series) to /derived-state (device_derived_states); staleMeta seeded from API response; RealTimeGaugeBlock verified compatible
- Historical Trend Charts on IOT Operations Dashboard (all 12 tasks: hook time-range support, timeRange selector UI, 4 chart blocks in seed, DashboardBuilder integration, field filtering)
- ADR-031 End-to-End Verification & Demo Hardening (all 13 tasks: seed script fixed, backend verified, simulator triggers workflows, derived state written to MongoDB, WebSocket broadcasts verified, frontend hooks correct)
- Visual Workflow Editor Week 2: React Flow Canvas (nodes, edges, palette, list/builder pages)
- Visual Workflow Editor Week 3.1: NodeConfigPanel (dynamic forms for 19 node types, tabbed UI, Redux sync)
- Visual Workflow Editor Week 3.2: Auto-Save (1-second debounce, smart save logic, dirty state tracking)
- Visual Workflow Editor Week 3.3: WorkflowToolbar extraction (Run, Validate, Export, Settings buttons, props interface)
- Visual Workflow Editor Week 3.4: Run Workflow action (ExecutionInputModal, executeWorkflow thunk, status badge, toast notifications)
- Visual Workflow Editor Week 3.5: Validation Panel (error display, click-to-navigate, error badges on nodes)
- Visual Workflow Editor Week 3.6: Export/Import Workflow (JSON download/upload, schema validation, ULID regeneration)
- Visual Workflow Editor Week 3.7: Settings Modal (workflow metadata editor, dark mode, validation)
- Visual Workflow Editor Week 3.8: Keyboard Shortcuts (Ctrl/Cmd+S/R/E, Delete key, Help modal, dark mode support)
- Visual Workflow Editor Week 4.1: WebSocket Execution Events (broadcast functions, Socket.io integration, backend streaming)
- Visual Workflow Editor Week 4.2: Execution Viewer WebSocket Subscription (useWorkflowExecutionUpdates hook, builder page integration, Redux dispatch)
- Visual Workflow Editor Week 4.3: Execution Viewer State & Thunks (executionHistory[], loadExecutionHistory, loadExecutionDetail)
- Visual Workflow Editor Week 4.4: Execution Viewer UI Components (ExecutionLogPanel, ExecutionHistoryList, ExecutionPanel, builder page integration)
- Visual Workflow Editor Week 4.5: Node Canvas Status Badges (StatusBadge component, Redux node status sync, 4 nodes updated)
- Visual Workflow Editor Week 5.1: Workflow Templates Library (5 starter templates, API endpoint, modal UI, sessionStorage pre-fill)
- Visual Workflow Editor Week 5.2: Node Right-Click Context Menu (configure, duplicate, delete, status display, click-outside/Escape close)
- Visual Workflow Editor Week 5.3: Node Copy-Paste (Ctrl+C/V, in-memory clipboard, offset paste, hook extension, help modal update)
- E2E Tests: Workflow Editor Critical Paths (Playwright setup, auth mocking, 3 tests for list/template/canvas)
- Alarm Management Dashboard (Redux alarmSlice, /alarms & /alarm-rules pages, real-time WebSocket feed, role-based actions)
- Modbus Gateway UI — REVERTED (page never implemented in web app; re-queued as active task 2026-03-03)
- Audit Log Viewer (EPA 21 CFR Part 11 compliant, statistics bar, filter bar, paginated table, detail panel, CSV export)
- Data Quality Dashboard (EPA QAPP quality scores per device, validation rules table, water quality compliance reports, sampling requirements)
- User Guide Documentation (/guide page, 9 content sections, CodeBlock component, IntersectionObserver TOC tracking, print support)
- Data Retention Policy UI (/retention-policies page, 4 category stat cards, policies table, storage tier bar visualization, create/edit/delete modals, SuperAdmin CRUD)
- Multi-Tenancy Organization UI (/organizations page, organizations table with pagination/search, per-org device+state stats, create/edit/delete modals, SuperAdmin CRUD, slug auto-generation)
- Profile & Account Settings Page (/profile page, profile info section, change password form with 5-check strength indicator, active sessions table, logout all devices modal, session refresh on password change)
- Workflow Node Taxonomy Alignment (Losant 5-category model, 4 Tier 1 nodes: data:modbusRead/Write/queryDeviceStates, logic:function)
- NodeConfigPanel Schemas for New Taxonomy Nodes (4 schema entries + defaultNodeConfig updates)
- Alarm Management Dashboard (Redux alarmSlice, /alarms & /alarm-rules pages, ISA-18.2 state machine, role-based actions)
- Audit Log Viewer (EPA 21 CFR Part 11 compliant, statistics bar, filter bar, paginated table, detail panel, CSV export)
- Workflow Section Sidebar Navigation (ADR-018: Losant-style context-sensitive sidebar, 3 sub-routes: /executions, /settings, execution history table with expandable logs, workflow metadata form)
- ADR-019 Phase 1: Global Sidebar Navigation (persistent left sidebar with collapsible menu, 13 nav items, TopBar with theme toggle + user menu, flex layout refactoring, localStorage persistence)
- ADR-019 Phase 2: Workflow CRUD + Canvas Refactor (15/15 tasks — COMPLETE)
  - Backend: Workflow type field (Application|Experience|Embedded|Edge)
  - CreateWorkflowModal: Modal-based create/edit (name, type, description)
  - SettingsPanel: Right-side settings (metadata + Redux sync)
  - ExecutionHistoryModal: Execution list viewer with step logs
  - WorkflowToolbar: [Save] [Deploy] [⋮] menu refactored
  - Canvas layout: 3-column (NodePalette | Canvas | SettingsPanel/NodeConfigPanel)
  - Save button: PATCH with metadata + nodes/edges, clears isDirty
  - Deploy button: POST execute + ExecutionHistoryModal wired
  - ADR-018 cleanup: Deprecated sub-routes + components deleted
- Workflow UI Polish (bug fixes + hyperlinks)
  - Fixed: Save failure when nodes added (node type mismatch + missing type field)
  - Fixed: Workflow list name now clickable link to open canvas
  - Fixed: Edit button opens canvas instead of metadata modal
  - Fixed: After creating workflow, auto-navigate to canvas
  - UX: Workflow names show as blue underlined hyperlinks
- Workflow Data & Variable Binding (7/10 tasks — CORE COMPLETE)
  - Backend: resolveExpression() utility for {{variable}} syntax
  - Backend: Context piping — each node output stored under nodeId key
  - Backend: Expression resolution in node config before handler execution
  - Backend: action:updateVariable handler (already existed, verified working)
  - Frontend: workflow-variables.ts utility (extract upstream variables, user variables)
  - Frontend: VariablePicker dropdown component (search, filter, insert)
  - Frontend: Integrated VariablePicker into NodeConfigPanel (detects {{ , shows dropdown)
- Workflow Execution Context Debugger (6/10 core tasks — FUNCTIONAL)
  - Redux: isDebugPanelOpen state + toggleDebugPanel action
  - Toolbar: Purple Debug button (inactive gray, active purple with shadow)
  - Panel scaffold: Bottom drawer with 3 tabs (Variables, Steps, Tester)
  - Variables tab: Extracted variables table from execution log
  - Steps tab: Expandable steps showing JSON output details
  - Builder integration: Wired panel toggle + auto-open ready
- Workflow Real-Time Auto-Trigger (ADR-020 — 11/11 tasks COMPLETE)
  - Workflow model: triggerType field + compound index (orgId, isEnabled, triggerType)
  - WorkflowService: findTriggerWorkflows() query method with filter support
  - WorkflowTriggerDispatcher: Fire-and-forget dispatch service (no circular deps)
  - Device state integration: dispatchDeviceStateChange() per-field dispatch after state save
  - Alarm integration: dispatchAlarmTriggered() dispatch after alarm creation
  - Backend wiring: Dispatcher instantiated in index.ts after Socket.io setup
  - Integration tests: 11 test cases covering device state + alarm triggers + filter matching
- triggerType Auto-Population Bug Fix (CRITICAL — 9/9 tasks COMPLETE)
  - WorkflowService.create(): Calls extractTriggerType(nodes) before save
  - WorkflowService.update(): Re-derives triggerType when nodes change
  - Unit tests: 3 tests covering create/update/no-update paths (workflow.service.test.ts)
  - Backfill script: One-time script to populate existing workflows (scripts/backfill-trigger-type.ts)
  - Fix enables ADR-020 dispatcher to find and execute matching workflows

- ADR-023 + Backend Application Model Foundation (8/12 core tasks — POC complete)
  - Application Mongoose model (ULID, slug, description, isActive, timestamps)
  - ApplicationService: CRUD with auto-slug generation, slug uniqueness, delete guards
  - ApplicationController: 5 routes with Swagger documentation
  - applicationId FK added to Device, Workflow, Dashboard models
  - Zod validation schemas + shared types
  - Tests ready for next session (optional Tasks #9-11)
- Application Management UI (Frontend) — /applications page with CRUD modals, sidebar nav, Device/Workflow form integration, no-apps banner
- Workflow Variable Binding from Device Attributes (ADR-023 Rule 3) — applicationId in Redux, device schema auto-fetch, datalist field suggestions, VariablePicker device schema section
- Application Detail Page + Context Selector Cleanup (ADR-024) — /applications/[applicationId] hub with Devices/Workflows/Dashboards tabs, scoped entity filtering, applicationId as prop from route context, remove form selectors
- Application RBAC Fix + Dashboard List/Detail UI (ADR-025) — Fixed application RBAC permissions, created /dashboards list page, /dashboards/[dashboardId] detail/builder page, updated sidebar nav, integrated dashboards tab in Application Detail page
- Dashboard Field Discovery + ULID Fix (ADR-026) — Fixed useDeviceFields schema bug (Object.keys vs .sensors[]), added DeviceFieldEntry interface with source tagging, ~ prefix for state-derived fields, POST /dashboards with ULID body, dashboard name in detail page header
- POC Phase 2 Foundations (A+B+D) — Simulator: --deviceId targeted mode + --applicationId flag + correct tags/attributes schemas; DeviceForm attributes editor verified complete; workflow-templates.ts: added Device State Processor template (trigger:deviceStateChange → condition:comparison → action:writeDeviceState) with correct data.nodeType fields and wired edges
- POC Demo UX Polish (5 tasks) — NodeConfigPanel device-select picker for deviceId fields; GaugeBlock fallback min??0; Device detail ULID copy + simulator command block; applicationId prop chain dashboard detail→DashboardBuilder→BlockConfigPanel with device filter; Application Detail POC Setup Guide banner (4-step checklist with green checkmarks)

- Dashboard Derived State Display (ADR-029) — writeDeviceState persists to device_derived_states
  (regular collection, works around MongoDB time series update restriction); castValue preserves
  native JS types; useDeviceRealtime rewritten with React Query (no useState flash); WebSocket
  handler merges raw sensor data + derived values across both broadcast types; RealTimeGaugeBlock
  reads derived??data with Number() coercion; gauges show raw + workflow-computed fields stably.

- POC Live Device Workflows + Dashboard (Streetlight + OHT) — logic:function handler updated to
  expose context in vm sandbox and support `return {...}` style; executeActionCreateAlarm updated to
  actually create AlarmInstance (find-or-create AlarmRule); seed script creates device tags, OHT
  alarm rule (threshold > 4 NTU), Workflow A (Streetlight Power Quality Monitor: volt/freq deviation
  + power_quality_status), Workflow B (OHT Water Quality Monitor: turb_status, water_quality_score,
  tank_status with conditional alarm branch), and IOT Operations Dashboard (13 gauge blocks).

- ADR-030: Derived State Migration (15/15 tasks COMPLETE) — device_states converted from MongoDB time
  series collection to regular collection with TTL index (5-year EPA retention); derived sub-document
  now stored in same document as raw sensor data; upsertDerived() rewritten to use per-key $set paths;
  getLatest() simplified to single query; device_derived_states collection & DeviceDerivedState model
  deleted; ARCH_SUMMARY.md and indexes updated; ADR-028 voided, ADR-029 superseded.

- ADR-034 Stale Derived State Indicator — DeviceDerivedState gains stale+staledAt fields;
  WorkflowService.delete() calls markAllStale(); upsert() resets stale on write; GET /devices/:id
  returns derivedStateMeta; useDeviceRealtime returns {state,stale,staledAt}; RealTimeGaugeBlock
  shows amber ring + Stale badge + tooltip when stale=true.

- ADR-035 Entity Creation Prerequisites Guard — Workflow creation requires ≥1 device; Dashboard
  creation requires ≥1 device + ≥1 workflow. Frontend: disabled buttons with contextual tooltips on
  Application Detail page (no extra API calls — uses existing state). Backend: Device.countDocuments()
  guard in WorkflowService.create(); Device + Workflow countDocuments() guards in
  DashboardService.saveDashboard(). Returns 422 if applicationId set and prerequisite count = 0.

- ADR-036 Application-Scoped Entity Creation — All entity creation (Device, Workflow, Dashboard)
  requires applicationId. Backend: DeviceService.create() throws 422 if no applicationId; WorkflowService
  removes conditional guard (applicationId now required, not optional); DashboardService same. Controllers
  catch 'requires an application' → 422. Frontend: /devices, /workflows, /dashboards global pages check
  applicationCount on mount; Create buttons disabled with tooltip if 0 applications; empty-state links
  to /applications instead of opening create modal.

- Streetlight Live Data Expression Path Fix — WorkflowTriggerDispatcher now flattens
  stateData.data into stateData so {{trigger.stateData.voltage}} resolves directly;
  workflow-variables.ts updated from trigger.data.* to trigger.stateData.*; VariablePicker
  filter strings updated; NodeConfigPanel debug + mapping placeholders updated to match.

- ADR-037 workspace/derived Variable Convention — Clean break from trigger.stateData.*:
  dispatcher passes workspace: stateData.data at trigger root; engine seeds context.workspace
  at init + after trigger fires; handlers parse {{derived.attr}} mapping keys; seed script
  updated (context.workspace.*, {{derived.*}} mapping keys); VariablePicker section header
  "Workspace Variables"; NodeConfigPanel column headers Output(derived.*)/Input(workspace.*).

- ADR-038 Dashboard orgId+applicationId Linkage — Removed userId/organizationId (string) from Dashboard
  model; added orgId (ObjectId) + made applicationId required; indexes updated to { orgId, dashboardId }
  unique; DashboardService all filters use orgId+applicationId; removed shareDashboard/sharedWith (no
  user-ownership semantics); added requireAuth preHandler to all dashboard routes; applicationService
  delete guard now org-safe; frontend CreateDashboardModal no longer sends organizationId in POST body;
  Redux dashboardSlice organizationId → applicationId throughout; seed script updated.

- Modbus Gateway Management UI — COMPLETE (useModbusGateways hook, list page, GatewayTable, GatewayModal TCP/RTU conditional, GatewayDetailPanel start/stop/test, ModbusTab in Application Detail, sidebar nav; verified end-to-end with simulator → workflow → dashboard)
- Workflow Trigger Batch Dispatch Fix — COMPLETE (dispatchDeviceStateBatch fires once per device state change; field filter applied locally; Modbus gateway + device-state controller updated)
- API Key Management UI — COMPLETE (ApiKey types in @repo/types; useApiKeys hook with 6 mutations; CreateApiKeyModal with permissions checklist + prefix toggle + expiry; ApiKeyCreatedModal one-time reveal + copy; ApiKeysSection table with revoke/delete/rotate; wired into /profile page)
- Webhook Action Handler Enhancement — COMPLETE (executeActionCallWebhook hardened: resolveExpression on URL+headers+bodyTemplate; URL validation http/https; AbortController timeout configurable via timeoutMs default 10s; non-JSON response text fallback; build verified)
- OPC-UA Gateway Management UI — COMPLETE (T01-T11: OpcuaGateway types in @repo/types; useOpcuaGateways hook (9 queries/mutations); OpcuaGatewayTable/Modal/DetailPanel components; /opcua-gateways list page with modal + detail panel; OpcuaTab for Application Detail; /applications/[appId]/opcua sub-page; Sidebar entity entry + main nav link with Network icon; loading.tsx skeleton + error.tsx 'use client' reset button)
- OPC-UA Node Browser — COMPLETE (T01-T06: OpcuaBrowseNode type + OpcuaNodeClass constants; useBrowseNodes mutation hook; BrowseNodeItem tree row component; OpcuaBrowseModal with lazy loading + multi-select; "Browse Server" button in edit mode; auto-populate nodeMappings from selected nodes)

## In Progress

## Backlog

- Visual Workflow Editor Week 5.4+: Advanced features (additional node types, bulk import)
