# Production Architecture Document
## Dynamic Dashboard - Enterprise IoT Platform

**Version:** 1.0
**Date:** 2026-02-04
**Architecture Pattern:** Losant-Inspired Application Enablement Platform (AEP)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [System Architecture Overview](#system-architecture-overview)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Architecture](#database-architecture)
7. [Multi-Tenancy & Security](#multi-tenancy--security)
8. [Deployment Architecture](#deployment-architecture)
9. [Performance & Scaling](#performance--scaling)
10. [Trade-offs & Design Decisions](#trade-offs--design-decisions)

---

## Executive Summary

Dynamic Dashboard is an enterprise-grade IoT Application Enablement Platform (AEP) designed to handle millions of concurrent device connections with real-time visualization, visual workflow orchestration, and edge-to-cloud data processing.

### Key Design Goals

- **Scale:** Support millions of concurrent device connections
- **Real-time:** Dashboard updates <100ms latency
- **Availability:** 99.9% uptime SLA
- **Multi-tenancy:** Strict logical resource isolation per organization
- **Edge-Cloud Symmetry:** Deploy identical workflow logic to edge or cloud

### Architectural Layers

The platform follows a 5-layer architecture pattern:

1. **Edge Compute Layer** - Gateway Edge Agents (GEA) for industrial protocol translation (Profinet, Modbus, OPC UA, BACnet, Siemens S7)
2. **Connectivity Layer** - MQTT broker for device communication
3. **Core Processing Layer** - Visual workflow engine (Flow-Based Programming)
4. **Data Persistence Layer** - PostgreSQL + TimescaleDB with Prisma ORM (unified data access)
5. **Application Layer** - Real-time dashboards with WebSocket feeds

---

## Technology Stack

### Frontend Stack

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Framework** | Next.js | 14.x | SSR/SSG capabilities, API routes, optimal performance |
| **UI Library** | React | 18.x | Component-based architecture, Virtual DOM for real-time updates |
| **Language** | TypeScript | 5.x | Type safety for complex data models |
| **State Management** | Zustand | 4.x | Lightweight, minimal boilerplate for dashboard state |
| **Real-time** | Socket.io-client | 4.x | WebSocket with fallback for live data streams |
| **Charting** | Chart.js + react-chartjs-2 | 4.x | Performant time-series visualization |
| **Maps** | Mapbox GL JS | 3.x | GPS tracking blocks |
| **Styling** | Tailwind CSS | 3.x | Utility-first, rapid UI development |
| **Build Tool** | Turbopack | Built-in | Next.js 14 default, faster than Webpack |

### Backend Stack

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Orchestration** | Node.js | 20 LTS | Event-loop for high concurrency, workflow engine host |
| **API Framework** | Fastify | 4.x | 2x faster than Express, schema validation |
| **Workflow Runtime** | Node.js + VM2 | - | Sandboxed Function Node execution |
| **High-Throughput** | Go | 1.21+ | MQTT broker, Edge Agent binaries, message routing |
| **MQTT Broker** | EMQX (Go-based) | 5.x | Millions of connections, MQTT 5.0, clustering |
| **Message Bus** | NATS | 2.10+ | Low-latency pub/sub, stream processing |
| **API Gateway** | Kong | 3.x | Rate limiting, authentication, routing |
| **Authentication** | Passport.js + JWT | - | Flexible multi-strategy auth |

### Data Persistence Stack

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Primary Database** | PostgreSQL + TimescaleDB | 15+ / 2.13+ | Unified storage for metadata and time-series data |
| **ORM** | Prisma | 5.x | Type-safe data access, auto-generated types, migrations |
| **Cache/State** | Redis | 7.2+ | Session store, workflow state, pub/sub, real-time data |
| **Object Storage** | MinIO (S3-compatible) | Latest | Cold data archival, file attachments (optional) |
| **Search** | Elasticsearch | 8.x | Full-text search, log aggregation (optional) |

### Infrastructure Stack

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| **Container Runtime** | Docker | 24+ | Standardized deployment units |
| **Orchestration** | Kubernetes | 1.28+ | Auto-scaling, self-healing, declarative config |
| **Service Mesh** | Istio | 1.20+ | mTLS, traffic management, observability |
| **Ingress** | NGINX Ingress | 1.9+ | Load balancing, SSL termination |
| **Monitoring** | Prometheus + Grafana | Latest | Metrics, alerting, visualization |
| **Logging** | Fluent Bit + Loki | Latest | Lightweight log aggregation |
| **Tracing** | Jaeger | 1.52+ | Distributed tracing for workflows |

---

## System Architecture Overview

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Edge Compute Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Gateway Edge │  │ Gateway Edge │  │ Gateway Edge │          │
│  │ Agent (GEA)  │  │ Agent (GEA)  │  │ Agent (GEA)  │          │
│  │ Docker       │  │ Docker       │  │ Docker       │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │ Profinet/Modbus/ │                 │                   │
│         │ OPC UA/BACnet/S7 │                 │                   │
└─────────┼──────────────────┼─────────────────┼───────────────────┘
          │ MQTT             │                 │
          ▼                  ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Connectivity & Ingestion Layer                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  EMQX MQTT Broker Cluster (Go)                            │  │
│  │  - Device authentication (Access Keys)                    │  │
│  │  - Topic-based routing (losant/<DEVICE_ID>/state)        │  │
│  │  - ACL enforcement                                        │  │
│  └─────────────────────┬─────────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────────┘
                         │ MQTT → NATS bridge
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Core Processing Layer                         │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  NATS Messaging Bus                                      │    │
│  │  - Topic: workflow.trigger.<WORKFLOW_ID>                │    │
│  │  - Stream processing                                     │    │
│  └────────────────┬────────────────────────────────────────┘    │
│                   ▼                                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Workflow Engine (Node.js)                               │    │
│  │  - Flow-Based Programming runtime                        │    │
│  │  - Workflow orchestration (60s timeout, 5MB payload)    │    │
│  │  - Function Node sandbox (VM2)                          │    │
│  │  - Horizontal pod autoscaling                           │    │
│  └────┬────────────────────────────┬────────────────────────┘    │
│       │ State updates              │ Commands                    │
└───────┼────────────────────────────┼─────────────────────────────┘
        ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Persistence Layer                       │
│  ┌──────────────────────────────┐  ┌──────────────┐             │
│  │  PostgreSQL + TimescaleDB    │  │    Redis     │             │
│  │  (Unified Database - Prisma) │  │  (State)     │             │
│  │  - Telemetry (time-series)   │  │  - Sessions  │             │
│  │  - Devices (metadata)        │  │  - Workflow  │             │
│  │  - Workflows (metadata)      │  │    Storage   │             │
│  │  - Users & Organizations     │  │  - Cache     │             │
│  └──────────────────────────────┘  └──────────────┘             │
│  ┌──────────────┐                                               │
│  │    MinIO     │                                               │
│  │ (Cold Data)  │                                               │
│  │ - Archives   │                                               │
│  └──────────────┘                                               │
└────────────────────┬────────────────────────────────────────────┘
                     │ WebSocket push
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Application & Experience Layer                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Next.js Frontend (React 18 + TypeScript)               │    │
│  │  - Dashboard Blocks (Gauges, Charts, GPS, Input)        │    │
│  │  - Socket.io for real-time updates                      │    │
│  │  - Context Variables {{ctx.variableName}}               │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Hierarchy

```
app/ (Next.js 14 App Router)
├── (auth)/
│   ├── login/
│   └── register/
├── (dashboard)/
│   ├── organizations/[orgId]/
│   │   ├── dashboards/[dashboardId]/
│   │   │   └── page.tsx              # Dashboard renderer
│   │   ├── devices/
│   │   ├── workflows/
│   │   └── settings/
│   └── layout.tsx
└── api/                               # Next.js API routes
    ├── auth/
    ├── devices/
    └── webhooks/

components/
├── dashboard/
│   ├── DashboardCanvas.tsx            # Grid layout container
│   ├── DashboardBlock.tsx             # Base block component
│   └── blocks/
│       ├── GaugeBlock.tsx             # Real-time gauge
│       ├── TimeSeriesBlock.tsx        # Historical chart
│       ├── GPSBlock.tsx               # Map with device markers
│       ├── InputControlBlock.tsx      # Button/slider controls
│       └── LiveStreamBlock.tsx        # WebSocket-fed live data
├── workflow/
│   ├── WorkflowCanvas.tsx             # Visual flow editor
│   ├── WorkflowNode.tsx               # Draggable node
│   └── nodes/
│       ├── DeviceNode.tsx
│       ├── FunctionNode.tsx
│       └── MQTTNode.tsx
└── shared/
    ├── ContextVariableInput.tsx       # {{ctx.deviceId}} handling
    └── DeviceSelector.tsx

lib/
├── websocket/
│   ├── socket-client.ts               # Socket.io initialization
│   └── use-realtime-data.ts           # React hook for subscriptions
├── api/
│   ├── client.ts                      # Fastify API client (fetch wrapper)
│   └── types.ts                       # TypeScript types for API
└── store/
    ├── dashboard-store.ts             # Zustand store for dashboard state
    └── workflow-store.ts
```

### State Management Strategy

**Zustand Stores (Client-side):**

```typescript
// dashboard-store.ts
interface DashboardState {
  blocks: DashboardBlock[];
  contextVariables: Record<string, string>;
  liveData: Map<string, DeviceState>;
  addBlock: (block: DashboardBlock) => void;
  updateLiveData: (deviceId: string, state: DeviceState) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  blocks: [],
  contextVariables: {},
  liveData: new Map(),
  addBlock: (block) => set((state) => ({ blocks: [...state.blocks, block] })),
  updateLiveData: (deviceId, state) =>
    set((prev) => {
      const liveData = new Map(prev.liveData);
      liveData.set(deviceId, state);
      return { liveData };
    }),
}));
```

**WebSocket Integration:**

```typescript
// use-realtime-data.ts
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useDashboardStore } from '@/lib/store/dashboard-store';

export function useRealtimeData(deviceIds: string[]) {
  const updateLiveData = useDashboardStore((state) => state.updateLiveData);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      auth: { token: getAuthToken() },
    });

    // Subscribe to device state updates
    deviceIds.forEach((deviceId) => {
      socket.emit('subscribe', { topic: `device/${deviceId}/state` });
    });

    socket.on('device:state', ({ deviceId, state }) => {
      updateLiveData(deviceId, state);
    });

    return () => {
      socket.disconnect();
    };
  }, [deviceIds, updateLiveData]);
}
```

### Dashboard Block System

**Base Block Interface:**

```typescript
interface DashboardBlock {
  id: string;
  type: 'gauge' | 'timeseries' | 'gps' | 'input' | 'livestream';
  config: {
    deviceId?: string;           // Direct device binding
    deviceTags?: string[];       // Tag-based device selection
    dataAttribute: string;       // e.g., "temperature"
    refreshInterval?: number;    // For historical blocks (ms)
  };
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  contextBindings?: Record<string, string>; // {{ctx.variableName}}
}
```

**Context Variable Resolution:**

```typescript
// Resolve {{ctx.deviceId}} to actual value
function resolveContextVariables(
  config: DashboardBlock['config'],
  context: Record<string, string>
): DashboardBlock['config'] {
  const resolved = { ...config };

  if (resolved.deviceId?.startsWith('{{ctx.')) {
    const varName = resolved.deviceId.match(/{{ctx\.(\w+)}}/)?.[1];
    if (varName && context[varName]) {
      resolved.deviceId = context[varName];
    }
  }

  return resolved;
}
```

### Performance Optimizations

1. **Virtual DOM for High-Frequency Updates:**
   - React 18 Concurrent Rendering
   - `useMemo` for expensive block renders
   - `React.memo` for block components

2. **WebSocket Throttling:**
   ```typescript
   // Limit updates to 10 FPS per block
   const throttledUpdate = useMemo(
     () => throttle((data) => updateLiveData(data), 100),
     []
   );
   ```

3. **Code Splitting:**
   - Dynamic imports for block components
   - Lazy load workflow editor only when needed

4. **Data Fetching:**
   - Next.js API routes with edge caching
   - SWR for stale-while-revalidate pattern

---

## Backend Architecture

### Service Architecture

The backend follows a **microservices architecture** with clear service boundaries:

```
┌──────────────────────────────────────────────────────────────┐
│                      API Gateway (Kong)                      │
│  - Rate limiting (1000 req/min per org)                      │
│  - JWT validation                                            │
│  - Request routing                                           │
└────────┬────────────────┬────────────────┬───────────────────┘
         │                │                │
         ▼                ▼                ▼
┌────────────────┐ ┌──────────────┐ ┌─────────────────┐
│ Device Service │ │Auth Service  │ │ Workflow Service│
│   (Node.js)    │ │  (Node.js)   │ │   (Node.js)     │
└────────────────┘ └──────────────┘ └─────────────────┘
         │                                  │
         ▼                                  ▼
┌────────────────────────────────────────────────────────┐
│              NATS Messaging Bus                        │
│  Topics:                                               │
│  - device.state.<DEVICE_ID>                            │
│  - workflow.trigger.<WORKFLOW_ID>                      │
│  - dashboard.update.<DASHBOARD_ID>                     │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│          MQTT Broker (EMQX) - Go-based                 │
│  - Millions of concurrent connections                  │
│  - Topic: losant/<DEVICE_ID>/state                     │
│  - MQTT → NATS bridge plugin                           │
└────────────────────────────────────────────────────────┘
```

### API Service (Node.js + Fastify)

**Why Fastify over Express:**
- 2x faster request handling
- Built-in schema validation (JSON Schema)
- TypeScript-first design
- Plugin architecture

**Example Service Structure:**

```typescript
// services/device-service/src/server.ts
import Fastify from 'fastify';
import { deviceRoutes } from './routes/devices';
import { natsPlugin } from './plugins/nats';

const server = Fastify({
  logger: true,
  ajv: { customOptions: { removeAdditional: 'all' } },
});

// Register NATS plugin for message bus
await server.register(natsPlugin, {
  servers: process.env.NATS_URL,
});

// Register routes with schema validation
await server.register(deviceRoutes, { prefix: '/api/devices' });

// Device state update endpoint
server.post('/api/devices/:deviceId/state', {
  schema: {
    params: {
      type: 'object',
      properties: {
        deviceId: { type: 'string', pattern: '^[a-f0-9]{24}$' },
      },
    },
    body: {
      type: 'object',
      properties: {
        data: { type: 'object' },
        time: { type: 'string', format: 'date-time' },
      },
      required: ['data'],
    },
  },
}, async (request, reply) => {
  const { deviceId } = request.params;
  const { data, time } = request.body;

  // Publish to NATS for workflow triggers
  await server.nats.publish(
    `device.state.${deviceId}`,
    JSON.stringify({ deviceId, data, time: time || new Date().toISOString() })
  );

  // Store in TimescaleDB
  await server.timescale.insert('device_states', {
    device_id: deviceId,
    data: JSON.stringify(data),
    timestamp: time || new Date(),
  });

  return { success: true };
});

await server.listen({ port: 3001, host: '0.0.0.0' });
```

### Workflow Engine (Node.js + Flow-Based Programming)

**Architecture:**

```typescript
// workflow-engine/src/runtime.ts
interface WorkflowNode {
  id: string;
  type: 'device' | 'function' | 'mqtt' | 'conditional' | 'debug';
  config: Record<string, any>;
  outputs: string[]; // Node IDs
}

interface WorkflowPayload {
  data: Record<string, any>;
  time: string;
  deviceId?: string;
  metadata: Record<string, any>;
}

class WorkflowRuntime {
  private workflows: Map<string, WorkflowNode[]> = new Map();
  private workflowStorage: RedisStorage;

  async executeWorkflow(
    workflowId: string,
    trigger: WorkflowPayload,
    timeout = 60000 // 60s max execution
  ): Promise<void> {
    const nodes = this.workflows.get(workflowId);
    if (!nodes) throw new Error('Workflow not found');

    const startTime = Date.now();
    let currentPayload = trigger;

    // Topological sort for execution order
    const executionOrder = this.topologicalSort(nodes);

    for (const node of executionOrder) {
      // Check timeout
      if (Date.now() - startTime > timeout) {
        throw new Error('Workflow execution timeout (60s)');
      }

      // Check payload size
      if (JSON.stringify(currentPayload).length > 5 * 1024 * 1024) {
        throw new Error('Payload exceeds 5MB limit');
      }

      currentPayload = await this.executeNode(node, currentPayload);
    }
  }

  private async executeNode(
    node: WorkflowNode,
    payload: WorkflowPayload
  ): Promise<WorkflowPayload> {
    switch (node.type) {
      case 'function':
        return this.executeFunctionNode(node, payload);
      case 'mqtt':
        return this.executeMQTTNode(node, payload);
      case 'conditional':
        return this.executeConditionalNode(node, payload);
      default:
        return payload;
    }
  }

  private async executeFunctionNode(
    node: WorkflowNode,
    payload: WorkflowPayload
  ): Promise<WorkflowPayload> {
    const { NodeVM } = await import('vm2');
    const vm = new NodeVM({
      timeout: 5000, // 5s per function node
      sandbox: { payload },
      require: {
        external: ['lodash', 'moment'], // Whitelisted modules
        builtin: ['crypto', 'querystring'],
      },
    });

    const code = node.config.code as string;
    const result = vm.run(`
      module.exports = function(payload) {
        ${code}
        return payload;
      }
    `);

    return result(payload);
  }
}
```

**Workflow Persistence:**

```typescript
// Store workflow state in Redis for recovery
class RedisStorage {
  async saveWorkflowState(
    workflowId: string,
    key: string,
    value: any
  ): Promise<void> {
    await this.redis.hset(
      `workflow:state:${workflowId}`,
      key,
      JSON.stringify(value)
    );
  }

  async getWorkflowState(workflowId: string, key: string): Promise<any> {
    const value = await this.redis.hget(`workflow:state:${workflowId}`, key);
    return value ? JSON.parse(value) : null;
  }
}
```

### MQTT Broker (EMQX - Go)

**Why EMQX:**
- Written in Erlang/Go - handles millions of connections
- MQTT 5.0 support
- Cluster mode with horizontal scaling
- Built-in ACL and authentication hooks
- NATS bridge plugin available

**Topic Structure:**

```
losant/<DEVICE_ID>/state          # Device → Cloud (telemetry)
losant/<DEVICE_ID>/command        # Cloud → Device (commands)

# Unified Namespace (UNS) pattern
Enterprise/Site/Area/Line/Cell    # ISA-95 aligned hierarchy
```

**Access Control:**

```erlang
%% EMQX ACL configuration
{allow, {user, "device-abc123"}, publish, ["losant/abc123/state"]}.
{allow, {user, "device-abc123"}, subscribe, ["losant/abc123/command"]}.
{deny, all}.
```

### Message Bus (NATS)

**Why NATS:**
- Sub-millisecond latency
- At-most-once and exactly-once delivery
- JetStream for stream processing
- Lightweight (single binary, low memory)

**Stream Processing:**

```typescript
// Subscribe to all device state updates
const jsm = await nats.jetstream();
const consumer = await jsm.consumers.get('DEVICE_STATES', 'workflow-processor');

const messages = await consumer.consume();
for await (const msg of messages) {
  const payload = JSON.parse(msg.data.toString());

  // Trigger workflows subscribed to this device
  const workflows = await findWorkflowsForDevice(payload.deviceId);
  for (const workflow of workflows) {
    await workflowEngine.executeWorkflow(workflow.id, payload);
  }

  msg.ack();
}
```

---

## Database Architecture

### Polyglot Persistence Strategy

Each database component is chosen for its access pattern and data characteristics:

| Database | Use Case | Data Type | Access Pattern |
|----------|----------|-----------|----------------|
| **PostgreSQL + TimescaleDB** | Device telemetry, devices, workflows, users | Relational + Time-series | CRUD, range queries, aggregations |
| **Prisma ORM** | Type-safe data access layer | - | Generated TypeScript types, migrations |
| **Redis** | Session store, workflow state, cache | Key-value | High-speed reads/writes |
| **MinIO** | File uploads, cold archives (optional) | Object storage | Append-only, infrequent reads |

### TimescaleDB (Time-Series Data)

**Schema Design:**

```sql
-- Hypertable for device states (auto-partitioned by time)
CREATE TABLE device_states (
  time        TIMESTAMPTZ NOT NULL,
  device_id   UUID NOT NULL,
  org_id      UUID NOT NULL,        -- Multi-tenancy
  data        JSONB NOT NULL,        -- Flexible schema
  PRIMARY KEY (time, device_id)
);

-- Convert to hypertable (auto-partitioned by week)
SELECT create_hypertable('device_states', 'time', chunk_time_interval => INTERVAL '1 week');

-- Create index on device_id for fast lookups
CREATE INDEX idx_device_states_device_id ON device_states (device_id, time DESC);

-- Compression policy (compress data older than 7 days)
ALTER TABLE device_states SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'device_id, org_id'
);

SELECT add_compression_policy('device_states', INTERVAL '7 days');

-- Retention policy (drop data older than 30 days, move to cold storage)
SELECT add_retention_policy('device_states', INTERVAL '30 days');
```

**Continuous Aggregates (Pre-computed Rollups):**

```sql
-- Hourly aggregates for dashboard charts
CREATE MATERIALIZED VIEW device_states_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  device_id,
  org_id,
  AVG((data->>'temperature')::numeric) AS avg_temp,
  MAX((data->>'temperature')::numeric) AS max_temp,
  MIN((data->>'temperature')::numeric) AS min_temp,
  COUNT(*) AS sample_count
FROM device_states
GROUP BY bucket, device_id, org_id;

-- Auto-refresh policy
SELECT add_continuous_aggregate_policy('device_states_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
```

### PostgreSQL + Prisma (Metadata & Configuration)

**Prisma Schema:**

```prisma
// Device model
model Device {
  id          String   @id @default(uuid())
  orgId       String
  name        String
  deviceId    String
  tags        String[]
  attributes  Json     // Flexible schema for device attributes
  accessKey   String   // Hashed key
  lastSeen    DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id])
  states       DeviceState[]

  @@unique([orgId, deviceId])
  @@index([orgId, tags])
  @@map("devices")
}

// Workflow model
model Workflow {
  id        String   @id @default(uuid())
  orgId     String
  name      String
  enabled   Boolean  @default(true)
  trigger   Json     // { type, deviceIds, deviceTags }
  nodes     Json     // Array of workflow nodes
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id])

  @@index([orgId, enabled])
  @@map("workflows")
}

// Dashboard model
model Dashboard {
  id                String   @id @default(uuid())
  orgId             String
  name              String
  blocks            Json     // Array of dashboard blocks
  contextVariables  Json     // Key-value context variables
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id])

  @@map("dashboards")
}
```

**Usage Examples:**

```typescript
// Type-safe CRUD operations with Prisma
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Create device with full type safety
const device = await prisma.device.create({
  data: {
    orgId: orgId,
    name: "Temperature Sensor 01",
    deviceId: "abc123",
    tags: ["factory-floor", "zone-a"],
    attributes: {
      temperature: { type: "number", unit: "celsius" },
      humidity: { type: "number", unit: "percent" }
    },
    accessKey: hashedKey,
  }
});

// Query with relations
const workflow = await prisma.workflow.create({
  data: {
    orgId: orgId,
    name: "High Temperature Alert",
    enabled: true,
    trigger: {
      type: "deviceState",
      deviceIds: ["abc123"],
      deviceTags: ["zone-a"]
    },
    nodes: [
      {
        id: "node1",
        type: "conditional",
        config: { condition: "payload.data.temperature > 80" },
        outputs: ["node2"]
      },
      {
        id: "node2",
        type: "mqtt",
        config: { topic: "alerts/temperature", qos: 1 }
      }
    ]
  }
});

// Complex queries with filters
const devices = await prisma.device.findMany({
  where: {
    orgId: orgId,
    tags: { hasSome: ["zone-a"] }
  },
  orderBy: { lastSeen: 'desc' }
});
```

### Redis (Cache & Ephemeral State)

**Use Cases:**

```typescript
// 1. Session store
await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(userData));

// 2. Workflow storage (key-value state)
await redis.hset(`workflow:state:${workflowId}`, 'counter', '42');
const counter = await redis.hget(`workflow:state:${workflowId}`, 'counter');

// 3. Rate limiting (for API gateway)
const key = `ratelimit:${orgId}:${minute}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 60);
if (count > 1000) throw new Error('Rate limit exceeded');

// 4. Pub/Sub for real-time dashboard updates
await redis.publish('dashboard:updates', JSON.stringify({ dashboardId, data }));
```

### MinIO (Object Storage)

**Bucket Structure:**

```
iot-platform/
├── cold-archives/
│   └── org-{orgId}/
│       └── devices/
│           └── {year}/{month}/{day}/{deviceId}.parquet
├── file-uploads/
│   └── org-{orgId}/
│       └── {fileId}.{ext}
└── workflow-logs/
    └── {workflowId}/{executionId}.json
```

**Lifecycle Policy (Auto-transition to Glacier):**

```json
{
  "Rules": [
    {
      "ID": "ArchiveColdData",
      "Status": "Enabled",
      "Filter": { "Prefix": "cold-archives/" },
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

---

## Multi-Tenancy & Security

### Multi-Tenancy Model

**Logical Separation (Preferred for SaaS):**

- Single database with `orgId` column on all tables
- Row-Level Security (RLS) in PostgreSQL/TimescaleDB
- Prisma middleware for automatic multi-tenant filtering
- Redis key prefixing: `org:{orgId}:...`

**Benefits:**
- Cost-effective
- Easier maintenance
- Simpler backups

**RLS Implementation (TimescaleDB):**

```sql
-- Enable RLS on device_states table
ALTER TABLE device_states ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their organization's data
CREATE POLICY org_isolation ON device_states
  USING (org_id = current_setting('app.current_org_id')::UUID);

-- Set org_id in session
SET app.current_org_id = '550e8400-e29b-41d4-a716-446655440000';
```

### Authentication & Authorization

**JWT-Based Authentication:**

```typescript
interface JWTPayload {
  sub: string;           // User ID
  orgId: string;         // Organization ID
  role: 'admin' | 'user' | 'viewer';
  scopes: string[];      // ['devices:read', 'workflows:write']
  iat: number;
  exp: number;
}

// Fastify decorator for auth
server.decorate('authenticate', async (request, reply) => {
  const token = request.headers.authorization?.split(' ')[1];
  if (!token) throw new Error('Unauthorized');

  const payload = await verifyJWT(token);
  request.user = payload;

  // Set RLS context for database queries
  await db.query(`SET app.current_org_id = '${payload.orgId}'`);
});

// Protected route
server.get('/api/devices', {
  preHandler: [server.authenticate],
}, async (request) => {
  // Query automatically filtered by RLS
  const devices = await db.query('SELECT * FROM devices');
  return devices.rows;
});
```

**Device Access Keys (MQTT Authentication):**

```typescript
// Scoped access key for devices
interface DeviceAccessKey {
  keyId: string;
  keySecret: string;  // Hashed (bcrypt)
  deviceId: string;
  orgId: string;
  permissions: {
    canPublish: string[];   // ['losant/{deviceId}/state']
    canSubscribe: string[]; // ['losant/{deviceId}/command']
  };
  expiresAt?: Date;
}

// EMQX authentication hook (HTTP POST to backend)
app.post('/mqtt/auth', async (req, res) => {
  const { username, password } = req.body; // username = keyId

  const key = await db.findAccessKey(username);
  if (!key) return res.status(401).send();

  const valid = await bcrypt.compare(password, key.keySecret);
  if (!valid) return res.status(401).send();

  return res.json({ result: 'allow', is_superuser: false });
});

// EMQX ACL hook
app.post('/mqtt/acl', async (req, res) => {
  const { username, topic, action } = req.body;

  const key = await db.findAccessKey(username);
  const allowed = action === 'publish'
    ? key.permissions.canPublish.some(pattern => matchTopic(topic, pattern))
    : key.permissions.canSubscribe.some(pattern => matchTopic(topic, pattern));

  return res.json({ result: allowed ? 'allow' : 'deny' });
});
```

### Security Hardening

1. **Function Node Sandboxing:**
   - VM2 for isolated execution
   - Whitelist modules (lodash, moment, crypto)
   - 5-second timeout per function
   - No file system access

2. **API Security:**
   - Rate limiting (1000 req/min per org)
   - Request size limits (10MB)
   - CORS policies
   - Helmet.js for security headers

3. **Network Security:**
   - Istio service mesh for mTLS
   - Network policies in Kubernetes
   - Private subnets for databases

4. **Secrets Management:**
   - Kubernetes Secrets for credentials
   - HashiCorp Vault for production
   - Rotate MQTT credentials every 90 days

---

## Deployment Architecture

> **Progressive Deployment Strategy:** Start with Docker Compose for simplicity and cost-effectiveness (0-10k devices), migrate to Kubernetes when scaling demands it (10k+ devices).

### Deployment Options Comparison

| Aspect | Docker Compose | Kubernetes |
|--------|---------------|------------|
| **Complexity** | Low | High |
| **Setup Time** | Hours | Days/Weeks |
| **Operational Cost** | $100-200/month | $500-1000/month |
| **Scaling** | Manual | Automatic (HPA) |
| **HA (High Availability)** | Limited (single host) | Native (multi-node) |
| **Ideal Device Count** | 0-10k devices | 10k-1M+ devices |
| **Team Size** | 1-5 engineers | 5+ engineers + DevOps |
| **Learning Curve** | Minimal | Significant |

### Production Deployment: Docker Compose (Recommended Start)

**Architecture Overview:**

```
                                [Internet]
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │  Traefik (Reverse     │
                        │  Proxy + SSL)         │
                        │  Let's Encrypt        │
                        └───────────┬───────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
        ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
        │  Next.js (x2)  │  │  API (x3)      │  │  WebSocket (x2)│
        │  Frontend      │  │  Fastify       │  │  Socket.io     │
        └────────────────┘  └────────┬───────┘  └────────┬───────┘
                                     │                   │
                    ┌────────────────┼───────────────────┤
                    │                │                   │
            ┌───────▼───────┐  ┌────▼──────┐  ┌────────▼────────┐
            │ Workflow (x3)  │  │State      │  │ MQTT Bridge     │
            │ Engine         │  │Consumer   │  │                 │
            └────────┬───────┘  │(x2)       │  └────────┬────────┘
                     │          └─────┬─────┘           │
                     │                │                 │
        ┌────────────┼────────────────┼─────────────────┼────────┐
        │            │                │                 │        │
        ▼            ▼                ▼                 ▼        ▼
  ┌──────────────────┐  ┌──────────────┐  ┌─────────┐  ┌─────────┐
  │ PostgreSQL +     │  │    Redis     │  │  NATS   │  │  EMQX   │
  │ TimescaleDB      │  │              │  │         │  │  MQTT   │
  │ (Prisma)         │  │              │  │         │  │         │
  └──────────────────┘  └──────────────┘  └─────────┘  └─────────┘
```

**Key Configuration (docker-compose.prod.yml excerpt):**

```yaml
version: '3.8'

services:
  # Reverse Proxy with automatic SSL
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker=true"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik-certs:/letsencrypt
    restart: unless-stopped

  # API with auto-scaling (3 replicas)
  api:
    image: iot-platform/api:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.example.com`)"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
    restart: unless-stopped

  # Databases with persistence
  postgres:
    image: timescale/timescaledb:latest-pg15
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./backups/postgres:/backups  # Automated backups
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
    restart: unless-stopped

volumes:
  postgres-data:
  traefik-certs:
```

**Scaling with Docker Compose:**

```bash
# Scale specific services manually
docker-compose -f docker-compose.prod.yml up -d --scale api=5
docker-compose -f docker-compose.prod.yml up -d --scale workflow-engine=5

# View resource usage
docker stats

# Rolling updates
docker-compose -f docker-compose.prod.yml pull api
docker-compose -f docker-compose.prod.yml up -d --no-deps api
```

**Benefits:**
- ✅ Simple setup (1-2 days vs 1-2 weeks for K8s)
- ✅ Low operational overhead
- ✅ Cost-effective ($100-200/month VPS vs $500+ K8s cluster)
- ✅ Sufficient for 0-10k devices
- ✅ Easy to debug and troubleshoot
- ✅ Smooth migration path to Kubernetes later

**Limitations:**
- ❌ Single-host (limited high availability)
- ❌ Manual scaling (no auto-scaling)
- ❌ No advanced health checks
- ❌ Limited to vertical scaling of VPS

---

### Kubernetes Deployment (For >10k Devices)

**When to Migrate:**
- Serving >10,000 devices
- Need automatic scaling (HPA)
- Require multi-region deployment
- Team has Kubernetes expertise
- Budget allows ($500-1000/month minimum)

**Sample Kubernetes Configuration:**

```yaml
# Deployment with HPA
apiVersion: apps/v1
kind: Deployment
metadata:
  name: workflow-engine
spec:
  replicas: 5
  selector:
    matchLabels:
      app: workflow-engine
  template:
    spec:
      containers:
      - name: workflow-engine
        image: iot-platform/workflow-engine:v1.2.3
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3003
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3003
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: workflow-engine-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: workflow-engine
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**Service Mesh (Istio - Optional):**

Benefits:
- mTLS between services
- Canary deployments
- Advanced traffic management

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: workflow-engine
spec:
  hosts:
  - workflow-engine
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: workflow-engine
        subset: v2
  - route:
    - destination:
        host: workflow-engine
        subset: v1
      weight: 90
    - destination:
        host: workflow-engine
        subset: v2
      weight: 10
```

**Migration Path:** See IMPLEMENTATION_GUIDE.md Appendix for detailed 6-week migration plan.

---

### Database Deployment

**Docker Compose (Initial):**
- Single-node PostgreSQL + TimescaleDB with backups
- Redis standalone
- MinIO single-node (optional)

**Kubernetes (Scale):**
- PostgreSQL + TimescaleDB: StatefulSet with streaming replication (read replicas for scale)
- Redis: Sentinel for HA, or Redis Cluster for scaling
- MinIO: Distributed mode (4+ nodes for erasure coding, optional)

---

## Performance & Scaling

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Dashboard Latency** | <100ms (p99) | WebSocket message to UI render |
| **Workflow Execution** | <500ms (p95) for simple flows | NATS trigger to completion |
| **API Response Time** | <200ms (p95) | Kong ingress to response |
| **Device State Ingestion** | 100k msg/sec | MQTT → TimescaleDB |
| **Concurrent Connections** | 1M+ devices | EMQX cluster |
| **Database Writes** | 50k writes/sec | TimescaleDB insert rate |

### Horizontal Scaling Strategy

**Workflow Engine:**
- Stateless pods (scale based on CPU/memory)
- NATS consumer groups for load distribution
- Target: 1 pod per 1000 concurrent workflows

**API Services:**
- Autoscale on request rate (HPA)
- Target: 70% CPU utilization

**EMQX (MQTT Broker):**
- Add nodes to cluster (automatic rebalancing)
- Target: 250k connections per node (4-core, 8GB RAM)

**TimescaleDB:**
- Vertical scaling (up to 64 cores, 256GB RAM)
- Read replicas for dashboard queries
- Sharding by org_id for >10M devices

**Redis:**
- Redis Cluster for horizontal scaling
- Separate clusters per use case (sessions, workflow state, cache)

### Caching Strategy

```
┌─────────────┐
│   Browser   │
│   (SWR)     │  ← 5-minute stale-while-revalidate
└──────┬──────┘
       │
┌──────▼──────┐
│  Next.js    │
│  API Route  │  ← 1-minute edge cache (Vercel/CDN)
└──────┬──────┘
       │
┌──────▼──────┐
│   Fastify   │
│   Backend   │  ← Redis cache (5-minute TTL)
└──────┬──────┘
       │
┌──────▼──────┐
│  Database   │
└─────────────┘
```

### Load Testing Results (Simulated)

**Scenario:** 100k devices sending state every 10 seconds

```
Throughput: 10k messages/sec
CPU Usage: 45% (workflow-engine pods)
Memory: 60% (workflow-engine pods)
TimescaleDB Write Rate: 12k rows/sec
p99 Latency: 85ms (MQTT → Dashboard)
```

---

## Trade-offs & Design Decisions

### 1. Next.js 14 vs. SPA (Vite + React)

**Decision:** Next.js 14 with App Router

**Rationale:**
- SSR for initial dashboard load (faster Time to Interactive)
- API routes co-located with frontend (monorepo benefits)
- Built-in optimizations (image, font, code splitting)
- Vercel deployment for edge caching

**Trade-off:**
- More complex than SPA (RSC, client/server boundary)
- Server component restrictions

### 2. Fastify vs. Express

**Decision:** Fastify

**Rationale:**
- 2x faster request handling
- Schema-first validation (automatic OpenAPI docs)
- TypeScript-native
- Plugin ecosystem

**Trade-off:**
- Smaller community than Express
- Fewer middleware packages

### 3. TimescaleDB vs. InfluxDB

**Decision:** TimescaleDB

**Rationale:**
- SQL queries (familiar to developers)
- PostgreSQL ecosystem (pgAdmin, extensions)
- Better aggregation performance for dashboard queries
- JSONB support for flexible schemas

**Trade-off:**
- Higher memory usage than InfluxDB
- Compression ratio slightly lower

### 4. Docker Compose vs. Kubernetes (Progressive Approach)

**Decision:** Start with Docker Compose, migrate to Kubernetes at scale

**Rationale:**
- **Phase 1 (0-10k devices)**: Docker Compose
  - Faster time-to-market (setup in hours vs. days)
  - Lower operational complexity (1-2 engineers can manage)
  - Cost-effective ($100-200/month vs. $500-1000/month)
  - Sufficient for MVP and early growth
  - Easy debugging and troubleshooting

- **Phase 2 (10k+ devices)**: Migrate to Kubernetes
  - Automatic scaling (HPA based on metrics)
  - Multi-region deployment capability
  - Advanced health checks and self-healing
  - Industry standard (better hiring, mature ecosystem)
  - Service mesh capabilities (Istio)

**Trade-off:**
- Migration effort (4-6 weeks) when scaling demands it
- Need to design services for both environments initially
- Team needs to learn Kubernetes eventually

**Migration Trigger Points:**
- Serving >10,000 devices
- Need for auto-scaling
- Multi-region requirements
- Team has K8s expertise
- Budget allows ($500+ monthly)

### 5. Monorepo vs. Polyrepo

**Decision:** Monorepo (Turborepo)

**Rationale:**
- Shared TypeScript types between frontend/backend
- Atomic changes across services
- Simplified dependency management
- Faster CI/CD (incremental builds)

**Trade-off:**
- Larger repository size
- Requires tooling (Turborepo, Nx)

### 6. WebSocket vs. Server-Sent Events (SSE)

**Decision:** WebSocket (Socket.io)

**Rationale:**
- Bidirectional (dashboard input controls → backend)
- Lower latency than SSE
- Connection pooling, automatic reconnection
- Fallback to long polling

**Trade-off:**
- More complex than SSE
- Load balancer sticky sessions required

---

## Appendix

### Technology Maturity Matrix

| Component | Maturity | Risk | Alternatives Considered |
|-----------|----------|------|-------------------------|
| Next.js 14 | Stable | Low | Vite + React, Remix |
| Fastify | Stable | Low | Express, Hono |
| TimescaleDB | Stable | Low | InfluxDB, QuestDB |
| EMQX | Production | Medium | VerneMQ, Mosquitto Cluster |
| NATS | Production | Low | RabbitMQ, Kafka |
| Docker Compose | Mature | Low | Docker Swarm, Kubernetes (initial) |
| Kubernetes | Mature | Medium | Used after scale (10k+ devices) |

### Deployment Checklist

**Initial Deployment (Docker Compose):**
- [ ] Production VPS provisioned (16+ CPU, 32GB+ RAM)
- [ ] Docker and Docker Compose installed
- [ ] docker-compose.prod.yml configured
- [ ] Traefik reverse proxy with SSL (Let's Encrypt)
- [ ] Environment variables and secrets configured
- [ ] Databases deployed with persistent volumes
- [ ] Automated backup scripts (PostgreSQL + TimescaleDB)
- [ ] Monitoring stack deployed (Prometheus/Grafana)
- [ ] CI/CD pipeline configured (GitHub Actions)
- [ ] DNS records configured
- [ ] Log rotation configured
- [ ] Disaster recovery plan documented

**Kubernetes Migration (Optional, at scale):**
- [ ] Kubernetes cluster provisioned (EKS/GKE/AKS)
- [ ] Helm charts created for all services
- [ ] Databases deployed (StatefulSets with PVs)
- [ ] Secrets stored in Kubernetes Secrets or Vault
- [ ] HPA (HorizontalPodAutoscaler) configured
- [ ] Ingress controller installed (NGINX or Traefik)
- [ ] Service mesh installed (optional: Istio/Linkerd)
- [ ] Monitoring enhanced (Prometheus Operator)
- [ ] Blue-green deployment for traffic cutover
- [ ] Old Docker Compose infrastructure decommissioned

### Further Reading

- [Losant Documentation](https://docs.losant.com/)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Fastify Best Practices](https://fastify.dev/docs/latest/Guides/Getting-Started/)
- [TimescaleDB Time-Series Guide](https://docs.timescale.com/)
- [EMQX Deployment](https://www.emqx.io/docs/en/v5.0/deploy/install.html)
- [Kubernetes Patterns](https://k8spatterns.io/)

---

**Document Version:** 1.0
**Last Updated:** 2026-02-04
**Maintained By:** Architecture Team
