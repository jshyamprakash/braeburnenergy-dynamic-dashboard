# Architecture Summary (Actual Implementation)

## Stack (Pinned Versions)
- Node.js 20, TypeScript 5.3.3 (strict mode)
- MongoDB 8 + Mongoose 8.23.0 (replica set REQUIRED for compliance)
- Fastify 4.25.2 (92 TS files: 14 controllers, 22 services, 18 models)
- Next.js 16.1.6 + React 19.2.4 + App Router
- Tailwind CSS 4.1.18 (`@import "tailwindcss"` syntax, `darkMode: 'class'`)
- Redux Toolkit 2.11.2 (6 slices: auth, ui, dashboard, websocket, workflow, alarm)
- React Query 5.90.20 (device queries + realtime state; NOT being phased out)
- React Flow 11.11.4 (visual workflow editor)
- Socket.io 4.6.0 (WebSocket)
- Zod 3.22.4 (validation)

## Database
- Time series collection: `device_states` (TTL 5yr, append-only raw telemetry, history/charts ONLY) — ADR-031
- Regular collection: `device_derived_states` (unique on deviceId, workflow outputs only, stale+staledAt fields; canonical live snapshot for dashboard) — ADR-031/034/039
- Replica set REQUIRED for compliance (transaction support, oplog)
- 10-year retention for audit logs (no TTL) - 21 CFR Part 11
- 90-day TTL on workflow executions
- Use `.lean()` for read-only queries (cast types: `as IModel | null`)
- ObjectId format (24 hex chars), NOT UUID
- Manual FK validation (MongoDB has no constraints)
- Compound indexes: `(orgId, deviceId, timestamp)` for device state queries

## Security & Compliance
- JWT with JTI stored in TokenSession model (database-backed revocation)
- Every token validation = database lookup (+10ms acceptable overhead)
- RBAC: 4 roles (SuperAdmin > Admin > Operator > Viewer), 24 permissions
- Account lockout: track failed attempts, exponential backoff
- Immutable audit logs (EPA 21 CFR Part 11) - all CRUD captured
- API keys: bcrypt hash, prefix `iot_live_|iot_test_`, granular permissions

## API Patterns
- 16 route files, 8 integration test suites, 63+ test cases
- Code-first Swagger (no separate YAML) at `/docs`
- Fastify response schemas need `additionalProperties: true` for JSON fields
- ULID for user-facing IDs (26 chars, time-sortable): `deviceId`, `workflowId`
- ObjectId for internal MongoDB IDs: `_id`, `orgId`, `userId`
- Pagination: `{ success, data, pagination }` structure
- Error format: `{ success: false, error, details }`

## Frontend Architecture
- Redux Toolkit as primary state management (NOT Zustand)
  - authSlice: user, tokens, loading
  - uiSlice: theme, modals, notifications
  - dashboardSlice: layouts with hybrid storage (localStorage + MongoDB)
  - websocketSlice: connection state, subscriptions, updates
  - workflowSlice: nodes, edges, execution state
  - alarmSlice: alarm instances, rules, statistics, filters (NEW!)
- React Query: device/deviceState queries + realtime cache (useDeviceRealtime)
- Protected routes: ProtectedRoute wrapper with returnUrl
- API client: Generic type parameters REQUIRED: `apiClient.get<T>()`
- Named imports for named exports (no default mismatch)
- Tailwind: `darkMode: 'class'` REQUIRED for next-themes

## Visual Workflow Editor (Week 3 - Sidebar Navigation)
- Backend: Workflow + WorkflowExecution Mongoose models
- 19 node types: 5 triggers, 5 conditions, 6 actions, 4 transforms
- WorkflowService: CRUD with cycle detection, orphan validation
- WorkflowEngineService: Depth-first execution with step logging
- React Flow canvas: Background, Controls, MiniMap
- 4 custom nodes: TriggerNode, ConditionNode, ActionNode, TransformNode
- Redux workflowSlice: state management with typed async thunks
- Routes (ADR-018 context-sensitive sidebar):
  - /workflows (list with CRUD, create/edit/delete/execute/toggle)
  - /workflows/:id (canvas: visual editor + toolbar)
  - /workflows/:id/executions (history table with expandable logs)
  - /workflows/:id/settings (metadata form: name, description, tags, priority, enabled toggle)
- Sidebar layout: 220px left nav with Canvas/Executions/Settings tabs (Losant pattern)
- RBAC: workflow:create, workflow:read, workflow:execute permissions

## Compliance (Fully Implemented)
- EPA 21 CFR Part 11: Immutable audit logs, electronic signatures
- EPA 40 CFR Part 141: 5-year water quality data retention
- ISA-18.2: Alarm state machine (ACTIVE_UNACKED → ACTIVE_ACKED → CLEARED)
- AWWA M36: Water audit methodology, quality scoring
- IEC 61158: Modbus TCP/RTU gateway with register mapping
- OPC-UA: Subscription-based node monitoring

## Critical Pitfalls
- MongoDB replica set REQUIRED (compliance, oplog, transactions)
- `device_derived_states` upserted via per-key `$set` paths (`'derived.key'`); never replace whole object
- Fastify JSON responses: `additionalProperties: true` for dynamic fields
- Tailwind v4: Single `@import "tailwindcss"` (NOT old directives)
- `darkMode: 'class'` in tailwind.config.ts (requires dev server restart)
- Redux async thunks: Explicit type parameters `createAsyncThunk<ReturnType, ArgType, ThunkConfig>`
- React Flow Handles: Use `id` prop for branching (true/false)
- API client: POST requires body parameter (use `{}` if no body)
- `useDeviceRealtime` returns `{ state, stale, staledAt }` — callers MUST destructure (ADR-034)
- Dashboard live snapshot: GET /devices/:deviceId/derived-state → device_derived_states (ADR-039)
- device_states is history/charts/exports ONLY — never queried for live dashboard display
