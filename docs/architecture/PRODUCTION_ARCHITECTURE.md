# Kosmos™ Platform — Production Architecture

**Project:** Industrial IoT Platform (Generic, multi-sector)
**Version:** 2.1 — Production Architecture + Clustering & HA
**Date:** 2026-03-16
**Status:** Architecture Proposed — Implementation Roadmap

---

## Executive Summary

The Kosmos platform transitions from a proof-of-concept capable of ~50–200 concurrent devices
to a production architecture targeting **10,000+ sensors at 25Hz** (250,000 data points/second).

The production architecture introduces a streaming bus (NATS JetStream), a real-time Redis cache,
a dedicated WebSocket Gateway, and a batched Storage Worker. All existing API contracts, data
models, compliance certifications, and the visual workflow editor are carried forward unchanged.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              FIELD LAYER                                            │
│  Physical Sensors → PLCs / Data Concentrators → Modbus TCP / OPC-UA endpoints       │
└──────────────────────────────────┬──────────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────────────────┐
│                         PROTOCOL ADAPTER LAYER                                      │
│  ModbusGatewayManager (one TCP socket per PLC)                                      │
│  OpcuaGatewayManager  (subscription-based)                                          │
│  → Publishes to NATS JetStream:  stream SENSOR_RAW / subject sensor.raw             │
└────────────────────┬───────────────────────────────────┬────────────────────────────┘
    sensor.raw       │                                   │  sensor.raw
 (Processing Engine) │                                   │  (StorageWorker)
┌────────────────────▼───────────────────────────────┐  ┌▼────────────────────────────┐
│           REAL-TIME PROCESSING ENGINE              │  │  Storage Worker (BullMQ)    │
│  NATS consumer (SENSOR_RAW)                        │  │  Raw readings accumulated   │
│  noise filter → delta detection → normalisation    │  │  Batch 1000 docs / 200ms    │
│  → Publishes: SENSOR_PROCESSED / sensor.processed  │  └──────────────┬──────────────┘
└──────────┬───────────────────────────┬─────────────┘                 │ insertMany
           │                           │                    ┌──────────▼──────────────┐
    ┌──────▼──────┐    ┌───────────────▼───────────┐        │  MongoDB 8 Time Series  │
    │Redis Cluster│    │  Workflow Trigger         │        │  device_states          │
    │  (6-node)   │    │  Dispatcher               │        │  (5-year TTL)           │
    │ sensor:     │    │  (NATS consumer)          │        └─────────────────────────┘
    │ latest:{id} │    │  Workflow ID cache        │
    │ pub/sub     │    │  in Redis                 │
    └──────┬──────┘    └───────────────┬───────────┘
           │ Redis pub/sub             │ emit sensor.alerts
    ┌──────▼──────┐    ┌───────────────▼────────────┐
    │WebSocket GW │    │  WorkflowEngine            │
    │  (N nodes)  │    │  + Alarm Service           │
    │  (rooms by  │    │                            │
    │   sensorId) │    └────────────────────────────┘
    └──────┬──────┘
           │ WebSocket
┌──────────▼──────────────────────────────────────────────────────────────────────────┐
│                           DASHBOARD (BROWSER)                                       │
│  Left (static): Raw sensor values + PLC readings                                    │
│  Middle (dynamic): KPI cards, charts, feature matrix, alert list (palette-switch)   │
│  Right (static): Workflow status, fleet overview, recent agent actions              │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Descriptions

### 1. Protocol Adapter Layer
- **ModbusGatewayManager**: One TCP socket per PLC gateway; polls registers at configurable intervals (minimum 1s). Supports Modbus TCP and RTU. Register types: int16, uint16, int32, uint32, float, boolean. 32-bit values configurable for big-endian or big-endian-swapped word order.
- **OpcuaGatewayManager**: OPC-UA subscription model; server pushes on value change. Session-based connection pooling.
- **Output**: Publishes raw register readings to NATS JetStream `sensor.raw`.

### 2. Real-Time Processing Engine
- NATS JetStream consumer on `SENSOR_RAW` stream.
- Applies: noise filtering, delta detection (suppress unchanged values), unit normalisation.
- Publishes processed readings to `sensor.processed` stream.
- Stateless; horizontally scalable via NATS consumer groups.

