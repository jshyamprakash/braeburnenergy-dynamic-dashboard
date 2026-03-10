# New Architecture — Living Document
> Last updated: 2026-03-05 | Branch: dev_poc_stage_2

---

## 2a. System Overview

Generic industrial IoT platform — not water-utility-specific, applicable to any sensor/PLC environment.

**Monorepo:** Turborepo + pnpm workspaces
- `iot-platform/apps/api` — Fastify backend (Node.js 20 + TypeScript 5.3.3 strict)
- `iot-platform/apps/web` — Next.js 16 frontend (React 19.2.4 + App Router)
- `iot-platform/packages/types` — shared TypeScript types (`@repo/types`)

---

## 2b. Full Stack (Pinned Versions)

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20 |
| Language | TypeScript | 5.3.3 (strict) |
| Database | MongoDB | 8 |
| ODM | Mongoose | 8.23.0 |
| Backend | Fastify | 4.25.2 |
| Frontend | Next.js | 16.1.6 |
| UI | React | 19.2.4 |
| CSS | Tailwind CSS | 4.1.18 |
| State | Redux Toolkit | 2.11.2 |
| Data fetching | React Query | 5.90.20 |
| Workflow canvas | React Flow | 11.11.4 |
| WebSocket | Socket.io | 4.6.0 |
| Validation | Zod | 3.22.4 |

---

## 2c. Data Flow — Modbus TCP Path

```
Physical Sensors (thermocouples, flow meters, pressure transducers, etc.)
  → PLC / Data Concentrator
      [validates raw signal, normalises units, exposes as Modbus registers]
    → Modbus TCP Registers
        [16-bit slots; 32-bit values occupy 2 consecutive registers]
      → ModbusGatewayManager  (setInterval per gateway, serial register reads)
          [reads registers sequentially; groups by deviceId]
        → deviceStateService.create()
            [one write per unique deviceId per poll cycle]
          → device_states  (MongoDB time-series collection)
              [append-only, raw telemetry, TTL 5yr]
            → WorkflowTriggerDispatcher  (fire-and-forget)
                [Workflow.find() per deviceId — known bottleneck at scale]
              → WorkflowEngineService
                  [depth-first traversal; startNodeId supported]
                → Alarm via action:createAlarm or action:sendNotification node
```

Key points:
- NOT 10K individual TCP connections. PLCs act as concentrators: 100 PLCs × 100 registers each = 10K logical sensors over 100 TCP sockets.
- Each gateway = one TCP socket (`ModbusClientService` instance).
- One `device_state` document written per unique device per poll, not per register.

---

## 2d. Modbus Gateway Architecture

### Connection Model
- **One TCP socket per gateway** (`ModbusClientService` wraps `modbus-serial`)
- Registers read **sequentially** via serial `await` loop (known bottleneck — see §2h)
- Gateway status tracked: `connected` | `disconnected` | `error`
- Gateways restored on server restart via `restoreRunningGateways()` in `index.ts`
- Minimum polling interval: **1000ms** (enforced by Mongoose schema)

### Register Data Types
| Type | Width | Registers Read | Word Order Applies |
|---|---|---|---|
| `int16` | 16-bit | 1 | No |
| `uint16` | 16-bit | 1 | No |
| `boolean` | 16-bit (coil) | 1 | No |
| `int32` | 32-bit | 2 | **Yes** |
| `uint32` | 32-bit | 2 | **Yes** |
| `float` | 32-bit | 2 | **Yes** |

### Word Order
For 32-bit types, two consecutive registers are combined. The combining convention is configurable:

| `wordOrder` | Register N | Register N+1 | Notes |
|---|---|---|---|
| `big-endian` (default) | High word | Low word | Modbus standard, most PLCs |
| `big-endian-swapped` | Low word | High word | Siemens S7, Schneider M340 |

- Field is optional on `IModbusRegister`; default is `'big-endian'`.
- Field is **ignored** for 16-bit types (`int16`, `uint16`, `boolean`).
- Future-safe: `'little-endian'` variants can be added without breaking changes.

### Device Registration
- `Device.findOne()` executed per register per poll cycle (no in-memory cache — **Critical** bottleneck at scale, see §2h)
- Auto-creates device record if not found
- Scale fix required: in-memory `Map<registerKey, deviceId>` cache

