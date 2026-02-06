# POC to Enterprise Scaling Plan
## Enterprise IoT Platform - Complete Evolution Roadmap

**Version:** 1.0
**Date:** 2026-02-05
**Target Load:** 27 MB/sec | 93.15 GB/day | 27,000 msg/sec
**Timeline:** POC (Weeks 1-3) → Enterprise (Weeks 17+)

---

## Executive Summary

This document provides a comprehensive roadmap for evolving the Enterprise IoT Platform from a local POC to a production-ready enterprise system capable of handling millions of devices and billions of messages per day.

### Quick Navigation

- **Starting Development?** → See [Phase 0: POC](#phase-0-poc-weeks-1-3)
- **Adding MQTT?** → See [Phase 1: MVP](#phase-1-mvp-weeks-4-8)
- **Scaling to 100k devices?** → See [Phase 2: Scale](#phase-2-scale-weeks-9-16)
- **Enterprise deployment?** → See [Phase 3: Enterprise](#phase-3-enterprise-weeks-17)
- **Need cost estimates?** → See [Infrastructure Evolution Matrix](#infrastructure-evolution-matrix)

### 4-Phase Evolution Overview

```
Phase 0: POC (Weeks 1-3)
├─ Local development
├─ 100 devices, HTTP ingestion
├─ PostgreSQL + TimescaleDB
├─ Basic real-time dashboard
└─ Cost: $0 (local)

Phase 1: MVP (Weeks 4-8)
├─ Docker Compose on VPS
├─ 1,000-10,000 devices, MQTT ingestion
├─ Visual workflow editor
├─ Multi-tenancy
└─ Cost: $150-250/month

Phase 2: Scale (Weeks 9-16)
├─ EMQX cluster + PostgreSQL replicas
├─ 10,000-100,000 devices
├─ Gateway Edge Agents (Go)
├─ Industrial protocols (Profinet, Modbus, OPC UA, BACnet, S7)
└─ Cost: $400-1,200/month

Phase 3: Enterprise (Weeks 17+)
├─ Kubernetes deployment
├─ 100,000-1,000,000 devices
├─ Multi-region, auto-scaling
├─ 99.9% uptime SLA
└─ Cost: $2,000-5,000/month
```

### How to Use This Document

**Development Teams:**
1. Read the phase you're currently in
2. Follow the "Deliverables" checklist
3. Use "Migration from Previous Phase" for transitions
4. Reference [Infrastructure Evolution Matrix](#infrastructure-evolution-matrix) for architecture changes

**Technical Leaders:**
1. Review [Performance Targets](#performance--capacity-planning) to understand capacity
2. Check [Migration Checklists](#migration-checklists) for transition planning
3. Use [Risk Mitigation](#risk-mitigation--lessons-learned) to avoid common pitfalls

**Stakeholders:**
1. See [Infrastructure Evolution Matrix](#infrastructure-evolution-matrix) for cost vs capacity
2. Review phase completion criteria for milestone tracking

---

## Phase 0: POC (Weeks 1-3)

### Objective
Build a production-ready POC that proves core concepts while using architecture that scales to enterprise without major rewrites.

### Infrastructure

**Local Development Environment:**
```
Developer Laptop
├── PostgreSQL 15 + TimescaleDB (local)
├── Redis (optional, for caching experiments)
├── Next.js 14 frontend (npm run dev)
├── Fastify backend (npm run dev)
└── Node.js 20 LTS
```

**Architecture Pattern:**
```
HTTP Client → Fastify API → Prisma Client → PostgreSQL+TimescaleDB
                ↓
         Socket.io WebSocket → Next.js Frontend
```

### Key Architecture Decisions

**What We Do Right (Production-Grade):**
- ✅ **Clean Architecture:** Controllers → Services → Prisma Client (3-layer separation)
- ✅ **TypeScript End-to-End:** Type safety from database to frontend
- ✅ **PostgreSQL + TimescaleDB:** Production database from day 1 (not SQLite!)
- ✅ **Prisma ORM:** Type-safe data access with auto-generated types
- ✅ **Monorepo Structure:** Turborepo + pnpm for shared code
- ✅ **Database Migrations:** Prisma migrations for version control
- ✅ **Zod Validation:** Runtime type validation for API requests

**What We Keep Simple (Add Later):**
- ❌ Skip Docker (add in Week 4)
- ❌ Skip MQTT broker (use HTTP, add EMQX in Week 4-8)
- ❌ Skip authentication (add JWT in Week 4-8)
- ❌ Skip multi-tenancy (add organizations in Week 4-8)
- ❌ Skip industrial protocols (add Profinet, Modbus, OPC UA, BACnet, S7 in Week 9-16)

### Technology Stack

| Component | Technology | Why | Version |
|-----------|-----------|-----|---------|
| **Frontend** | Next.js 14 | SSR/SSG, optimal performance | 14.x |
| **Backend** | Fastify | 2x faster than Express | 4.x |
| **Database** | PostgreSQL + TimescaleDB | Unified time-series + relational | 15+ / 2.13+ |
| **ORM** | Prisma | Type-safe, auto-generated types | 5.x |
| **Real-time** | Socket.io | WebSocket with fallback | 4.x |
| **Validation** | Zod | Runtime type validation | 3.x |
| **Language** | TypeScript | Compile-time type safety | 5.x |

### Deliverables

**Week 1: Foundation**
- [x] Monorepo initialized (Turborepo + pnpm)
- [x] PostgreSQL + TimescaleDB running locally
- [x] Backend project with TypeScript
- [x] Database connection working
- [x] Prisma schema created (Device, DeviceState models)
- [x] Prisma migrations applied
- [x] TimescaleDB hypertable configured
- [x] Compression and retention policies added

**Week 2: Core Features**
- [x] Device CRUD API (Create, Read, Update, Delete)
- [x] Device state ingestion endpoint (HTTP POST)
- [x] WebSocket server for real-time updates
- [x] Frontend initialized (Next.js 14)
- [x] Device list component
- [x] Gauge block component (real-time)
- [x] Time-series chart block (historical)

**Week 3: Polish**
- [x] Error handling middleware
- [x] Logging setup
- [x] Basic testing setup
- [x] Docker Compose for local services
- [x] Documentation

### Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Devices** | 100 devices | Proof of concept scale |
| **Message Rate** | 10-100 msg/sec | Local dev limits |
| **API Latency** | <200ms p95 | Acceptable for POC |
| **Dashboard Latency** | <500ms | Local WebSocket |
| **Database Size** | <10 GB | 3-week data retention |
| **Cost** | $0 | Local development |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Developer Laptop                       │
│                                                          │
│  ┌──────────────┐          ┌──────────────────────┐    │
│  │   HTTP POST  │          │    Next.js Frontend   │    │
│  │   (curl/     │          │    (localhost:3000)   │    │
│  │   Postman)   │          └──────────┬────────────┘    │
│  └──────┬───────┘                     │                  │
│         │ POST /api/v1/devices/:id/state │             │
│         ▼                             ▼                  │
│  ┌─────────────────────────────────────────────────┐    │
│  │        Fastify API (localhost:3001)             │    │
│  │  ┌──────────────┐  ┌───────────────────────┐   │    │
│  │  │ Controllers  │──│ Services              │   │    │
│  │  │ (HTTP)       │  │ (Business Logic)      │   │    │
│  │  └──────────────┘  └───────┬───────────────┘   │    │
│  │                             │                    │    │
│  │                             ▼                    │    │
│  │                    ┌─────────────────┐          │    │
│  │                    │  Prisma Client  │          │    │
│  │                    │  (Type-safe)    │          │    │
│  │                    └────────┬────────┘          │    │
│  └─────────────────────────────┼──────────────────┘    │
│                                 │                        │
│                                 ▼                        │
│  ┌─────────────────────────────────────────────────┐    │
│  │     PostgreSQL 15 + TimescaleDB                 │    │
│  │  ┌──────────────┐  ┌──────────────────────┐    │    │
│  │  │   devices    │  │   device_states      │    │    │
│  │  │  (metadata)  │  │   (time-series       │    │    │
│  │  │              │  │    hypertable)       │    │    │
│  │  └──────────────┘  └──────────────────────┘    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │     Socket.io WebSocket Server                  │    │
│  │  - Broadcasts device state updates              │    │
│  │  - Real-time dashboard updates                  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Code Patterns

**Prisma Schema (apps/api/prisma/schema.prisma):**
```prisma
model Device {
  id         String   @id @default(uuid())
  deviceId   String   @unique @map("device_id")
  name       String
  tags       String[]
  attributes Json?
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  states DeviceState[]

  @@map("devices")
}

model DeviceState {
  id        String   @id @default(uuid())
  deviceId  String   @map("device_id")
  data      Json
  timestamp DateTime @default(now())

  device Device @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@index([deviceId, timestamp])
  @@map("device_states")
}
```

**Service Layer Pattern:**
```typescript
import { PrismaClient } from '@prisma/client';

export class DeviceService {
  constructor(private prisma: PrismaClient) {}

  async getAllDevices() {
    return this.prisma.device.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async createDevice(data: CreateDeviceDTO) {
    return this.prisma.device.create({ data });
  }
}
```

### Success Criteria

- [ ] Can create/read/update/delete devices via API
- [ ] Can POST device state data via HTTP
- [ ] Dashboard updates in real-time (<500ms latency)
- [ ] Database stores 3 weeks of telemetry data
- [ ] TimescaleDB compression reduces storage by 3x
- [ ] No TypeScript compile errors
- [ ] Tests pass (if implemented)

---

## Phase 1: MVP (Weeks 4-8)

### Objective
Add MQTT broker, multi-tenancy, and visual workflow editor to create a minimal viable product ready for pilot deployments.

### Infrastructure Changes

**Deployment:** Docker Compose on VPS ($150-250/month)

```
Hetzner/DigitalOcean VPS
├── CPU: 16 cores
├── RAM: 32 GB
├── Storage: 1 TB NVMe SSD
├── Network: 1 Gbps
└── Components:
    ├── EMQX (1 container, 8GB allocated)
    ├── PostgreSQL + TimescaleDB (1 container, 12GB)
    ├── Redis (1 container, 4GB)
    ├── NATS (1 container, 2GB)
    ├── API (3 replicas, 2GB each)
    ├── Workflow Engine (3 replicas, 2GB each)
    ├── WebSocket (2 replicas, 1GB each)
    └── Frontend (2 replicas, 512MB each)
```

**Architecture Evolution:**

```
BEFORE (POC):
HTTP → API → Database → WebSocket

AFTER (MVP):
MQTT → EMQX → NATS → Workflow Engine → Database
                        ↓
                  API → WebSocket → Frontend
```

### New Components

| Component | Technology | Purpose | Capacity |
|-----------|-----------|---------|----------|
| **MQTT Broker** | EMQX 5.x | Device connectivity | 250k connections/node |
| **Message Bus** | NATS 2.10+ | Internal pub/sub | 5M msg/sec |
| **Workflow Engine** | Node.js | Visual workflows | 1k concurrent workflows |
| **Auth** | JWT + Passport.js | Multi-tenant auth | N/A |

### Key Features Added

**1. MQTT Device Connectivity**
- Devices connect via MQTT (`losant/<DEVICE_ID>/state`)
- Access Keys with topic-level ACLs
- MQTT → NATS bridge for workflow triggers

**2. Multi-Tenancy**
- Organizations table for logical isolation
- Row-Level Security (RLS) in PostgreSQL
- `org_id` foreign key in all tables
- JWT tokens include `orgId` claim

**3. Visual Workflow Editor**
- React Flow-based canvas
- Drag-and-drop nodes (Device, Function, MQTT, Conditional)
- Workflow definitions stored in PostgreSQL
- Workflow state persisted in Redis

**4. Access Keys**
- API keys for programmatic access
- MQTT credentials for device authentication
- Scoped permissions (device:read, device:write, etc.)

### Database Schema Changes

**Add Organizations:**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settings JSONB DEFAULT '{}'::jsonb
);

-- Add org_id to existing tables
ALTER TABLE devices ADD COLUMN org_id UUID REFERENCES organizations(id);
ALTER TABLE device_states ADD COLUMN org_id UUID REFERENCES organizations(id);

-- Enable Row-Level Security
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY org_isolation_devices ON devices
  USING (org_id = current_setting('app.current_org_id', true)::UUID);
```

**Add Workflows:**
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  nodes JSONB NOT NULL, -- Flow-Based Programming nodes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Devices** | 1,000-10,000 | Early adopter pilot |
| **Message Rate** | 1,000-5,000 msg/sec | 18% of target load (27k msg/sec) |
| **API Latency** | <100ms p95 | Production standard |
| **Dashboard Latency** | <100ms p99 | Real-time updates |
| **MQTT Latency** | <50ms p99 | Device responsiveness |
| **Workflow Execution** | <5 seconds (simple) | User expectation |
| **Database Size** | 100-500 GB | 90-day retention |
| **Cost** | $150-250/month | VPS with services |

### Migration from POC

**Step-by-Step Transition:**

1. **Set Up Docker Compose**
   ```bash
   # Create docker-compose.yml
   # Add services: emqx, nats, redis, postgres, api, frontend
   docker-compose up -d
   ```

2. **Add Multi-Tenancy to Database**
   ```bash
   # Create migration
   pnpm prisma migrate create add_organizations
   # Update schema.prisma with org_id
   pnpm prisma migrate dev
   ```

3. **Migrate HTTP Endpoints to MQTT**
   - Keep HTTP endpoints for backward compatibility
   - Add EMQX MQTT broker
   - Configure MQTT → NATS bridge
   - Update documentation

4. **Add JWT Authentication**
   ```typescript
   // middleware/auth.ts
   export async function authMiddleware(req, res, next) {
     const token = req.headers.authorization?.split(' ')[1];
     const decoded = jwt.verify(token, process.env.JWT_SECRET);
     req.user = { orgId: decoded.orgId, userId: decoded.userId };
     next();
   }
   ```

5. **Deploy to VPS**
   ```bash
   # Provision VPS (Hetzner, DigitalOcean)
   # Install Docker + Docker Compose
   # Copy docker-compose.yml
   # Set environment variables
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Success Criteria

- [ ] 1,000+ devices connected via MQTT
- [ ] Multi-tenant isolation working (separate organizations)
- [ ] Visual workflow editor functional
- [ ] Workflows trigger on device state changes
- [ ] JWT authentication protecting all endpoints
- [ ] Dashboard updates <100ms latency
- [ ] VPS deployment stable for 7 days
- [ ] Cost within $250/month budget

---

## Phase 2: Scale (Weeks 9-16)

### Objective
Scale to 10,000-100,000 devices with EMQX clustering, Gateway Edge Agents, and industrial protocol support (Profinet, Modbus, OPC UA, BACnet, Siemens S7).

### Infrastructure Changes

**Deployment:** Docker Compose or Kubernetes ($400-1,200/month)

```
Cluster/VPS (3 nodes)
├── Node 1: EMQX + NATS + Redis
├── Node 2: EMQX + PostgreSQL (primary)
├── Node 3: EMQX + PostgreSQL (replica)
└── Components:
    ├── EMQX Cluster (3 nodes, 500k device capacity)
    ├── PostgreSQL Primary + 1 Replica
    ├── Redis Cluster (3 nodes for HA)
    ├── NATS Cluster
    ├── API (5 pods, auto-scaled)
    ├── Workflow Engine (5-10 pods, auto-scaled)
    └── Gateway Edge Agents (Go binaries on customer premises)
```

**Architecture Evolution:**

```
NEW Edge Layer:
Industrial Devices (Profinet/Modbus/OPC UA/BACnet/S7)
     ↓
Gateway Edge Agent (Go)
  - Protocol translation
  - Edge filtering (report-by-exception)
  - Local buffering
     ↓ MQTT
EMQX Cluster (2-3 nodes) → [existing architecture]
```

### New Components

**1. Gateway Edge Agent (GEA) - Go Binary**
- **Purpose:** Translate industrial protocols to MQTT
- **Protocols Supported:**
  - Profinet (industrial Ethernet)
  - Modbus TCP/RTU (serial/Ethernet)
  - OPC UA (machine-to-machine)
  - BACnet (building automation)
  - Siemens S7 (PLC communication)
- **Features:**
  - Report-by-exception filtering (50-90% data reduction)
  - Local buffering during network outages
  - Protocol-specific drivers
  - Docker deployment on edge gateways

**2. EMQX Clustering**
- 2-3 EMQX nodes with automatic load balancing
- 500k-750k device capacity
- Shared subscriptions for workflow triggers

**3. PostgreSQL Read Replicas**
- Primary for writes
- 1-2 replicas for dashboard queries
- Replication lag <500ms

**4. Redis Cluster**
- 3 nodes for high availability
- Automatic failover
- Sharding by key prefix

### Advanced Features

**1. Edge-Local Workflow Execution (Optional)**
- Deploy workflows to GEA for <10ms latency
- Useful for safety-critical applications
- Falls back to cloud workflows if edge fails

**2. Advanced Dashboard Blocks**
- GPS blocks with device marker clustering
- Input control blocks (buttons, sliders)
- Multi-device aggregation blocks
- Live stream blocks (high-frequency data)

**3. Batch Inserts**
```typescript
// Instead of 27,000 individual inserts/sec
await prisma.deviceState.create({ data: {...} });

// Batch 100-1000 rows per transaction → 270 batch inserts/sec
await prisma.deviceState.createMany({
  data: batchOf100Rows,
  skipDuplicates: true
});
```

**Result:** 70-80% reduction in database load

### Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Devices** | 10,000-100,000 | Production scale |
| **Message Rate** | 10,000-50,000 msg/sec | 100% of target load (27k msg/sec) |
| **API Latency** | <50ms p99 | Enterprise standard |
| **Dashboard Latency** | <50ms p99 | Real-time responsiveness |
| **MQTT Latency** | <30ms p99 | Industrial requirements |
| **Workflow Execution** | <3 seconds (simple) | User expectation |
| **Database Writes** | 27,000 writes/sec | From LOAD_ANALYSIS.md |
| **Data Ingestion** | 27 MB/sec | From LOAD_ANALYSIS.md |
| **Storage** | 93.15 GB/day raw | From LOAD_ANALYSIS.md |
| **Compressed Storage** | 31 GB/day | 3:1 compression ratio |
| **Cost** | $400-1,200/month | Scaled infrastructure |

### Capacity Planning (From LOAD_ANALYSIS.md)

**Target Load:** 27,000 messages/sec = 27 MB/sec (assuming 1 KB avg message size)

**Component Capacity vs Target:**

| Component | Capacity | Target Load | Utilization | Headroom |
|-----------|----------|-------------|-------------|----------|
| **EMQX Ingestion** | 100,000 msg/sec | 27,000 msg/sec | 27% | **3.7x** |
| **Database Writes** | 50,000 writes/sec | 27,000 writes/sec | 54% | **1.8x** |
| **EMQX Connections** | 500k (2 nodes) | 50k-300k | 10-60% | **1.6-10x** |
| **Workflow Engine** | 5,000 workflows/sec | 2,700 workflows/sec (10% trigger) | 54% | **1.8x** |

**Device Calculation (10-second reporting interval):**
- 27,000 msg/sec ÷ 0.1 msg/device/sec = **270,000 devices**
- Architecture capacity: 1M+ devices
- **Headroom: 73%**

### Optimizations

**1. Edge Filtering (Report-by-Exception)**
```go
// Gateway Edge Agent - Only send if value changed significantly
threshold := 0.5 // 0.5°C change
if math.Abs(currentTemp - lastTemp) > threshold {
  publishToMQTT(currentTemp)
  lastTemp = currentTemp
}
```
**Impact:** Reduces data by 50-90% (27 MB/sec → 2.7-13.5 MB/sec)

**2. TimescaleDB Compression**
```sql
-- Compress data older than 7 days (3-5x reduction)
SELECT add_compression_policy('device_states', INTERVAL '7 days');
```
**Impact:** 93.15 GB/day → 31 GB/day compressed

**3. Data Retention Policy**
```sql
-- Drop data older than 90 days
SELECT add_retention_policy('device_states', INTERVAL '90 days');
```
**Impact:** Keeps hot storage <3 TB

**4. MQTT QoS Optimization**
```javascript
// QoS 0: Fire-and-forget (fastest, no acknowledgment)
client.publish('losant/deviceId/state', payload, { qos: 0 });
```
**Impact:** 30-50% reduction in MQTT overhead

### Migration from MVP

**Step-by-Step Transition:**

1. **Cluster EMQX (2-3 nodes)**
   ```bash
   # Configure EMQX cluster in docker-compose.yml
   # Set cluster discovery method (static or DNS)
   # Verify cluster status
   docker-compose exec emqx1 emqx_ctl cluster status
   ```

2. **Add PostgreSQL Read Replicas**
   ```bash
   # Configure streaming replication
   # Point dashboard queries to replica
   # Monitor replication lag (<500ms target)
   ```

3. **Implement Batch Inserts**
   ```typescript
   // Collect messages in memory for 100ms
   const batch = [];
   setInterval(async () => {
     if (batch.length > 0) {
       await prisma.deviceState.createMany({ data: batch });
       batch.length = 0; // Clear batch
     }
   }, 100);
   ```

4. **Enable TimescaleDB Compression**
   ```sql
   ALTER TABLE device_states SET (
     timescaledb.compress,
     timescaledb.compress_segmentby = 'device_id'
   );
   SELECT add_compression_policy('device_states', INTERVAL '7 days');
   ```

5. **Deploy Gateway Edge Agents**
   ```bash
   # Build Go binary
   go build -o gea cmd/gateway/main.go

   # Deploy to customer gateway (Docker or binary)
   docker run -d --name gea \
     -e MQTT_BROKER=mqtt://cloud.example.com:1883 \
     -e DEVICE_ID=gateway-001 \
     gea:latest
   ```

6. **Add Prometheus + Grafana**
   ```bash
   # Add to docker-compose.yml
   # Configure Prometheus scrape targets
   # Import Grafana dashboards for EMQX, PostgreSQL, Redis
   ```

### Success Criteria

- [ ] 10,000+ devices connected
- [ ] EMQX cluster stable (3 nodes)
- [ ] Database writes: 27,000 writes/sec sustained
- [ ] Data ingestion: 27 MB/sec sustained
- [ ] PostgreSQL replication lag <500ms
- [ ] TimescaleDB compression reducing storage by 70%
- [ ] Gateway Edge Agents deployed at 5+ sites
- [ ] Industrial protocols (Profinet, Modbus, OPC UA, BACnet, S7) working
- [ ] Dashboard latency <50ms p99
- [ ] 99% uptime over 30 days
- [ ] Cost within $1,200/month budget

---

## Phase 3: Enterprise (Weeks 17+)

### Objective
Achieve enterprise-grade scale, reliability, and features with Kubernetes, multi-region deployment, and 99.9% uptime SLA.

### Infrastructure Changes

**Deployment:** Kubernetes (EKS/GKE/AKS) ($2,000-5,000/month)

```
Kubernetes Cluster (5-10 nodes)
├── Node Pool 1: Application (5x 8-core, 32GB)
├── Node Pool 2: Data (3x 16-core, 64GB with SSD)
├── Node Pool 3: EMQX (3x 8-core, 32GB)
└── Components:
    ├── EMQX StatefulSet (5+ pods, 1M+ device capacity)
    ├── PostgreSQL StatefulSet (primary + replicas)
    ├── Redis Cluster (6 pods, HA)
    ├── NATS Cluster (3 pods)
    ├── API Deployment (HPA: 5-20 pods)
    ├── Workflow Engine Deployment (HPA: 10-50 pods)
    ├── WebSocket Deployment (HPA: 3-10 pods)
    ├── Frontend Deployment (HPA: 3-10 pods)
    └── Istio Service Mesh (mTLS, traffic management)
```

**Multi-Region Architecture:**

```
       Global Load Balancer (Route 53, CloudFlare)
                    │
        ┌───────────┼───────────┐
        │                       │
   Region 1 (US-East)     Region 2 (EU-West)
        │                       │
   K8s Cluster            K8s Cluster
   EMQX Cluster           EMQX Cluster
   PostgreSQL (Primary)   PostgreSQL (Replica)
   Redis Cluster          Redis Cluster
        │                       │
        └───────────┬───────────┘
                    │
           Database Replication
```

### Advanced Features

**1. Horizontal Pod Autoscaler (HPA)**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: workflow-engine-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: workflow-engine
  minReplicas: 10
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: nats_queue_depth
      target:
        type: AverageValue
        averageValue: "100"
```

**2. Service Mesh (Istio)**
- Mutual TLS (mTLS) for all service-to-service communication
- Traffic splitting for canary deployments
- Circuit breaking for fault tolerance
- Observability (distributed tracing)

**3. Database Sharding**
```sql
-- Shard by org_id for >1M devices
-- Shard 1: org_id hash % 4 = 0
-- Shard 2: org_id hash % 4 = 1
-- Shard 3: org_id hash % 4 = 2
-- Shard 4: org_id hash % 4 = 3

-- Application-level routing
const shardId = hashOrgId(orgId) % 4;
const prisma = prismaClients[shardId];
```

**4. CDN for Frontend**
- CloudFlare or AWS CloudFront
- Static asset caching (CSS, JS, images)
- Edge caching for dashboard definitions

**5. Advanced RBAC**
- Kubernetes RBAC for infrastructure
- Application-level RBAC (admin, editor, viewer)
- SSO/SAML integration (Okta, Auth0, Azure AD)

**6. Disaster Recovery**
- Automated backups (hourly PostgreSQL snapshots)
- Cross-region replication
- RTO (Recovery Time Objective): <1 hour
- RPO (Recovery Point Objective): <15 minutes

### Performance Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Devices** | 100,000-1,000,000 | Enterprise scale |
| **Message Rate** | 50,000-100,000 msg/sec | 2-3.7x target load (27k msg/sec) |
| **API Latency** | <30ms p99 | Industry-leading |
| **Dashboard Latency** | <100ms p99 | Real-time responsiveness |
| **MQTT Latency** | <20ms p99 | Industrial requirements |
| **Workflow Execution** | <2 seconds (simple) | User expectation |
| **Uptime** | 99.9% | Enterprise SLA (8.76 hours downtime/year) |
| **Cost** | $2,000-5,000/month | Kubernetes + managed services |

### When to Migrate to Kubernetes

**Trigger Points:**
- Serving >300,000 devices
- Need multi-region deployment
- Auto-scaling critical (traffic spikes >2x)
- Team has Kubernetes expertise
- Budget allows $500+/month

**Avoid Kubernetes If:**
- Serving <10,000 devices
- Budget <$500/month
- Team lacks DevOps expertise
- Vertical scaling (bigger VPS) is sufficient

### Migration from Scale Phase

**Step-by-Step Transition:**

1. **Provision Kubernetes Cluster**
   ```bash
   # AWS EKS
   eksctl create cluster --name iot-platform --region us-east-1 --nodes 5

   # GCP GKE
   gcloud container clusters create iot-platform --num-nodes=5 --region=us-central1

   # Azure AKS
   az aks create --name iot-platform --resource-group iot-rg --node-count 5
   ```

2. **Create Helm Charts**
   ```bash
   # Create charts for each service
   helm create emqx
   helm create api
   helm create workflow-engine
   # Configure values.yaml for each chart
   ```

3. **Set Up Service Mesh (Istio)**
   ```bash
   istioctl install --set profile=production
   kubectl label namespace default istio-injection=enabled
   ```

4. **Configure HPA**
   ```bash
   kubectl apply -f hpa/workflow-engine-hpa.yaml
   kubectl apply -f hpa/api-hpa.yaml
   ```

5. **Implement Database Sharding (if >1M devices)**
   ```typescript
   // Create 4 Prisma clients (one per shard)
   const prismaShards = [
     new PrismaClient({ datasources: { db: { url: SHARD_1_URL } } }),
     new PrismaClient({ datasources: { db: { url: SHARD_2_URL } } }),
     new PrismaClient({ datasources: { db: { url: SHARD_3_URL } } }),
     new PrismaClient({ datasources: { db: { url: SHARD_4_URL } } }),
   ];
   ```

6. **Add Multi-Region Deployment**
   ```bash
   # Deploy to Region 2
   kubectl config use-context gke_project_us-west1
   helm install iot-platform ./charts/iot-platform

   # Configure database replication
   # Set up global load balancer (Route 53, CloudFlare)
   ```

7. **SLA Monitoring**
   ```bash
   # Deploy Prometheus + Grafana
   helm install prometheus prometheus-community/kube-prometheus-stack

   # Configure alerting (PagerDuty, Opsgenie)
   # Set up uptime monitoring (UptimeRobot, Pingdom)
   ```

### Success Criteria

- [ ] 100,000+ devices connected
- [ ] Kubernetes cluster stable (5+ nodes)
- [ ] HPA auto-scaling working (tested with load spikes)
- [ ] Service mesh (Istio) mTLS enabled
- [ ] Multi-region deployment (2 regions)
- [ ] Database sharding implemented (if >1M devices)
- [ ] 99.9% uptime achieved over 30 days
- [ ] Disaster recovery tested (RTO <1 hour)
- [ ] Cost within $5,000/month budget

---

## Infrastructure Evolution Matrix

Comprehensive table showing component transitions across all phases:

| Component | POC (Weeks 1-3) | MVP (Weeks 4-8) | Scale (Weeks 9-16) | Enterprise (Weeks 17+) |
|-----------|-----------------|-----------------|---------------------|------------------------|
| **Frontend** | Next.js local (npm run dev) | Next.js Docker (2 replicas) | Next.js Docker (2 replicas) | Next.js K8s (HPA: 3-10 pods) + CDN |
| **API** | Fastify local (npm run dev) | Fastify Docker (3 replicas) | Fastify Docker (5 replicas) | Fastify K8s (HPA: 5-20 pods) |
| **Database** | PostgreSQL local | PostgreSQL+TimescaleDB Docker | PostgreSQL Primary + 1 Replica | Sharded PostgreSQL (4 shards) |
| **MQTT Broker** | None (HTTP only) | EMQX 1 node (250k capacity) | EMQX Cluster (2-3 nodes, 500k-750k) | EMQX Cluster (5+ nodes, 1M+) |
| **Workflows** | Hardcoded (if-then logic) | Workflow Engine Docker (3 replicas) | Workflow Engine Docker (5-10 replicas) | Workflow Engine K8s (HPA: 10-50 pods) |
| **Edge** | None | None | Gateway Edge Agents (Go) | Gateway Edge Agents + Edge workflows |
| **Cache** | None (or local Redis) | Redis 1 node | Redis Cluster (3 nodes, HA) | Redis Cluster (6 nodes, multi-region) |
| **Message Bus** | None (direct calls) | NATS 1 node | NATS Cluster (3 nodes) | NATS Cluster (3+ nodes, multi-region) |
| **Load Balancer** | None | NGINX (Docker) | NGINX (Docker) | Kubernetes Ingress + Global LB |
| **Monitoring** | Console logs | Docker logs | Prometheus + Grafana | Prometheus + Grafana + Jaeger |
| **Auth** | None (or hardcoded) | JWT + Passport.js | JWT + Multi-tenancy | JWT + SSO/SAML |
| **Deployment** | npm run dev | Docker Compose (VPS) | Docker Compose or K8s | Kubernetes (EKS/GKE/AKS) |
| **Devices** | 100 | 1,000-10,000 | 10,000-100,000 | 100,000-1,000,000 |
| **Message Rate** | 10-100 msg/sec | 1,000-5,000 msg/sec | 10,000-50,000 msg/sec | 50,000-100,000 msg/sec |
| **Cost** | $0 (local) | $150-250/month | $400-1,200/month | $2,000-5,000/month |
| **Uptime** | N/A (dev) | 95-99% | 99% | 99.9% |
| **Team Size** | 1-2 devs | 2-3 devs | 5-7 (+ 1 DevOps) | 10+ (+ dedicated DevOps team) |

---

## Performance & Capacity Planning

Based on LOAD_ANALYSIS.md (target load: 27 MB/sec = 93.15 GB/day):

### Capacity by Phase

| Phase | Message Rate | % of Target | Devices (10s interval) | Headroom |
|-------|--------------|-------------|-------------------------|----------|
| **POC** | 100 msg/sec | 0.4% | ~1,000 | N/A (dev environment) |
| **MVP** | 5,000 msg/sec | 18% | ~50,000 | 5.4x to target |
| **Scale** | 27,000 msg/sec | **100%** | ~270,000 | At target capacity |
| **Enterprise** | 100,000 msg/sec | 370% | ~1,000,000 | **3.7x headroom** |

### Load Analysis Integration

**Target Load:** 27,000 messages/sec (from LOAD_ANALYSIS.md)

**Architecture Capacity:**

| Component | Documented Capacity | Target Load | Utilization | Headroom |
|-----------|-------------------|-------------|-------------|----------|
| **Device State Ingestion** | 100,000 msg/sec | 27,000 msg/sec | 27% | **3.7x** |
| **Database Writes** | 50,000 writes/sec | 27,000 writes/sec | 54% | **1.8x** |
| **Concurrent Devices** | 1M+ devices | 270,000 (10s interval) | 27% | **3.7x** |
| **EMQX (per node)** | 250k connections | 50k-100k typical | 20-40% | **2.5-5x** |
| **Data Storage** | 93.15 GB/day raw | 31 GB/day compressed | - | 3:1 compression |

**Reporting Frequency Analysis:**

| Interval | Devices for 27k msg/sec | Architecture Capacity | Feasible? |
|----------|-------------------------|----------------------|-----------|
| **1 second** | 27,000 devices | 1M+ | ✅ YES (97% headroom) |
| **5 seconds** | 135,000 devices | 1M+ | ✅ YES (86% headroom) |
| **10 seconds** | 270,000 devices | 1M+ | ✅ YES (73% headroom) |
| **30 seconds** | 810,000 devices | 1M+ | ✅ YES (19% headroom) |

**Storage Planning:**

| Timeframe | Raw Data | Compressed (3:1) | Total with Metadata |
|-----------|----------|------------------|---------------------|
| **1 day** | 93.15 GB | 31 GB | ~35 GB |
| **1 week** | 652 GB | 217 GB | ~245 GB |
| **1 month** | 2.79 TB | 930 GB | ~1.2 TB |
| **3 months** | 8.38 TB | 2.79 TB | ~3.5 TB |
| **1 year** | 33.5 TB | 11.1 TB | ~14 TB |

**Recommendation:** 5-10 TB NVMe SSD for 90-day hot storage with compression

---

## Technology Stack Evolution

Timeline of when each technology is introduced:

### POC Stack (Weeks 1-3)

| Technology | Purpose | When Introduced |
|-----------|---------|-----------------|
| Next.js 14 | Frontend framework | Week 1 |
| Fastify | API framework | Week 1 |
| PostgreSQL + TimescaleDB | Unified database | Week 1 |
| Prisma | ORM, type-safe data access | Week 1 |
| Socket.io | WebSocket for real-time | Week 1 |
| TypeScript | Type safety | Week 1 |
| Zod | Runtime validation | Week 1 |
| Turborepo + pnpm | Monorepo management | Week 1 |

**Reasoning:** Production-grade stack from day 1 to avoid rewrites

### MVP Additions (Weeks 4-8)

| Technology | Purpose | When Introduced |
|-----------|---------|-----------------|
| EMQX | MQTT broker | Week 4 |
| NATS | Message bus | Week 4 |
| Redis | State, caching | Week 4 |
| JWT + Passport.js | Authentication | Week 4 |
| Docker Compose | Deployment | Week 4 |

**Reasoning:** Enable real device connectivity and multi-tenancy

### Scale Additions (Weeks 9-16)

| Technology | Purpose | When Introduced |
|-----------|---------|-----------------|
| Go (Edge Agents) | Industrial protocol translation | Week 10 |
| Profinet Driver | Industrial Ethernet | Week 10 |
| Modbus Driver | Serial/Ethernet | Week 10 |
| OPC UA Driver | Machine-to-machine | Week 11 |
| BACnet Driver | Building automation | Week 11 |
| Siemens S7 Driver | PLC communication | Week 11 |
| EMQX Cluster | Horizontal scaling | Week 9 |
| PostgreSQL Replicas | Read scaling | Week 9 |
| Redis Cluster | HA and sharding | Week 10 |
| Prometheus + Grafana | Monitoring | Week 12 |

**Reasoning:** Handle Profinet, Modbus, OPC UA, BACnet, Siemens S7; scale to 100k devices

### Enterprise Additions (Weeks 17+)

| Technology | Purpose | When Introduced |
|-----------|---------|-----------------|
| Kubernetes | Container orchestration | Week 17 |
| Helm | K8s package manager | Week 17 |
| Istio | Service mesh | Week 18 |
| HPA | Auto-scaling | Week 17 |
| Jaeger | Distributed tracing | Week 19 |
| CloudFlare | CDN, global LB | Week 20 |
| SSO/SAML | Enterprise auth | Week 21 |

**Reasoning:** Auto-scaling, observability, multi-region, enterprise features

---

## Migration Checklists

Detailed checklists for each phase transition:

### POC → MVP Migration Checklist

**Pre-Migration (Week 4, Day 1-2):**
- [ ] Audit current POC codebase
- [ ] Identify hardcoded values to parameterize
- [ ] Back up local PostgreSQL database
- [ ] Document current API endpoints
- [ ] List all environment variables

**Infrastructure Setup (Week 4, Day 3-5):**
- [ ] Provision VPS (Hetzner/DigitalOcean, 16 CPU, 32GB RAM)
- [ ] Install Docker + Docker Compose on VPS
- [ ] Create docker-compose.yml with services:
  - [ ] PostgreSQL + TimescaleDB
  - [ ] Redis
  - [ ] NATS
  - [ ] EMQX
  - [ ] API (3 replicas)
  - [ ] Frontend (2 replicas)
- [ ] Configure environment variables
- [ ] Set up SSL certificates (Let's Encrypt)

**Database Migration (Week 5, Day 1-2):**
- [ ] Add organizations table
- [ ] Add org_id column to devices table
- [ ] Add org_id column to device_states table
- [ ] Enable Row-Level Security (RLS)
- [ ] Create RLS policies for org_id isolation
- [ ] Run Prisma migration: `pnpm prisma migrate dev --name add_organizations`
- [ ] Seed default organization
- [ ] Migrate existing devices to default organization

**Authentication (Week 5, Day 3-5):**
- [ ] Install JWT + Passport.js dependencies
- [ ] Create auth middleware
- [ ] Add JWT_SECRET to environment variables
- [ ] Implement login endpoint (POST /auth/login)
- [ ] Implement register endpoint (POST /auth/register)
- [ ] Protect API endpoints with auth middleware
- [ ] Update frontend to use JWT tokens

**MQTT Integration (Week 6, Day 1-3):**
- [ ] Start EMQX container
- [ ] Configure EMQX authentication (HTTP auth hook)
- [ ] Configure MQTT → NATS bridge plugin
- [ ] Test MQTT connection with mosquitto_pub
- [ ] Update device firmware to use MQTT (if applicable)
- [ ] Keep HTTP endpoints for backward compatibility

**Workflow Engine (Week 6, Day 4-5):**
- [ ] Create workflows table in PostgreSQL
- [ ] Implement workflow engine service
- [ ] Add NATS consumer for workflow triggers
- [ ] Implement basic workflow nodes (Device, Function, MQTT)
- [ ] Test workflow execution with simple workflow

**Deployment (Week 7-8):**
- [ ] Push Docker images to registry (Docker Hub, ECR)
- [ ] Deploy to VPS with docker-compose up -d
- [ ] Run database migrations on production
- [ ] Verify services are running (docker-compose ps)
- [ ] Test API endpoints from external client
- [ ] Test MQTT connectivity
- [ ] Monitor logs for errors
- [ ] Set up automated backups (daily PostgreSQL dumps)

**Post-Migration Validation:**
- [ ] Create test organization
- [ ] Register test user
- [ ] Create devices via API
- [ ] Publish MQTT messages
- [ ] Verify dashboard updates in real-time
- [ ] Test workflow triggers
- [ ] Run load test (1,000 msg/sec for 5 minutes)
- [ ] Monitor resource usage (CPU, RAM, disk)
- [ ] Document deployment process

---

### MVP → Scale Migration Checklist

**Pre-Migration (Week 9, Day 1-2):**
- [ ] Audit current MVP architecture
- [ ] Identify performance bottlenecks
- [ ] Back up production database
- [ ] Plan downtime window (if needed)
- [ ] Notify users of upcoming changes

**EMQX Clustering (Week 9, Day 3-5):**
- [ ] Provision 2 additional EMQX nodes
- [ ] Configure EMQX cluster in docker-compose.yml
- [ ] Set cluster discovery method (static or DNS)
- [ ] Start cluster and verify connectivity
- [ ] Test MQTT client connection to cluster
- [ ] Configure load balancer (HAProxy or NGINX)
- [ ] Verify automatic failover

**PostgreSQL Replication (Week 10, Day 1-3):**
- [ ] Provision VPS for PostgreSQL replica
- [ ] Configure streaming replication
- [ ] Verify replication lag (<500ms)
- [ ] Point dashboard queries to replica
- [ ] Test failover (promote replica to primary)
- [ ] Monitor replication status with pg_stat_replication

**Redis Cluster (Week 10, Day 4-5):**
- [ ] Deploy Redis Cluster (3 master + 3 replica nodes)
- [ ] Configure client to use cluster mode
- [ ] Test automatic failover
- [ ] Migrate session data to cluster
- [ ] Verify cache hit rate

**Batch Inserts (Week 11, Day 1-2):**
- [ ] Implement message batching in API service
- [ ] Buffer messages for 100ms
- [ ] Use Prisma createMany() for batch inserts
- [ ] Test with load (10,000 msg/sec)
- [ ] Monitor database CPU and I/O
- [ ] Verify dashboard latency remains <50ms

**TimescaleDB Compression (Week 11, Day 3):**
- [ ] Enable compression on device_states table
- [ ] Configure compression policy (7 days)
- [ ] Monitor compression jobs
- [ ] Verify storage reduction (target 70%)

**Gateway Edge Agents (Week 12-14):**
- [ ] Write Go binary for Gateway Edge Agent
- [ ] Implement protocol drivers:
  - [ ] Profinet driver
  - [ ] Modbus TCP/RTU driver
  - [ ] OPC UA driver
  - [ ] BACnet driver
  - [ ] Siemens S7 driver
- [ ] Add report-by-exception filtering
- [ ] Add local buffering (SQLite)
- [ ] Build Docker image for GEA
- [ ] Test protocol translation locally
- [ ] Deploy to customer gateway (5 sites)
- [ ] Monitor edge agent logs

**Monitoring (Week 15-16):**
- [ ] Deploy Prometheus + Grafana
- [ ] Configure Prometheus scrape targets
- [ ] Import EMQX dashboard
- [ ] Import PostgreSQL dashboard
- [ ] Import Redis dashboard
- [ ] Configure alerting (CPU >80%, disk >90%)
- [ ] Set up PagerDuty/Opsgenie integration

**Post-Migration Validation:**
- [ ] Run load test (27,000 msg/sec for 1 hour)
- [ ] Monitor database writes (target: 27k writes/sec)
- [ ] Monitor EMQX cluster (target: <30ms latency)
- [ ] Verify dashboard latency (<50ms p99)
- [ ] Test Gateway Edge Agent failover
- [ ] Monitor storage growth (target: 31 GB/day compressed)
- [ ] Verify 99% uptime over 7 days

---

### Scale → Enterprise Migration Checklist

**Pre-Migration (Week 17, Day 1-2):**
- [ ] Audit current Scale architecture
- [ ] Plan Kubernetes migration strategy
- [ ] Train team on Kubernetes
- [ ] Back up all data (PostgreSQL, Redis)
- [ ] Plan rollback strategy

**Kubernetes Cluster Provisioning (Week 17, Day 3-5):**
- [ ] Choose managed Kubernetes (EKS, GKE, or AKS)
- [ ] Provision cluster (5 nodes, 8-core, 32GB each)
- [ ] Configure kubectl access
- [ ] Install Helm
- [ ] Install kubectl plugins (kubectx, kubens)

**Helm Charts (Week 18, Day 1-5):**
- [ ] Create Helm chart for EMQX
- [ ] Create Helm chart for API
- [ ] Create Helm chart for Workflow Engine
- [ ] Create Helm chart for Frontend
- [ ] Create Helm chart for PostgreSQL (StatefulSet)
- [ ] Create Helm chart for Redis Cluster
- [ ] Create Helm chart for NATS
- [ ] Test charts in dev namespace

**Service Mesh (Week 19, Day 1-3):**
- [ ] Install Istio (istioctl install)
- [ ] Enable sidecar injection (namespace label)
- [ ] Configure mTLS (STRICT mode)
- [ ] Configure traffic management (VirtualServices)
- [ ] Test service-to-service communication

**HPA Configuration (Week 19, Day 4-5):**
- [ ] Create HPA for API (target: 70% CPU)
- [ ] Create HPA for Workflow Engine (custom metric: NATS queue depth)
- [ ] Create HPA for Frontend (target: 70% CPU)
- [ ] Test auto-scaling (load spike 2x)
- [ ] Verify scale-down after load decreases

**Database Sharding (Week 20, if >1M devices):**
- [ ] Provision 4 PostgreSQL instances (shards)
- [ ] Implement application-level sharding (hash org_id % 4)
- [ ] Create 4 Prisma clients
- [ ] Migrate data to shards
- [ ] Test cross-shard queries
- [ ] Monitor shard balance

**Multi-Region Deployment (Week 21-22):**
- [ ] Provision Kubernetes cluster in Region 2
- [ ] Deploy application to Region 2
- [ ] Configure PostgreSQL cross-region replication
- [ ] Configure Redis cross-region replication
- [ ] Set up global load balancer (Route 53, CloudFlare)
- [ ] Test failover to Region 2
- [ ] Monitor cross-region latency

**SLA Monitoring (Week 23):**
- [ ] Deploy Prometheus + Grafana on K8s
- [ ] Configure uptime monitoring (UptimeRobot, Pingdom)
- [ ] Set up alerting (PagerDuty, Opsgenie)
- [ ] Create SLA dashboard (99.9% target)
- [ ] Monitor uptime over 30 days

**Disaster Recovery (Week 24):**
- [ ] Configure automated PostgreSQL backups (hourly)
- [ ] Test backup restore (RTO <1 hour)
- [ ] Configure cross-region backups
- [ ] Document disaster recovery runbook
- [ ] Test failover to Region 2
- [ ] Test database restore from backup

**Post-Migration Validation:**
- [ ] Run load test (50,000 msg/sec for 2 hours)
- [ ] Verify HPA auto-scaling
- [ ] Test multi-region failover
- [ ] Verify 99.9% uptime over 30 days
- [ ] Monitor cost (<$5,000/month)
- [ ] Document Kubernetes architecture

---

## Risk Mitigation & Lessons Learned

Common pitfalls and solutions at each phase:

### POC Risks

**Risk 1: Over-Engineering**
- **Symptom:** Trying to build Kubernetes + MQTT in Week 1
- **Impact:** Slow progress, complexity overload
- **Solution:** Follow POC guide strictly (HTTP-only, local dev)
- **Mitigation:** Set hard deadline for POC (3 weeks max)

**Risk 2: Wrong Database Choice**
- **Symptom:** Using SQLite or MongoDB for "simplicity"
- **Impact:** Complete rewrite needed in Week 4
- **Solution:** Use PostgreSQL + TimescaleDB from day 1
- **Mitigation:** Trust the architecture guide

**Risk 3: No Type Safety**
- **Symptom:** Using plain JavaScript instead of TypeScript
- **Impact:** Runtime errors, difficult refactoring
- **Solution:** Use TypeScript + Prisma from day 1
- **Mitigation:** Configure strict mode in tsconfig.json

---

### MVP Risks

**Risk 1: Database Write Bottleneck**
- **Symptom:** PostgreSQL CPU at 100%, write latency >500ms
- **Impact:** Message backlog, data loss
- **Solution:** Implement batch inserts (100-1000 rows/transaction)
- **Mitigation:** Monitor database CPU early, load test with 2x traffic

**Risk 2: EMQX Connection Limits**
- **Symptom:** Devices fail to connect after 50k-100k devices
- **Impact:** New devices can't connect
- **Solution:** Cluster EMQX early (even if not needed yet)
- **Mitigation:** Monitor connection count, set alerts at 80% capacity

**Risk 3: Single VPS Failure**
- **Symptom:** VPS goes down, entire system offline
- **Impact:** 100% downtime
- **Solution:** Accept risk in MVP phase (document as known limitation)
- **Mitigation:** Automated backups, monitored uptime

---

### Scale Risks

**Risk 1: Disk I/O Saturation**
- **Symptom:** PostgreSQL slow, pgbench shows <1000 TPS
- **Impact:** Write latency >1s, dashboard slow
- **Solution:**
  - Use NVMe SSD (100k IOPS+)
  - Enable TimescaleDB compression (70% reduction)
  - Implement batch inserts
- **Mitigation:** Monitor disk I/O early (iostat, pgbadger)

**Risk 2: Network Bandwidth Exhaustion**
- **Symptom:** 27 MB/sec ingestion saturates 100 Mbps link
- **Impact:** Packet loss, connection drops
- **Solution:**
  - Use 1 Gbps network (5x headroom)
  - Enable GZIP compression on MQTT (30-50% reduction)
  - Implement edge filtering (50-90% reduction)
- **Mitigation:** Monitor network bandwidth (iftop, Prometheus)

**Risk 3: Gateway Edge Agent Failures**
- **Symptom:** Edge agent crashes, industrial devices disconnected
- **Impact:** Data loss, production downtime
- **Solution:**
  - Implement local buffering (SQLite)
  - Add watchdog timer (restart on crash)
  - Deploy as Docker container (auto-restart)
- **Mitigation:** Monitor edge agent health, alerting on disconnect

---

### Enterprise Risks

**Risk 1: Kubernetes Complexity**
- **Symptom:** Team struggles with YAML, networking, debugging
- **Impact:** Slow development, production incidents
- **Solution:**
  - Start with managed Kubernetes (EKS, GKE, AKS)
  - Use Helm charts (don't write raw YAML)
  - Invest in Kubernetes training (CKA certification)
- **Mitigation:** Hire DevOps engineer with K8s expertise

**Risk 2: Multi-Region Consistency**
- **Symptom:** Data inconsistency between regions
- **Impact:** User sees different data in different regions
- **Solution:**
  - Use read replicas (not multi-master)
  - Accept replication lag (<500ms)
  - Route users to nearest region
- **Mitigation:** Monitor replication lag, alert if >1s

**Risk 3: Cost Overrun**
- **Symptom:** Kubernetes costs exceed $5,000/month
- **Impact:** Budget exceeded
- **Solution:**
  - Right-size pods (don't over-provision CPU/RAM)
  - Use spot instances for non-critical workloads
  - Enable cluster autoscaler
- **Mitigation:** Set up cost monitoring (Kubecost, AWS Cost Explorer)

---

## Conclusion

### Architecture Assessment: Capable of Handling Target Load

Your target load of **27 MB/sec (93.15 GB/day)** is well within the architecture's capacity:

1. **Ingestion:** 27k msg/sec vs 100k capacity = **27% utilization** ✅
2. **Database:** 27k writes/sec vs 50k capacity = **54% utilization** ✅
3. **Devices:** 50k-300k devices vs 1M capacity = **5-30% utilization** ✅
4. **Headroom:** **1.8-3.7x** for future growth ✅

### Recommended Path

**Phase 0: POC (Weeks 1-3)**
- Local development, 100 devices
- Production-grade architecture from day 1
- Cost: $0

**Phase 1: MVP (Weeks 4-8)**
- Docker Compose on $150-250/month VPS
- 1,000-10,000 devices
- MQTT + multi-tenancy
- **Target:** Handle 10% of target load (2.7 MB/sec)

**Phase 2: Scale (Weeks 9-16)**
- Scaled Docker Compose or Kubernetes
- 10,000-100,000 devices
- Industrial protocols (Profinet, Modbus, OPC UA, BACnet, S7)
- **Target:** Full target load (27 MB/sec)

**Phase 3: Enterprise (Weeks 17+)**
- Kubernetes if needed (>300k devices)
- Multi-region deployment
- **Target:** 2-5x target load (50-100 MB/sec)

### Key Success Factors

1. **Use TimescaleDB compression** (70-80% storage reduction)
2. **Batch database inserts** (70-80% load reduction)
3. **Edge filtering** (50-90% data reduction)
4. **Monitor early** (identify bottlenecks before production)
5. **Start with Docker Compose** (faster, cheaper, simpler)

---

**Final Answer:** YES, the architecture supports your load with 2-7x headroom for growth.

**Next Steps:**
1. Read [POC_TASKS.md](POC_TASKS.md) for detailed task breakdown
2. Start Week 1 of POC implementation
3. Follow this document for phase transitions