### 3. Redis 7 Real-Time Cache
- `sensor:latest:{sensorId}`: JSON string, no TTL; holds latest **processed** (noise-filtered) reading per sensor.
- `workflow:active:{orgId}`: Set of enabled workflow IDs, refreshed every 5 minutes.
- Redis pub/sub channel `sensor:{sensorId}`: real-time WebSocket fan-out backbone.

### 4. Storage Worker (BullMQ)
- NATS consumer on `sensor.raw`; accumulates raw sensor readings (unfiltered, preserves full audit trail).
- Flushes via MongoDB `insertMany()` every 200ms or when 1000 documents accumulate.
- Writes to `device_states` time-series collection (5-year TTL).
- Isolates high-volume write I/O from ingestion and query paths.
- Dead-letter queue retains failed batches for 24h replay.

### 5. WebSocket Gateway
- Subscribes to Redis pub/sub `sensor:{sensorId}` channels.
- Manages browser client rooms by sensorId.
- Decoupled from main API process — scales independently.
- Delivers real-time updates to dashboard middle-column blocks.

### 6. Workflow Trigger Dispatcher
- NATS JetStream consumer on `sensor.processed`.
- Reads workflow ID cache from Redis (avoids per-poll MongoDB queries).
- Dispatches matching workflows via WorkflowEngineService.
- Emits alarm events to `sensor.alerts` stream.

### 7. API (Fastify)
- All existing REST endpoints unchanged.
- Handles: auth (JWT + RBAC), device CRUD, workflow CRUD, alarm management, compliance.
- Serves historical queries: `GET /devices/:id/states?from=&to=` for chart history.

---

## Clustering & High Availability

### NATS JetStream Cluster
- 3-node cluster minimum; all streams configured with replication factor **R=3**.
- Stream failover: automatic leader election; no data loss on single-node failure.
- Consumer groups: Processing Engine replicas and WorkflowDispatcher replicas each form a durable consumer group — NATS distributes messages across all healthy members.

### Redis Shared Cache Cluster
- 6-node cluster: 3 primary shards + 3 replicas (one replica per primary shard).
- `ioredis` Cluster client handles hash-slot routing and automatic failover transparently.
- Key design: `sensor:latest:{sensorId}` and `workflow:active:{orgId}` are hash-slot distributed across primary shards.
- Pub/sub: Redis Cluster pub/sub broadcasts to all nodes; each WebSocket Gateway instance subscribes to its relevant channels.

### WebSocket Gateway Cluster
- N stateless instances deployed behind a load balancer with **sticky sessions** (IP-hash or cookie-based).
- Each instance independently subscribes to Redis pub/sub for fan-out; no inter-instance coordination required.
- Horizontal scale-out: add instances to increase connection capacity without service interruption.

---

## Kosmos Dashboard — 3-Column Integration

```
┌────────────────┬──────────────────────────────────┬───────────────────────┐
│ LEFT (280px)   │  MIDDLE (1fr)                     │ RIGHT (280px)         │
│ STATIC         │  PALETTE-SWITCHABLE               │ STATIC                │
├────────────────┼──────────────────────────────────┼───────────────────────┤
│ BE SENSE       │  [A] Architecture diagram         │ BE Agent Modules      │
│  Raw values    │  [B] 4-metric KPI card row        │  Workflow status      │
│  PLC readings  │  [C] Real-time Chart.js signals   │  Active alarms        │
│  Protocol      │      (line/bar, 180px height)     │                       │
│  adapter out   │  [D] 5×5 Feature Matrix           │ Fleet Overview        │
│                │      (heatmap, aspect-ratio: 1)   │  Device online/off   │
│                │  [E] Alert list                   │  Gateway health       │
│                │      (left-border color codes:    │                       │
│                │       red/amber/blue/green)        │ Recent Agent Actions │
└────────────────┴──────────────────────────────────┴───────────────────────┘
```

| Panel | Data source | Transport |
|---|---|---|
| Left — raw sensor values | Protocol Adapter Layer output | WebSocket push |
| Left — PLC readings | `GET /gateways/:id/readings` | REST (polled 1s) |
| Middle — KPI cards | Redis `sensor:latest:{sensorId}` | WebSocket (WS Gateway) |
| Middle — Chart.js | `GET /devices/:id/states` | REST history + WebSocket append |
| Middle — Alert list | `GET /alarms?status=active` | REST + WebSocket push |
| Right — Workflow status | `GET /workflows/executions` | REST (polled 5s) |
| Right — Fleet overview | `GET /devices?status=offline` | WebSocket (HeartbeatService) |