### Poll Grouping
- Registers grouped by `deviceId` after reads
- One `insertMany` call per unique device per poll (not per register)

---

## 2e. OPC-UA Gateway Architecture

- Similar polling pattern to Modbus but node-based (NodeId string vs register address)
- OPC-UA subscription monitoring model (server pushes on value change)
- Node-opc-ua client; session-based connection pooling
- `OpcuaGatewayManager` service mirrors `ModbusGatewayManager` pattern

---

## 2f. Workflow Engine

### Execution Model
- **Depth-first traversal** from start node through edge connections
- **Step-by-step execution log** stored in `WorkflowExecution` document (TTL 90 days)
- `startNodeId` parameter: if provided, engine starts from that specific node
  - Used by `trigger:manual` → ▶ Run button on TriggerNode canvas
  - Bypasses automatic trigger node detection
  - Caller is responsible for providing a valid node ID

### Node Categories (20+ types)
| Category | Types |
|---|---|
| Triggers | deviceStateChange, scheduled, manual, alarmTriggered, webhook, deviceOffline |
| Conditions | compare, range, deviceProperty, timeWindow, customScript |
| Actions | createAlarm, sendNotification, updateDeviceState, setDerivedState, httpRequest, delay |
| Transforms | calculate, formatValue, aggregate, branch |

### WorkflowStorage
- Scoped by compound key: `(orgId, workflowId, deviceId, key)`
- Unique compound index on all 4 fields
- `storageGet` outputs value under the `key` name directly (not `outputField`)
- **Critical**: `storageGet` deviceId MUST match `storageSet` deviceId — scope mismatch = silent miss, no error

### Trigger Dispatcher
- `WorkflowTriggerDispatcher.dispatch(deviceId, stateData)` called after each device state write
- Executes `Workflow.find({ enabled: true, 'trigger.type': 'deviceStateChange' })` per device
- Fire-and-forget (no backpressure queue) — known bottleneck at scale (see §2h)

---

## 2g. Device State Architecture

### Collections
| Collection | Type | Purpose | TTL |
|---|---|---|---|
| `device_states` | Time-series | Append-only raw telemetry | 5 years |
| `device_derived_states` | Regular | Workflow outputs, live dashboard snapshot | None |

### device_states
- Written by: Modbus gateway, OPC-UA gateway, direct API (`POST /states`, `POST /states/bulk`)
- Read by: charts, history, export — **NOT for live dashboard display**
- Compound index: `(metadata.orgId, metadata.deviceId, timestamp DESC)`
- Bulk ingest: `POST /states/bulk` → `insertMany()` up to 1000 docs

### device_derived_states
- Written by: workflow engine action nodes (`setDerivedState`)
- Upserted via per-key `$set` paths (`'derived.key'`) — **NEVER replace whole object**
- `stale: boolean` + `staledAt: Date` fields for freshness tracking
- Read by: live dashboard, `GET /devices/:id/derived-state`

---

## 2h. Scale Analysis — 10K+ Sensor Target

**Current architecture realistic capacity: ~50–200 concurrent devices at 1s polling.**

For 10K logical sensors at typical PLC concentrator topology (100 PLCs × 100 registers each),
the following bottlenecks must be resolved before production deployment:

| Bottleneck | Detail | Severity | Production Resolution (ADR-043) |
|---|---|---|---|
| Serial register reads | Sequential `await` in `for` loop; ~20ms/register; 100 registers = 2s | **Critical** | `Promise.all()` per gateway |
| No device ID cache | `Device.findOne()` per register per poll cycle; 100 DB queries per gateway per poll | **Critical** | In-memory `Map<gatewayId:registerAddr, deviceId>` |
| MongoDB connection pool: 10 | Pool exhausted at ~500 writes/sec; default Mongoose pool too small | **High** | `maxPoolSize: 50` in connection options |
| Single Node.js process | No clustering; all gateway polling on one event loop; no CPU parallelism | **High** | Worker threads / pm2 cluster per CPU core |
| Workflow trigger: 1 query/device/poll | `Workflow.find()` per device at every poll cycle | **High** | NATS consumer + in-memory workflow ID cache (ADR-043) |
| No cross-gateway write batching | One `insertMany` per device, not batched across gateways | **Medium** | StorageWorker: batch 1000 docs / 200ms flush (ADR-043) |
| No backpressure | Workflow dispatch fire-and-forget, no queue depth limit | **Medium** | BullMQ queue for workflow dispatch (ADR-043) |
| WebSocket fan-out | Socket.io broadcast to all subscribers per state write; unbounded at scale | **Medium** | Dedicated WS Gateway subscribes to Redis pub/sub (ADR-043) |

### Required Fixes for 10K Scale
1. **Parallel register reads**: `Promise.all()` per gateway instead of serial loop
2. **Device ID in-memory cache**: `Map<'gatewayId:registerAddr', deviceId>` with invalidation
3. **MongoDB pool**: `maxPoolSize: 50` in connection options
4. **Worker threads or clustering**: Isolate gateway polling per CPU core
5. **NATS JetStream + workflow cache**: Replace `Workflow.find()` per poll with NATS consumer
6. **StorageWorker**: BullMQ job batches 1000 writes / 200ms flush across all gateways
7. **Dedicated WebSocket Gateway**: Redis pub/sub fan-out, decoupled from main API process

**None of these fixes are implemented yet. Full production design in §2m–§2o.**

---

## 2i. Security Architecture

- **JWT**: RS256 (asymmetric), JTI stored in `TokenSession` MongoDB model
- **Token revocation**: Every validation = database lookup for JTI (+10ms acceptable overhead)
- **Logout**: Marks `TokenSession.revoked = true`; immediate effect; no zombie tokens
- **Refresh tokens**: Stored in `TokenSession`; rotate on use
- **RBAC**: 4 roles — SuperAdmin > Admin > Operator > Viewer — 24 granular permissions
- **Account lockout**: Failed attempt tracking + exponential backoff
- **API keys**: bcrypt-hashed, prefix `iot_live_` / `iot_test_`, per-key permission scopes (ADR-033)
- **Audit logs**: Immutable, all CRUD captured, 10-year retention (EPA 21 CFR Part 11)
- **Multi-tenancy**: All data scoped by `orgId`; controllers enforce via middleware

---

## 2j. Frontend Architecture

### State Management
| Slice | Responsibility |
|---|---|
| `authSlice` | User identity, access/refresh tokens, loading state |
| `uiSlice` | Theme, modals, toast notifications |
| `dashboardSlice` | Layouts with hybrid storage (localStorage + MongoDB) |
| `websocketSlice` | Connection state, room subscriptions, realtime updates |
| `workflowSlice` | Nodes, edges, execution state, canvas selection |
| `alarmSlice` | Alarm instances, rules, statistics, active filters |

- **React Query**: device queries + `useDeviceRealtime` cache (NOT being phased out — coexists with Redux)
- **Protected routes**: `ProtectedRoute` wrapper with `returnUrl` preservation
- **API client**: Generic type parameters required — `apiClient.get<T>(url)`
- **Named exports only**: No default export/import mismatch

### Workflow Canvas
- **React Flow 11.11.4**: Background, Controls, MiniMap
- **Custom nodes**: TriggerNode, ConditionNode, ActionNode, TransformNode
- **NodePalette**: 19 draggable node types, categorised
- **TriggerNode**: ▶ Run button dispatches `openExecutionModal(nodeId)` → sets `startNodeId` in modal
- **Execution modal**: Submits `executeWorkflow({ workflowId, startNodeId })`

### Routing
| Path | Component |
|---|---|
| `/workflows` | List with CRUD, toggle, execute |
| `/workflows/:id` | Canvas (visual editor + toolbar) |
| `/workflows/:id/executions` | History table with expandable step logs |
| `/workflows/:id/settings` | Metadata form |

---

## 2k. Compliance Certifications

| Standard | Coverage |
|---|---|
| EPA 21 CFR Part 11 | Immutable audit logs, electronic signatures, 10-year retention |
| EPA 40 CFR Part 141 | 5-year water quality data retention |
| ISA-18.2 | Alarm state machine: ACTIVE_UNACKED → ACTIVE_ACKED → CLEARED |
| AWWA M36 | Water audit methodology, quality scoring (0–100) |
| IEC 61158 | Modbus TCP/RTU gateway with configurable register mapping |
| OPC-UA | Subscription-based node monitoring |

---

## 2l. Critical Pitfalls