---

## Performance Targets

| Metric | Target |
|---|---|
| Sensor count | 10,000+ logical sensors |
| Update rate | 25Hz per sensor (40ms cadence) |
| Throughput | 250,000 messages/second sustained |
| End-to-end latency (sensor → browser) | < 150ms (P99) |
| WebSocket clients | 500+ concurrent dashboard users |
| MongoDB write throughput | 50,000+ docs/second (batched) |
| API availability | 99.9% (multi-process, health-checked) |
| Alarm detection latency | < 500ms from sensor update |

---

## POC → Production Impact Matrix

| Area | POC | Production |
|---|---|---|
| Data bus | Direct function call (fire-and-forget) | NATS JetStream streams |
| Live cache | MongoDB `device_derived_states` lookup | Redis `sensor:latest:{sensorId}` |
| WebSocket | Socket.io inside main API | Dedicated WS Gateway (Redis pub/sub) |
| Storage writes | 1 `insertMany` per device per poll | StorageWorker: 1000 docs / 200ms batch |
| Register reads | Sequential `await` loop | `Promise.all()` per gateway |
| Device ID lookup | `Device.findOne()` per register | In-memory `Map` cache |
| Workflow dispatch | `Workflow.find()` per device/poll | NATS consumer + Redis workflow cache |
| MongoDB pool | Default 10 | `maxPoolSize: 50` |

**Stable (no change):** All Mongoose models, all REST API routes, all compliance layer,
RBAC + JWT, Visual Workflow Editor, Kosmos left/right static columns.

---

## Compliance Certifications

| Standard | Coverage |
|---|---|
| EPA 21 CFR Part 11 | Immutable audit logs, electronic signatures, 10-year retention |
| EPA 40 CFR Part 141 | 5-year water quality data retention (time-series TTL) |
| ISA-18.2 | Alarm state machine: ACTIVE_UNACKED → ACTIVE_ACKED → CLEARED |
| AWWA M36 | Water audit methodology, quality scoring (0–100) |
| IEC 61158 | Modbus TCP/RTU gateway with configurable register mapping |
| OPC-UA | Subscription-based node monitoring |
| RBAC | 4 roles (SuperAdmin > Admin > Operator > Viewer), 24 granular permissions |

---

## Production Readiness Checklist

### Infrastructure
- [ ] NATS JetStream 3-node cluster deployed (v2.10+); streams configured with R=3 replication
- [ ] Redis Cluster (6-node: 3P+3R) deployed; `ioredis` Cluster client configured
- [ ] WebSocket Gateway deployed as N instances behind sticky-session load balancer (IP-hash/cookie)
- [ ] MongoDB 8 replica set (3 nodes minimum for HA)
- [ ] `maxPoolSize: 50` set in MongoDB connection string

### Services
- [ ] Real-Time Processing Engine deployed as standalone Node.js process
- [ ] StorageWorker deployed with BullMQ, dead-letter queue configured
- [ ] WebSocket Gateway deployed, sticky sessions configured
- [ ] WorkflowTriggerDispatcher migrated to NATS consumer

### Modbus/OPC-UA
- [ ] Parallel register reads (`Promise.all()`) implemented per gateway
- [ ] Device ID in-memory `Map` cache implemented and tested
- [ ] Gateway publishing to `sensor.raw` stream (not direct DB write)

### Dashboard
- [ ] Kosmos 3-column layout implemented
- [ ] Palette switching via `dashboardSlice.activePaletteId`
- [ ] Chart.js instances retain data across palette switches
- [ ] WebSocket Gateway subscription by sensorId room

### Compliance
- [ ] Audit logging verified end-to-end in production environment
- [ ] TTL enforcement verified (5-year device states, 10-year audit logs)
- [ ] Alarm state machine tested under load
- [ ] API key rotation procedure documented

### Monitoring
- [ ] NATS JetStream consumer lag alerting
- [ ] Redis memory usage alerting
- [ ] StorageWorker dead-letter queue monitoring
- [ ] WebSocket connection count dashboard