| # | Pitfall |
|---|---|
| 1 | MongoDB replica set REQUIRED — compliance, oplog, transactions |
| 2 | `device_derived_states` upsert via per-key `$set` paths (`'derived.key'`) — NEVER replace whole object |
| 3 | Fastify JSON responses: `additionalProperties: true` for dynamic fields |
| 4 | Tailwind v4: Single `@import "tailwindcss"` (NOT old `@tailwind base` directives) |
| 5 | `darkMode: 'class'` in `tailwind.config.ts` — requires dev server restart after change |
| 6 | Redux async thunks: explicit type params `createAsyncThunk<ReturnType, ArgType, ThunkConfig>` |
| 7 | React Flow Handles: use `id` prop for branching edges (`true` / `false`) |
| 8 | API client POST requires body param — use `{}` if no body |
| 9 | `useDeviceRealtime` returns `{ state, stale, staledAt }` — callers MUST destructure (ADR-034) |
| 10 | `device_states` is history/charts/exports ONLY — never queried for live dashboard display |
| 11 | Dashboard live snapshot: `GET /devices/:deviceId/derived-state` → `device_derived_states` (ADR-039) |
| 12 | `wordOrder` applies only to float/int32/uint32 — **ignored for 16-bit types** (ADR-043) |
| 13 | WorkflowStorage: `storageGet` deviceId MUST match `storageSet` deviceId — scope mismatch = silent miss |
| 14 | `startNodeId` bypasses trigger node detection — caller must provide a valid node ID |
| 15 | `storageGet` outputs value under the `key` name directly — no separate `outputField` |
| 16 | 10K sensor scale: NOT production-ready without parallel reads + device ID cache + pool tuning (see §2h–§2o) |
| 17 | NATS subjects are case-sensitive and dot-separated; use `sensor.raw`, `sensor.processed`, `sensor.alerts` |
| 18 | Redis `sensor:latest:{sensorId}` keys are strings (JSON-serialized); parse before use |
| 19 | StorageWorker flush interval (200ms) must be shorter than minimum Modbus poll interval (1000ms) |
| 20 | Kosmos middle column is the ONLY dynamic region — left/right columns are static and server-driven |

---

## 2m. Production Streaming Architecture (ADR-043)

### Target: 10,000 sensors @ 25Hz = 250,000 msg/sec

```
ModbusGatewayManager / OpcuaGatewayManager
  → publish to NATS JetStream stream: sensor.raw
      ├─→ StorageWorker (NATS consumer, BullMQ): accumulate until 1000 docs or 200ms flush
      │       → MongoDB insertMany()  [device_states time-series — raw, unfiltered readings]
      └─→ Real-Time Processing Engine (NATS consumer)
              [noise filter, delta detection, unit normalisation]
            → publish to NATS JetStream stream: sensor.processed  [processed data only]
                → Redis cache write:  SET sensor:latest:{sensorId} (JSON, no TTL)
                → Redis pub/sub:      PUBLISH sensor:{sensorId} payload
                → WorkflowTriggerDispatcher (NATS consumer)
                    [reads workflow ID cache from Redis, dispatches matching workflows]
                  → NATS stream: sensor.alerts  (if alarm condition met)
                    → WebSocket Gateway (Redis pub/sub subscriber)
                        [rooms by sensorId; fan-out to subscribed browser clients]
```

### NATS Stream Configuration
| Stream | Subject | Retention | Max Consumers |
|---|---|---|---|
| `SENSOR_RAW` | `sensor.raw` | WorkQueuePolicy (delete on ack) | 2 (Processing Engine + StorageWorker) |
| `SENSOR_PROCESSED` | `sensor.processed` | LimitsPolicy (24h) | N (WS Gateway, WorkflowDispatcher) |
| `SENSOR_ALERTS` | `sensor.alerts` | LimitsPolicy (7d) | N (alarm service, notifications) |

### Redis Cache Structure
| Key Pattern | Type | Content | TTL |
|---|---|---|---|
| `sensor:latest:{sensorId}` | String (JSON) | Latest processed state object | None (overwrite on update) |
| `workflow:active:{orgId}` | Set | Enabled workflow IDs | 5-minute refresh |
| `device:map:{gatewayId}:{registerAddr}` | String | deviceId | Until gateway restart |

### Storage Worker (BullMQ)
- Subscribes to `sensor.raw` stream — stores raw, unfiltered readings (full audit trail, EPA 21 CFR Part 11)
- Job: `storageFlush` — triggered at 200ms interval or when 1000 docs accumulated
- Writes to `device_states` via `insertMany()` (bulk, not per-device)
- Runs as separate Node.js process (no API coupling)
- Dead-letter queue for failed batches: retained 24h for manual replay

---

## 2n. Dashboard Panel Architecture — Kosmos 3-Column Model

The production dashboard follows the Kosmos reference layout:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  HEADER: Project name | Connection status | User | Theme toggle          │
├────────────────┬──────────────────────────────────┬───────────────────────┤
│ LEFT (280px)   │  MIDDLE (1fr — DYNAMIC)           │ RIGHT (280px)         │
│ STATIC         │  Palette-switchable blocks         │ STATIC                │
│                │                                    │                       │
│ BE SENSE       │  [Palette A] Architecture diagram  │ BE Agent Modules      │
│  Raw sensor    │  [Palette B] 4-metric KPI cards    │  Workflow status       │
│  values        │  [Palette C] Real-time Chart.js    │  Active alarm count   │
│  PLC readings  │    signals (line/bar, 180px h)     │                       │
│  Protocol      │  [Palette D] 5×5 Feature Matrix    │ Fleet Overview        │
│  adapter       │    (heatmap, aspect-ratio: 1)      │  Device online/off    │
│  outputs       │  [Palette E] Alert list            │  Gateway health       │
│                │    (left-border: red/amber/        │                       │
│                │     blue/green)                    │ Recent Agent Actions  │
│                │                                    │  Last 5 workflow      │
│                │                                    │  executions           │
└────────────────┴──────────────────────────────────┴───────────────────────┘
```

### Data Sources per Panel
| Panel | Source | Protocol |
|---|---|---|
| Left — raw sensor values | Protocol Adapter Layer (Modbus/OPC-UA) | WebSocket push |
| Left — PLC readings | `GET /gateways/:id/readings` | REST (polled 1s) |
| Middle — KPI cards | Redis `sensor:latest:{sensorId}` | WebSocket (WS Gateway) |
| Middle — Chart.js signals | `GET /devices/:id/states?from=&to=` | REST + WebSocket append |
| Middle — Feature Matrix | Aggregated score endpoints | REST (on palette switch) |
| Middle — Alert list | `GET /alarms?status=active` + WebSocket | REST + WebSocket push |
| Right — Workflow status | `GET /workflows/executions` | REST (polled 5s) |
| Right — Fleet overview | `GET /devices?status=offline` | WebSocket (HeartbeatService) |

### Palette Switching
- `dashboardSlice.activePaletteId` controls which middle block set is rendered
- Palette switch = instant (blocks pre-mounted, visibility toggled via CSS)
- Chart.js instances retain data across palette switches (no re-fetch)
- Palette state persisted in `dashboardSlice` hybrid storage (localStorage + MongoDB)

---

## 2o. Production Stack Additions

| Technology | Version Target | Role |
|---|---|---|
| NATS JetStream | 2.10+ | Internal streaming bus; persistent, replay-capable message streams |
| ioredis | 5.x | Redis client; used by WS Gateway, Processing Engine, WorkflowDispatcher |
| Redis | 7.x | Real-time sensor cache + pub/sub backbone for WebSocket fan-out |
| BullMQ | 5.x | StorageWorker batch queue + workflow dispatch queue (backed by Redis) |
| `nats.js` | 2.x | Node.js NATS client; JetStream publish/subscribe |

### Deployment Units (Production)
| Service | Process | Scales Horizontally |
|---|---|---|
| API (Fastify) | Single / pm2 cluster | Yes (stateless; Redis session if needed) |
| ModbusGatewayManager | Worker thread per gateway | Yes (1 thread per PLC) |
| Real-Time Processing Engine | Standalone Node.js | Yes (NATS consumer group) |
| StorageWorker | Standalone Node.js | Yes (BullMQ worker pool) |
| WebSocket Gateway | Standalone Node.js | Yes (Redis pub/sub, sticky sessions) |
| WorkflowTriggerDispatcher | Standalone Node.js | Yes (NATS consumer group) |

### No-Change Zone (stable — carry forward from POC)
- All Mongoose models (device, device_states, device_derived_states, workflow, alarm, audit)
- All REST API routes and controllers
- Compliance layer (audit logs, retention policies, alarm state machine)
- RBAC + JWT + TokenSession
- Visual Workflow Editor (frontend React Flow canvas)
- Kosmos left/right static column data sources
