# Technology Stack Rationale Document
## Dynamic Dashboard - Enterprise IoT Platform

**Version:** 1.0
**Date:** 2026-02-04
**Purpose:** Comprehensive explanation of technology choices, alternatives, and trade-offs

---

## Table of Contents

1. [Introduction](#introduction)
2. [Database Technologies](#database-technologies)
3. [Infrastructure Components](#infrastructure-components)
4. [Backend Technologies](#backend-technologies)
5. [Frontend Technologies](#frontend-technologies)
6. [Development Tools](#development-tools)
7. [Monitoring & Observability](#monitoring--observability)
8. [Performance Metrics & Targets](#performance-metrics--targets)
9. [Scaling & Cost Analysis](#scaling--cost-analysis)
10. [Key Architectural Decisions](#key-architectural-decisions)

---

## Introduction

### Document Purpose

This document provides detailed rationale for every technology choice made in the Dynamic Dashboard Enterprise IoT Platform. It serves multiple audiences:

- **Development Team**: Understand the "why" behind architectural decisions
- **Technical Stakeholders**: Evaluate technology choices for enterprise readiness
- **New Team Members**: Onboard with context on technology selections
- **Future Decision Makers**: Baseline for evaluating when to change technologies

### How to Use This Document

Each technology section follows a consistent format:

- **What it is**: Brief description
- **Why chosen**: Primary rationale (3-5 bullet points)
- **Alternatives considered**: What was evaluated but not chosen
- **Trade-offs**: Acknowledged limitations or drawbacks
- **Performance metrics**: Specific numbers where available
- **When to reconsider**: Circumstances that would warrant switching

### Related Documentation

- **Architecture Details**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Implementation Guide**: [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)
- **POC Guide**: [PRODUCTION_READY_POC.md](PRODUCTION_READY_POC.md)

---

## Database Technologies

### MongoDB 8 with Time Series Collections

**Purpose**: Unified database for all data (time-series telemetry, devices, workflows, users, organizations, audit logs)

**Why Chosen (February 2026 Migration):**
- **Native Time Series Optimization**: MongoDB Time Series Collections are purpose-built for sensor data with automatic bucketing, compression, and TTL
- **EPA Compliance**: Built-in `expireAfterSeconds` TTL perfectly aligns with EPA 90-day retention requirement (no custom policies needed)
- **Superior Compression**: 70-90% automatic compression vs. TimescaleDB's 60-70% - achieved without manual policy configuration
- **Simplified Operations**: No complex hypertable management, compression policies, or vacuuming - everything automatic
- **Higher Write Throughput**: 100,000+ writes/sec vs. TimescaleDB's 50,000 writes/sec
- **Document Flexibility**: BSON documents support flexible schema for device attributes, workflow definitions, and audit data without separate tables
- **Horizontal Scaling**: Native sharding by `orgId` or `deviceId` for multi-tenant multi-million device deployments
- **Mature Ecosystem**: MongoDB Atlas, Compass, realm, unified platform for app development

**Migration Rationale from PostgreSQL + TimescaleDB:**

The platform was originally designed with PostgreSQL + TimescaleDB but migrated to MongoDB 8 to:
1. **Meet EPA Compliance More Easily**: TTL automatic expiry vs. manual retention policies
2. **Reduce Operational Burden**: No need for PostgreSQL expertise (vacuuming, streaming replication, index tuning)
3. **Improve Time-Series Performance**: Designed ground-up for time-series vs. bolted-on hypertables
4. **Support Water Utility Scale**: Replica sets for HA, sharding for 1M+ devices, automatic compression

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **PostgreSQL 15 + TimescaleDB 2.13** | Previous choice; works well but requires more operational overhead, manual compression policies, complex retention management |
| **InfluxDB 3.0** | Excellent for pure time-series, but lacks built-in relational data support for devices/workflows; separate operational cost; query language learning curve (Flux) |
| **QuestDB** | High-performance columnar database but limited ecosystem; immature for enterprise use; no native document support for flexible schemas |
| **Cassandra** | Designed for write-heavy at massive scale but overkill for our device count; complex operational overhead; tuning difficulty for water utility scenario |
| **CockroachDB** | Excellent for distributed SQL but unnecessary complexity for this workload; cost prohibitive vs. MongoDB |

**Trade-offs and Mitigation:**

| Trade-off | Impact | Mitigation |
|-----------|--------|-----------|
| **No ACID Transactions (for Time Series Collections)** | Cannot use multi-document transactions for cascade deletes | Use sequential deletes instead; acceptable for operational simplicity |
| **Memory Usage** | MongoDB uses more RAM than TimescaleDB per GB stored | Offset by 80%+ compression savings on-disk; overall cost lower |
| **Complex Queries** | Aggregation pipelines different from SQL | Teams comfortable with NoSQL; Mongoose provides abstraction layer |

**Performance Metrics:**
- **Write Throughput**: 100,000+ writes/sec (cluster, optimal sharding)
- **Query Latency**: <50ms p99 for dashboard queries with aggregation pipelines
- **Compression**: 70-90% automatic compression ratio (on all data, not just old data)
- **Retention**: Automatic TTL deletion (`expireAfterSeconds: 7776000` for 90 days)
- **Horizontal Scaling**: Sharding by `metadata.orgId` for >10M devices seamlessly
- **Storage Efficiency**: 70-90% reduction = 9.3 GB/day vs. 27 GB raw for your target load

**When to Reconsider:**
- Pure time-series only (no relational data) - InfluxDB more optimized
- Serving >100M devices across multiple regions (evaluate multi-cloud sharding strategy)
- Team exclusively SQL-focused (learning curve for aggregation pipelines)

**Related Technologies:**
- [Mongoose ODM](#mongoose-8230) (data access layer)
- [Redis](#redis-72) (caching layer)
- [Replica Sets](#mongodb-replica-set-configuration) (high availability)

---

### Mongoose 8.23.0 ODM

**Purpose**: Type-safe data access layer for MongoDB, auto-generated TypeScript types, schema management

**Why Chosen:**
- **Type Safety**: Auto-generates TypeScript types from schema, eliminating runtime type errors (no manual type definitions)
- **Developer Experience**: Best-in-class TypeScript integration with IntelliSense, auto-completion, and compile-time validation
- **MongoDB Native**: Purpose-built for MongoDB (not a generic ORM like Prisma)
- **Time Series Collections**: Native support for MongoDB Time Series Collections with TTL and automatic compression
- **Middleware System**: Powerful pre/post hooks for automatic orgId injection, audit logging, and data transformation

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **TypeORM** | Originally designed for SQL databases; MongoDB support is secondary; less native time-series support |
| **Prisma** | Originally designed for SQL; MongoDB support is limited; complex Time Series queries require raw queries |
| **Mikro-ORM** | Smaller ecosystem; less TypeScript-native; MongoDB support less mature |
| **Motor (async)** | Low-level driver; no type safety; requires manual type definitions; no schema management |

**Trade-offs:**
- **Learning Curve**: Mongoose's middleware system and hooks require understanding MongoDB-specific patterns
- **Transaction Limitations**: Time Series Collections don't support multi-document transactions (use sequential operations)
- **Schema Flexibility**: Mongoose schemas are flexible but need explicit definition (not auto-inferred like Prisma)

**Performance Metrics:**
- **Query Execution**: <50ms p99 for aggregation pipelines on time-series data
- **Type Safety**: 100% type coverage for database operations
- **Schema Validation**: Built-in Zod integration for runtime validation

**Code Example:**
```typescript
// Type-safe query with auto-completion
const devices = await Device.find({
  orgId: new ObjectId(orgId),
  tags: { $in: ['zone-a'] }
}).lean();

// Time Series aggregation
const stats = await DeviceState.aggregate([
  {
    $match: {
      'metadata.deviceId': 'sensor-123',
      'timestamp': { $gte: new Date(Date.now() - 7*24*60*60*1000) }
    }
  },
  {
    $group: {
      _id: {
        $dateTrunc: {
          date: '$timestamp',
          unit: 'hour',
          binSize: 1
        }
      },
      avg: { $avg: '$data.temperature' }
    }
  }
]);
// TypeScript knows the exact shape of aggregation results
```

**When to Reconsider:**
- Need for complex JOIN operations across collections (use SQL database)
- Team prefers SQL and schema-driven databases (use PostgreSQL with Prisma)
- Non-MongoDB migration (use native database clients)

**Related Technologies:**
- [MongoDB 8 with Time Series Collections](#mongodb-8-with-time-series-collections) (underlying database)
- [TypeScript 5.x](#typescript-5x) (type system)
- [Zod](#zod) (runtime validation)

---

### Redis 7.2+

**Purpose**: Session store, workflow state persistence, caching layer, pub/sub for real-time updates

**Why Chosen:**
- **Sub-Millisecond Latency**: <1ms read latency for session data and cached queries
- **Versatile Data Structures**: Supports key-value, hash, list, set, sorted set (perfect for workflow state storage)
- **Pub/Sub for WebSockets**: Redis pub/sub enables horizontal scaling of Socket.io servers
- **Atomic Operations**: `INCR`, `DECR` for rate limiting without race conditions
- **Persistence Options**: RDB snapshots + AOF logs for durability

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Memcached** | No persistence, no pub/sub, no data structures (only key-value), no clustering |
| **In-Memory JavaScript Maps** | Not shared across multiple API instances; lost on server restart |
| **PostgreSQL (for sessions)** | 10-20x slower for session lookups; no pub/sub performance; database load |

**Trade-offs:**
- **Memory-Only Storage**: Default configuration loses data on restart (mitigated with RDB+AOF)
- **Single-Threaded**: CPU-bound operations (like Lua scripts) block other operations
- **Memory Cost**: Holding 1GB of cached data costs ~$5-10/month (vs cold storage at <$1/month)

**Performance Metrics:**
- **Read Latency**: <1ms p99 for key-value lookups
- **Write Throughput**: 100,000+ writes/sec (single instance)
- **Pub/Sub Latency**: <5ms message delivery to subscribers
- **Memory Efficiency**: ~70 bytes overhead per key-value pair

**Use Cases by Data Structure:**
```
Key-Value:    Session tokens, API rate limits
Hashes:       Workflow state (workflow:state:{workflowId})
Lists:        Recent device events (LPUSH + LTRIM for circular buffers)
Sorted Sets:  Leaderboards, time-ordered data
Pub/Sub:      Real-time dashboard updates
```

**When to Reconsider:**
- Need for complex queries on cached data (use PostgreSQL + TimescaleDB)
- Memory costs exceed $100/month (optimize cache eviction policies first)
- Need multi-region replication (consider Redis Enterprise or Amazon ElastiCache Global Datastore)

**Scaling Strategy:**
- **0-10k devices**: Single Redis instance (8GB RAM)
- **10k-100k devices**: Redis Sentinel for HA (3 nodes)
- **100k+ devices**: Redis Cluster (sharding by key prefix)

**Related Technologies:**
- [Socket.io](#socketio-4x) (pub/sub integration)
- [NATS](#nats-210) (alternative message bus)

---

### MinIO (S3-Compatible Object Storage)

**Purpose**: Cold data archival, file attachments, workflow logs (optional component)

**Why Chosen:**
- **S3 Compatibility**: Drop-in replacement for AWS S3 with same API (easy migration to/from AWS)
- **Self-Hosted**: No vendor lock-in, predictable costs (~$0.01/GB/month for VPS storage vs $0.023/GB for AWS S3)
- **Lifecycle Policies**: Automatic transition to cold storage (Glacier-equivalent) after 90 days
- **Performance**: 10-50x cheaper than S3 for high-throughput workloads

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **AWS S3** | 2-3x more expensive; vendor lock-in; egress costs; unnecessary for <1PB data |
| **Filesystem Storage** | No versioning; no lifecycle management; difficult backup/replication; no S3 API |
| **Ceph** | Over-engineered for IoT use case; complex setup; high operational overhead |

**Trade-offs:**
- **Self-Hosted Complexity**: Requires VPS storage management, backup scripts, monitoring
- **No Glacier Tier**: MinIO doesn't have true "cold storage" tier (workaround: separate cheap disk pool)
- **Replication**: Multi-region replication requires custom scripting (vs S3's built-in replication)

**Performance Metrics:**
- **Write Throughput**: 1-5 GB/sec (depending on disk speed)
- **Read Latency**: 10-50ms (VPS SSD) vs 100-200ms (AWS S3)
- **Storage Cost**: $0.01/GB/month (VPS) vs $0.023/GB (S3 Standard)

**When to Reconsider:**
- Need for >1PB storage (use AWS S3 or cloud-native object storage)
- Multi-region replication is critical (use AWS S3 Cross-Region Replication)
- Team lacks self-hosting expertise (use AWS S3)

**Optional Component**: MinIO is optional in POC and MVP phases. Add when:
- Device telemetry exceeds 100GB/month
- Need to archive data older than 90 days
- Workflow logs exceed 10GB/month

**Related Technologies:**
- [PostgreSQL + TimescaleDB](#postgresql-15-with-timescaledb-213) (hot data storage)

---

## Infrastructure Components

### EMQX 5.x MQTT Broker (Go/Erlang)

**Purpose**: MQTT broker for device communication (millions of concurrent connections)

**Why Chosen:**
- **Massive Concurrency**: 1-5 million concurrent MQTT connections per node (Erlang's lightweight processes)
- **MQTT 5.0 Support**: Shared subscriptions, user properties, message expiry, flow control
- **Built-in Authentication**: HTTP auth hooks, ACL (Access Control Lists), JWT validation
- **NATS Bridge Plugin**: Seamless MQTT → NATS message routing for workflow triggers
- **Clustering**: Native clustering with automatic node discovery and rebalancing
- **Proven at Scale**: Powers IoT platforms at Ericsson, Cisco, Volkswagen

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **VerneMQ** | Smaller community; fewer plugins; less mature clustering; limited documentation |
| **Mosquitto** | Single-threaded (can't utilize multi-core CPUs); no clustering; no built-in ACL management UI; limited to ~100k connections |
| **RabbitMQ MQTT Plugin** | MQTT is an add-on (not core); lower connection limits (~50k); heavier resource usage |
| **AWS IoT Core** | Vendor lock-in; expensive at scale ($1/million messages); limited protocol support |

**Trade-offs:**
- **Complexity**: Erlang-based system requires learning Erlang/OTP for deep debugging
- **Memory Usage**: Uses ~5KB per connection (5 million connections = 25GB RAM minimum)
- **Learning Curve**: EMQX's configuration DSL and cluster setup require 2-3 days of learning

**Performance Metrics:**
- **Connection Capacity**: 1 million connections per node (8-core, 32GB RAM)
- **Message Throughput**: 100,000-1,000,000 messages/sec (depending on QoS level)
- **Latency**: <10ms message delivery (p99)
- **Resource Usage**: 5KB RAM per connection, 2% CPU per 10k connections

**Scaling Strategy:**
```
0-100k devices:     Single EMQX node (4-core, 8GB RAM)
100k-1M devices:    EMQX cluster (3 nodes, 8-core, 32GB RAM each)
1M-5M devices:      EMQX cluster (5+ nodes with load balancer)
```

**Access Control Example:**
```erlang
%% EMQX ACL configuration
{allow, {user, "device-abc123"}, publish, ["losant/abc123/state"]}.
{allow, {user, "device-abc123"}, subscribe, ["losant/abc123/command"]}.
{deny, all}.
```

**When to Reconsider:**
- Need for proprietary protocols beyond MQTT (use AWS IoT Core or Azure IoT Hub)
- Budget allows managed services (use HiveMQ Cloud or AWS IoT Core)
- <10k devices and want simplicity (use Mosquitto)

**Related Technologies:**
- [NATS](#nats-210) (internal message bus)
- [Node.js Workflow Engine](#nodejs-20-lts) (workflow triggers)

---

### NATS 2.10+ Message Bus

**Purpose**: Internal pub/sub for workflow triggers, service-to-service communication, stream processing

**Why Chosen:**
- **Sub-Millisecond Latency**: <1ms message delivery within same datacenter (Go-based, zero-copy)
- **JetStream (Stream Processing)**: Persistent streams, replay, exactly-once delivery, consumer groups
- **Lightweight**: Single binary, <50MB memory footprint, no JVM overhead
- **At-Most-Once & Exactly-Once**: Configurable delivery guarantees (MQTT → Workflow needs exactly-once)
- **Decoupling**: MQTT broker (EMQX) is decoupled from workflow engine via NATS

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **RabbitMQ** | 5-10x higher latency; Erlang/JVM overhead; heavier resource usage (100MB+ RAM baseline); complex clustering |
| **Apache Kafka** | Over-engineered for <1M messages/sec; JVM overhead; complex Zookeeper dependency; higher latency (10-50ms) |
| **Redis Streams** | Limited stream processing features; no consumer groups with automatic failover; single-threaded bottleneck |
| **Direct MQTT → Workflow** | Tight coupling; difficult to scale workflow engines independently; no replay capability |

**Trade-offs:**
- **No Transactions**: NATS doesn't support distributed transactions (mitigated with idempotent workflows)
- **Message Size Limit**: Default 1MB max message size (configurable but not designed for large payloads)
- **Less Mature Ecosystem**: Smaller community than Kafka/RabbitMQ

**Performance Metrics:**
- **Latency**: <1ms p99 (same datacenter)
- **Throughput**: 5-20 million messages/sec (single server, depending on message size)
- **Memory Usage**: <50MB baseline + ~1KB per active subscription
- **Horizontal Scaling**: Linear scaling with multiple NATS servers (cluster mode)

**Use Cases:**
```
Workflow Triggers:     device.state.{deviceId} → Workflow Engine
Dashboard Updates:     dashboard.update.{dashboardId} → WebSocket servers
Service Events:        device.created, device.deleted → Audit logs
Stream Processing:     JetStream consumers for workflow queues
```

**When to Reconsider:**
- Need for >10 million messages/sec (consider Apache Kafka)
- Complex event processing with windowing (use Apache Flink + Kafka)
- Existing Kafka infrastructure (stick with Kafka)

**Related Technologies:**
- [EMQX](#emqx-5x-mqtt-broker-goerlang) (MQTT → NATS bridge)
- [Node.js Workflow Engine](#nodejs-20-lts) (NATS consumers)

---

### Docker Compose (Initial) vs Kubernetes (Scale)

**Purpose**: Container orchestration and deployment

**Progressive Approach Decision:**

#### Phase 1-2 (0-10k devices): Docker Compose

**Why Chosen:**
- **Simplicity**: Setup in hours (vs days/weeks for Kubernetes)
- **Low Operational Overhead**: 1-2 engineers can manage (vs 5+ for K8s)
- **Cost-Effective**: $100-200/month VPS (vs $500-1000/month K8s cluster)
- **Sufficient for MVP**: Handles 0-10k devices with vertical scaling
- **Easy Debugging**: Direct container logs, no abstraction layers

**Trade-offs:**
- **Single-Host HA**: Limited high availability (single VPS failure = downtime)
- **Manual Scaling**: No auto-scaling (must manually adjust container count)
- **No Advanced Health Checks**: Basic container restart, no readiness/liveness probes

**Docker Compose Scaling Example:**
```bash
# Scale API service to 5 replicas
docker-compose -f docker-compose.prod.yml up -d --scale api=5

# Scale workflow engine to 10 replicas
docker-compose -f docker-compose.prod.yml up -d --scale workflow-engine=10
```

#### Phase 3+ (10k+ devices): Kubernetes

**Why Migrate:**
- **Automatic Scaling**: Horizontal Pod Autoscaler (HPA) based on CPU/memory/custom metrics
- **Multi-Region Deployment**: Deploy to multiple cloud regions for geo-redundancy
- **Advanced Health Checks**: Readiness/liveness probes prevent traffic to unhealthy pods
- **Industry Standard**: Better hiring pool, mature ecosystem, extensive tooling

**Trade-offs (Kubernetes):**
- **Complexity**: Steep learning curve (YAML manifests, kubectl, networking)
- **Operational Overhead**: Requires dedicated DevOps team
- **Cost**: Minimum $500-1000/month (managed EKS/GKE/AKS + worker nodes)

**Performance Comparison:**

| Aspect | Docker Compose | Kubernetes |
|--------|---------------|------------|
| **Setup Time** | 2-4 hours | 2-4 days (managed) or 2-3 weeks (self-hosted) |
| **Operational Cost** | $100-200/month (VPS) | $500-1000/month (managed K8s) |
| **Scaling** | Manual (CLI command) | Automatic (HPA) |
| **HA** | Single host (limited) | Multi-node (native) |
| **Device Capacity** | 0-10k devices | 10k-1M+ devices |
| **Team Size** | 1-2 engineers | 5+ engineers (with DevOps) |

**Migration Trigger Points:**
- Serving >10,000 devices
- Need for automatic scaling based on metrics
- Multi-region deployment requirements
- Team has Kubernetes expertise
- Budget allows $500+/month

**When to Reconsider:**
- Stay on Docker Compose if:
  - Serving <10k devices
  - Budget is <$500/month
  - Team lacks K8s expertise
  - Vertical scaling (bigger VPS) is sufficient

**Related Technologies:**
- [Prometheus + Grafana](#prometheus--grafana) (metrics for HPA)
- [NGINX Ingress](#nginx-ingress) (load balancing)

---

## Backend Technologies

### Node.js 20 LTS

**Purpose**: Runtime for API server, workflow engine, WebSocket server

**Why Chosen:**
- **Event-Driven I/O**: Non-blocking I/O perfect for handling millions of concurrent device connections
- **JavaScript Everywhere**: Shared types and code between frontend (React) and backend (Node.js)
- **NPM Ecosystem**: 2+ million packages for any integration (MQTT, databases, protocols)
- **Workflow Engine Host**: JavaScript/TypeScript is ideal for user-defined Function Nodes in workflows
- **Proven at IoT Scale**: Powers IoT platforms at Microsoft Azure IoT, Losant, ThingWorx

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Go** | Used for high-throughput components (Edge Agents, MQTT routing), but not for workflow engine (no dynamic code execution) |
| **Python** | GIL (Global Interpreter Lock) limits concurrency; slower than Node.js for I/O-bound tasks; not type-safe without mypy |
| **Java/Spring Boot** | Heavier resource usage (JVM overhead); verbose code; slower development velocity |
| **Rust** | Steep learning curve; slower development velocity; overkill for I/O-bound workloads |

**Trade-offs:**
- **CPU-Bound Tasks**: Single-threaded event loop is slow for CPU-intensive operations (mitigated with Worker Threads)
- **Memory Leaks**: Garbage collector can cause memory leaks if not careful (mitigated with heap snapshots)
- **Type Safety**: JavaScript lacks compile-time type checking (mitigated with TypeScript)

**Performance Metrics:**
- **Concurrency**: 10,000+ concurrent connections per Node.js process
- **Request Handling**: 5,000-10,000 req/sec per core (Fastify)
- **Memory Usage**: ~50-100MB baseline per process
- **Event Loop Lag**: <10ms p99 (acceptable for real-time operations)

**When to Reconsider:**
- Need for <1ms p99 latency (consider Go or Rust)
- CPU-bound workloads dominate (consider Go for parallel processing)
- Team prefers statically compiled languages (consider Go)

**Related Technologies:**
- [TypeScript 5.x](#typescript-5x) (type safety)
- [Fastify 4.x](#fastify-4x) (API framework)

---

### TypeScript 5.x

**Purpose**: Type-safe language for frontend and backend

**Why Chosen:**
- **Compile-Time Type Safety**: Catch 60-80% of bugs before runtime
- **IntelliSense & Auto-Completion**: 5-10x developer productivity boost
- **Refactoring Confidence**: Rename variables, move code without fear of breaking changes
- **Shared Types**: Frontend and backend share the same type definitions (Device, DeviceState, etc.)
- **Gradual Adoption**: Can start with loose types and tighten over time

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **JavaScript (Plain)** | No type safety; runtime errors; difficult refactoring; no IntelliSense for custom types |
| **Flow** | Smaller community; Facebook is deprioritizing it; less tooling support |
| **ReasonML / Rescript** | Steep learning curve; smaller ecosystem; not JavaScript-compatible |

**Trade-offs:**
- **Build Step**: Requires TypeScript compiler (`tsc`) adding 5-10 seconds to build time
- **Learning Curve**: 1-2 weeks for developers new to static typing
- **Generic Complexity**: Advanced TypeScript generics can be difficult to understand

**Performance Metrics:**
- **Compile Time**: <10 seconds for 10,000 lines of code (incremental compilation)
- **Bug Reduction**: 60-80% fewer runtime type errors (based on industry studies)
- **Developer Productivity**: 5-10x faster refactoring compared to JavaScript

**Type Safety Example:**
```typescript
// Frontend and backend share this type
interface Device {
  id: string;
  deviceId: string;
  name: string;
  tags: string[];
}

// TypeScript ensures API response matches expected type
const device: Device = await fetch('/api/devices/abc123').then(r => r.json());
// Auto-completion for device.deviceId, device.name, etc.
```

**When to Reconsider:**
- Team strongly prefers dynamic typing (use JavaScript with JSDoc comments)
- Build time becomes a bottleneck (>60 seconds for 100k lines)

**Related Technologies:**
- [Prisma 5.x](#prisma-5x-orm) (auto-generated types)
- [Zod](#zod) (runtime validation)

---

### Fastify 4.x

**Purpose**: API framework for HTTP/REST endpoints

**Why Chosen:**
- **2x Faster Than Express**: 30,000 req/sec vs 15,000 req/sec (single core) due to optimized routing
- **Schema-First Validation**: Built-in JSON Schema validation with automatic serialization
- **TypeScript-Native**: First-class TypeScript support with IntelliSense for routes
- **Plugin Architecture**: Modular design allows reusable plugins (auth, logging, CORS)
- **Automatic OpenAPI Docs**: Generate Swagger/OpenAPI docs from route schemas

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Express** | 2x slower; no built-in validation; middleware soup; not TypeScript-native |
| **Hono** | Newer ecosystem (less mature); limited middleware; edge-focused (not ideal for traditional servers) |
| **NestJS** | Over-engineered for microservices (adds unnecessary complexity); Angular-inspired (opinionated DI) |
| **Hapi** | Configuration-heavy; slower than Fastify; smaller community |

**Trade-offs:**
- **Smaller Community**: 10x smaller community than Express (fewer Stack Overflow answers)
- **Plugin Ecosystem**: Fewer third-party plugins (need to write custom plugins)
- **Learning Curve**: Schema-first approach requires learning JSON Schema

**Performance Metrics:**
- **Request Throughput**: 30,000 req/sec per core (vs 15,000 for Express)
- **Response Time**: <5ms p99 for simple CRUD operations
- **Memory Usage**: ~50MB baseline per process (similar to Express)

**Schema-First Example:**
```typescript
server.post<{ Body: CreateDeviceRequest }>('/devices', {
  schema: {
    body: {
      type: 'object',
      required: ['deviceId', 'name'],
      properties: {
        deviceId: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
      },
    },
  },
}, async (request, reply) => {
  // request.body is automatically validated and typed
  const device = await createDevice(request.body);
  return device;
});
```

**When to Reconsider:**
- Team has deep Express expertise and Fastify migration cost is high
- Need for Express-specific middleware that doesn't exist in Fastify ecosystem
- <1,000 req/sec (performance benefit is negligible)

**Related Technologies:**
- [Zod](#zod) (alternative validation library)
- [Node.js 20 LTS](#nodejs-20-lts) (runtime)

---

### Socket.io 4.x

**Purpose**: WebSocket server for real-time dashboard updates

**Why Chosen:**
- **Bidirectional Communication**: Dashboard input controls (buttons, sliders) can send commands to devices
- **Automatic Reconnection**: Client auto-reconnects with exponential backoff on connection loss
- **Fallback to Long Polling**: Works in environments where WebSocket is blocked (corporate firewalls)
- **Room-Based Broadcasting**: Efficiently broadcast device state to specific dashboard subscribers
- **Horizontal Scaling**: Redis adapter enables Socket.io to scale across multiple Node.js instances

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Server-Sent Events (SSE)** | Unidirectional only (server → client); no bidirectional for input controls; limited browser support (no IE11) |
| **WebSocket (ws library)** | Too low-level; manual reconnection logic; no fallback to long polling; no room abstraction |
| **GraphQL Subscriptions** | Adds GraphQL complexity; overkill for simple pub/sub; higher latency than WebSocket |

**Trade-offs:**
- **Sticky Sessions**: Load balancers need sticky sessions (or Redis adapter for session sharing)
- **Protocol Overhead**: Socket.io adds ~2KB per message vs raw WebSocket
- **Connection Limits**: ~10,000 connections per Node.js instance (mitigated with clustering)

**Performance Metrics:**
- **Latency**: <50ms p99 for message delivery (dashboard update)
- **Throughput**: 10,000 messages/sec per Node.js instance
- **Connection Capacity**: 10,000 concurrent connections per instance (8GB RAM)

**Room-Based Broadcasting Example:**
```typescript
// Device state update triggers broadcast to subscribers
socket.to(`device:${deviceId}`).emit('device:state', {
  deviceId,
  data: { temperature: 72.5 },
  timestamp: new Date(),
});

// Dashboard subscribes to specific device
socket.emit('subscribe', { topic: `device:${deviceId}` });
socket.join(`device:${deviceId}`);
```

**When to Reconsider:**
- No bidirectional communication needed (use SSE)
- <100 concurrent WebSocket connections (Socket.io overhead not justified)
- Need for <10ms p99 latency (consider MQTT over WebSocket)

**Scaling Strategy:**
```
0-10k connections:    Single Socket.io instance + Redis pub/sub
10k-100k connections: Socket.io cluster (5-10 instances) + Redis adapter
100k+ connections:    MQTT over WebSocket (more efficient protocol)
```

**Related Technologies:**
- [Redis](#redis-72) (pub/sub adapter for scaling)
- [NATS](#nats-210) (alternative message bus)

---

### Zod

**Purpose**: Runtime validation and TypeScript type inference

**Why Chosen:**
- **TypeScript-First**: Infer TypeScript types from Zod schemas (single source of truth)
- **Runtime Validation**: Validate API inputs, environment variables, webhook payloads
- **Composable Schemas**: Build complex schemas from simple primitives
- **Error Messages**: Detailed validation error messages for API responses

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Joi** | No TypeScript type inference; heavier bundle size; less TypeScript-native |
| **Yup** | Smaller community; less TypeScript-native; less expressive API |
| **JSON Schema (Ajv)** | Verbose JSON syntax; no TypeScript type inference; manual type definitions |

**Trade-offs:**
- **Bundle Size**: Adds ~15KB to bundle (mitigated with tree-shaking)
- **Runtime Overhead**: Validation adds 1-5ms per request (acceptable for API endpoints)

**Type Inference Example:**
```typescript
import { z } from 'zod';

const CreateDeviceSchema = z.object({
  deviceId: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  tags: z.array(z.string()).optional(),
});

// TypeScript type inferred from schema
type CreateDeviceDTO = z.infer<typeof CreateDeviceSchema>;
// { deviceId: string; name: string; tags?: string[] }

// Runtime validation
const result = CreateDeviceSchema.safeParse(request.body);
if (!result.success) {
  return reply.status(400).send({ error: result.error.errors });
}
```

**When to Reconsider:**
- Fastify's built-in JSON Schema validation is sufficient
- Need for <1ms validation overhead (use Fastify's compiled schemas)

**Related Technologies:**
- [TypeScript 5.x](#typescript-5x) (type inference)
- [Fastify 4.x](#fastify-4x) (alternative JSON Schema validation)

---

### Go 1.21+ (High-Throughput Components)

**Purpose**: Gateway Edge Agents, MQTT routing, high-throughput data processing

**Why Chosen:**
- **Native Concurrency**: Goroutines enable efficient concurrency for handling millions of devices
- **Low Memory Footprint**: 10-50MB per edge agent (vs 100-200MB for Node.js)
- **Static Binaries**: Single binary deployment (no runtime dependencies)
- **Industrial Protocol Libraries**: Mature libraries for Modbus, OPC UA, BACnet, Siemens S7, Profinet
- **Performance**: 2-5x faster than Node.js for CPU-bound tasks (protocol parsing, data transformation)

**Why Not Used for Workflow Engine:**
- No dynamic code execution (user-defined Function Nodes require JavaScript/TypeScript)
- Workflow engine needs flexible runtime (Go is statically compiled)

**Trade-offs:**
- **Steeper Learning Curve**: 2-3 weeks for developers new to Go
- **No Dynamic Code**: Can't execute user-provided code (mitigated with Node.js for workflows)
- **Smaller IoT Ecosystem**: Fewer IoT libraries than Node.js

**Performance Metrics:**
- **Memory Usage**: 10-50MB per edge agent (vs 100-200MB for Node.js)
- **CPU Efficiency**: 2-5x faster than Node.js for protocol parsing
- **Concurrency**: 10,000+ goroutines per agent (vs 1,000 async tasks in Node.js)

**Use Cases:**
```
Gateway Edge Agents:  Protocol translation (Profinet → MQTT)
MQTT Routing:         High-throughput message routing (EMQX extensions)
Data Processing:      Real-time data aggregation and filtering
```

**When to Reconsider:**
- Team lacks Go expertise and development velocity is critical (use Node.js)
- Edge agents don't need <50ms p99 latency (use Node.js)

**Related Technologies:**
- [EMQX](#emqx-5x-mqtt-broker-goerlang) (MQTT broker in Erlang/Go)
- [Node.js](#nodejs-20-lts) (workflow engine)

---

## Frontend Technologies

### Next.js 16.1.6

**Purpose**: React framework with server-side rendering (SSR), App Router, and integrated real-time features

**Why Chosen:**
- **Turbopack Build Tool**: Built-in Turbopack for 5-10x faster builds compared to Webpack
- **App Router Stability**: Latest App Router with React Server Components (RSC) at production-ready maturity
- **Built-in Optimizations**: Image optimization, font optimization, automatic code splitting
- **Protected Routes**: Seamless integration with authentication middleware
- **Real-time Support**: Native WebSocket and Socket.io integration for live dashboards
- **Vercel Deployment**: Optimized for edge deployment with <50ms TTFB

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Vite + React** | No SSR (slower TTI); no built-in protection for auth; manual optimization needed |
| **Remix** | Smaller ecosystem; action-based routing differs from industry standard; fewer integrations |
| **Create React App** | Deprecated; no SSR; Webpack build times; not actively maintained |
| **Astro** | Content-focused (not ideal for real-time dashboards); less React interactivity |

**Trade-offs:**
- **Complexity**: RSC (React Server Components) adds client/server boundary complexity
- **Server Component Restrictions**: Server components can't use React hooks (useState, useEffect)
- **Learning Curve**: 1-2 weeks to master App Router and RSC patterns

**Performance Metrics:**
- **Time to Interactive (TTI)**: 1.5-2 seconds (vs 3-5 seconds for SPA)
- **First Contentful Paint (FCP)**: 0.8-1.2 seconds
- **Build Time**: 5-15 seconds for full rebuild (Turbopack)
- **Bundle Size**: Automatic code splitting reduces initial bundle by 40-60%

**Protected Routes Example:**
```typescript
// app/workflows/page.tsx - Auto-protected with ProtectedRoute wrapper
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default async function WorkflowsPage() {
  const workflows = await fetch(`/api/workflows`).then(r => r.json());

  return (
    <div>
      <h1>Workflows</h1>
      {/* Client component for interactivity */}
      <WorkflowsList workflows={workflows} />
    </div>
  );
}
```

**When to Reconsider:**
- No need for SSR (use Vite + React for simplicity)
- Team lacks Next.js expertise and build time is critical (use Vite)
- Fully client-side rendering required (use Vite + React)

**Related Technologies:**
- [React 19](#react-19) (UI library)
- [Redux Toolkit](#redux-toolkit-2112) (state management)
- [Tailwind CSS v4](#tailwind-css-v4) (styling)

---

### React 19.2.4

**Purpose**: Component-based UI library for building interactive real-time dashboards

**Why Chosen:**
- **Virtual DOM**: Efficient diffing for high-frequency dashboard updates (100+ updates/sec)
- **Use Actions**: Simplified async operations and server-side state mutations
- **Concurrent Rendering**: Automatic prioritization of urgent updates (user input) over background tasks
- **Component Reusability**: Dashboard blocks are reusable React components with hooks
- **Largest Ecosystem**: 2+ million packages, extensive community support
- **React Flow Integration**: Seamless support for React Flow visual workflow editor

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Vue 3** | Smaller ecosystem; less mature for large-scale applications; fewer integrations |
| **Angular** | Heavier framework (RxJS, TypeScript decorators); slower development velocity; steeper learning curve |
| **Svelte** | Smaller ecosystem; less mature tooling; compile-time framework (harder to debug); fewer components |
| **Solid.js** | Very small ecosystem; lacks mature component libraries; minimal adoption in enterprise |

**Trade-offs:**
- **Bundle Size**: React 19 + React DOM = ~48KB gzipped (slightly larger than 18)
- **Learning Curve**: Hooks, Server Components, and useActions require 2-3 weeks to master
- **Re-Rendering Complexity**: Requires understanding `useMemo`, `useCallback`, `React.memo` for performance

**Performance Metrics:**
- **Update Throughput**: 100+ component updates/sec without frame drops
- **Initial Load**: ~48KB gzipped for React 19 + React DOM
- **Re-Render Overhead**: <5ms for 100 components with proper memoization
- **Server Actions**: Eliminates need for separate API calls (direct server mutation)

**Actions & Transitions Example:**
```typescript
'use client';
import { useActionState, useTransition } from 'react';

export function CreateDeviceForm() {
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(async (prevState, formData) => {
    // Server action - runs on server, returns to client
    return await createDevice({
      name: formData.get('name'),
      deviceId: formData.get('deviceId'),
    });
  }, null);

  return (
    <form action={formAction}>
      <input name="name" required />
      <input name="deviceId" required />
      <button disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Device'}
      </button>
    </form>
  );
}
```

**Features Used:**
- **useTransition**: Smooth transitions between pending states
- **useActionState**: Form submission with server actions
- **React.lazy**: Code splitting for dashboard components
- **Suspense**: Loading boundaries for async components
- **useOptimistic**: Optimistic UI updates before server response

**When to Reconsider:**
- Need for <10KB bundle size (use Svelte or Solid.js)
- Team prefers Vue (use Vue 3 + Vite)
- No need for React 19's new actions (React 18 sufficient)

**Related Technologies:**
- [Next.js 16](#nextjs-16-1-6) (React framework)
- [Redux Toolkit](#redux-toolkit-2112) (state management)
- [React Flow](#visual-workflow-editor) (workflow visualization)

---

### Redux Toolkit 2.11.2

**Purpose**: Centralized state management for auth, UI, dashboard, workflows, and WebSocket state

**Why Chosen:**
- **Time-Travel Debugging**: Redux DevTools integration for debugging complex state changes
- **Async Thunk Support**: Built-in async thunk pattern for API calls and side effects
- **Immutable Updates**: Immer integration for safe immutable state updates
- **TypeScript-Native**: Full TypeScript support with inferred action types and state shape
- **Middleware System**: Extensible middleware for logging, analytics, error handling
- **DevTools Integration**: Visual state inspection and time-travel debugging

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Zustand** | No time-travel debugging; inadequate for complex multi-slice state; less middleware support |
| **Context API** | Performance issues with frequent updates (re-renders entire subtree); no middleware support |
| **MobX** | Implicit reactivity is harder to debug; less TypeScript-friendly; steeper learning curve |
| **Jotai / Recoil** | Atom-based approach is more complex for centralized app state; smaller ecosystem |

**Trade-offs:**
- **Bundle Size**: ~8KB gzipped (larger than Zustand, justified by features)
- **Boilerplate**: More verbose than Zustand (slices, reducers, actions) but more structured

**Performance Metrics:**
- **Bundle Size**: ~8KB gzipped (acceptable for state management features)
- **Update Performance**: <2ms for state updates with Immer integration
- **Selector Memoization**: Prevents unnecessary re-renders with reselect pattern

**State Management Example:**
```typescript
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Async thunk for API calls
export const loadWorkflows = createAsyncThunk<Workflow[], void>(
  'workflow/load',
  async () => {
    const response = await apiClient.get<Workflow[]>('/workflows');
    return response.data;
  }
);

// Slice with reducers and extra reducers for async thunks
const workflowSlice = createSlice({
  name: 'workflow',
  initialState: { workflows: [], loading: false },
  reducers: {
    addWorkflow: (state, action) => {
      state.workflows.push(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadWorkflows.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadWorkflows.fulfilled, (state, action) => {
        state.workflows = action.payload;
        state.loading = false;
      });
  },
});

// Usage in component
const { workflows, loading } = useSelector((state) => state.workflow);
const dispatch = useDispatch();

useEffect(() => {
  dispatch(loadWorkflows());
}, [dispatch]);
```

**Slices Implemented:**
- **authSlice**: user, tokens, loading, session management
- **uiSlice**: theme, modals, notifications, toast messages
- **dashboardSlice**: layouts, blocks, hybrid localStorage + MongoDB sync
- **websocketSlice**: connection state, subscriptions, real-time updates
- **workflowSlice**: nodes, edges, execution state, workflow definitions

**When to Reconsider:**
- Simple local component state (use useState)
- Very small app with minimal cross-component state (use Context API)
- Need for atomic, granular state updates (use Jotai/Recoil)

**Related Technologies:**
- [React 19](#react-19) (UI library)
- [TanStack Query](#tanstack-query-react-query) (server state)
- [Redux DevTools](#monitoring--observability) (debugging)

---

### TanStack Query (React Query)

**Purpose**: Server state management (API data fetching, caching, synchronization)

**Why Chosen:**
- **Automatic Caching**: Caches API responses with configurable TTL (reduces redundant requests by 60-80%)
- **Background Refetching**: Automatically refetches stale data when user returns to tab
- **Optimistic Updates**: Update UI before API response for instant feedback
- **Devtools**: Visual query inspector for debugging API calls
- **TypeScript-Native**: Full type inference for API responses

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **SWR** | Smaller feature set; less mature devtools; no query invalidation API |
| **Apollo Client (GraphQL)** | Requires GraphQL backend; overkill for REST API; heavier bundle size |
| **Redux Toolkit Query (RTK Query)** | Requires Redux; more boilerplate; less flexible caching |

**Trade-offs:**
- **Bundle Size**: ~12KB gzipped (acceptable for the feature set)
- **Learning Curve**: 1-2 days to understand caching strategies

**Performance Metrics:**
- **Cache Hit Rate**: 60-80% of requests served from cache
- **Reduced Network Requests**: 40-60% fewer API calls due to caching
- **Background Refetch Latency**: <50ms p99

**Usage Example:**
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

// Fetch devices with automatic caching
const { data, isLoading } = useQuery({
  queryKey: ['devices'],
  queryFn: () => fetch('/api/devices').then(r => r.json()),
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Create device with optimistic update
const { mutate } = useMutation({
  mutationFn: (device: Device) => fetch('/api/devices', {
    method: 'POST',
    body: JSON.stringify(device),
  }),
  onMutate: async (newDevice) => {
    // Optimistically update UI before API response
    queryClient.setQueryData(['devices'], (old) => [...old, newDevice]);
  },
});
```

**When to Reconsider:**
- No need for automatic refetching (use simple `fetch` + Zustand)
- GraphQL backend (use Apollo Client)

**Related Technologies:**
- [Zustand](#zustand-4x) (client state)
- [Next.js 14](#nextjs-14) (API routes)

---

### Tailwind CSS v4.1.18

**Purpose**: Utility-first CSS framework with modern CSS features and PostCSS integration

**Why Chosen:**
- **Single @import Syntax**: Simplified CSS with `@import "tailwindcss"` (no separate layer directives)
- **Modern CSS Variables**: Native CSS variable support for dynamic theming (dark mode)
- **Rapid Development**: Build UI 2-5x faster with utility classes
- **Dark Mode Support**: Built-in `darkMode: 'class'` for theme toggling with next-themes
- **Next.js Integration**: Seamless integration with Next.js 16 and Turbopack
- **@tailwindcss/postcss**: PostCSS plugin for optimized builds

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Material-UI (MUI)** | Heavy bundle size (100KB+); harder to customize; opinionated design |
| **Ant Design** | Heavy bundle size; opinionated design; less flexible for real-time dashboards |
| **Bootstrap** | Not utility-first; requires writing custom CSS; larger bundle; outdated theming |
| **CSS Modules** | Too low-level; no design system; manual consistency enforcement; difficult dark mode |

**Trade-offs:**
- **Learning Curve**: 2-3 days to learn utility class naming conventions (utility vs component classes)
- **HTML Clutter**: Many utility classes per element can be verbose (consider @apply for complex patterns)
- **Build Step**: Requires @tailwindcss/postcss plugin for processing

**Performance Metrics:**
- **Bundle Size**: ~15KB after PurgeCSS (vs 100KB+ for MUI)
- **Development Speed**: 2-5x faster UI development compared to custom CSS
- **Build Time**: <2 seconds for production build (tree-shaking removes unused utilities)
- **CSS Variables**: <1KB overhead for theming system

**Dark Mode Example:**
```tsx
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
};

// tailwind.config.ts
export default {
  darkMode: 'class', // Enable class-based dark mode
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
};

// Usage in component
<div className="bg-white dark:bg-slate-900 text-black dark:text-white">
  Dashboard Content
</div>
```

**Critical Configuration:**
- **`darkMode: 'class'`**: REQUIRED for next-themes integration (toggles `dark` class on `<html>`)
- **`@tailwindcss/postcss`**: New v4 plugin (replaces old `tailwindcss` package)
- **`@import "tailwindcss"`**: Single import statement (not v3 layer directives)

**When to Reconsider:**
- Team prefers component libraries with opinionated design (use MUI or Ant Design)
- No need for dark mode support (still use Tailwind, just simpler config)
- Heavy custom styling needed (consider CSS-in-JS like styled-components)

**Related Technologies:**
- [React 19](#react-19) (UI library)
- [Next.js 16](#nextjs-16-1-6) (framework)
- [next-themes](#frontend-technologies) (dark mode provider)

---

### React Flow 11.11.4

**Purpose**: Visual workflow editor with node-based interface for workflow composition

**Why Chosen:**
- **Declarative Node System**: Built-in Handle components for connection points (input/output)
- **Drag-and-Drop**: Native drag-and-drop node placement with grid snapping
- **MiniMap & Controls**: Built-in minimap, zoom controls, and background components
- **Custom Nodes**: Extensible custom node components for device, condition, action, transform types
- **TypeScript-Native**: Full TypeScript support with node/edge type safety
- **Active Development**: Well-maintained with regular updates and feature additions

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Xyflow** | Newer fork of React Flow; smaller community; API differs |
| **Reactflow** | Original React Flow (React Flow is maintained fork); feature parity |
| **GoJS** | Powerful but commercial ($3,995+/year); overkill for workflow editor |
| **Cytoscape.js** | Lower-level graph library; more boilerplate required; less React-native |
| **Custom SVG** | Too much boilerplate; complex gesture handling; no built-in features |

**Trade-offs:**
- **Bundle Size**: ~100KB gzipped (acceptable for visual editor feature)
- **Learning Curve**: 2-3 days to understand Handle positioning and edge connections
- **Performance**: Can be slow with >500 nodes (mitigated by virtualization)

**Performance Metrics:**
- **Bundle Size**: ~100KB gzipped for React Flow + dependencies
- **Rendering Speed**: <100ms for 100 nodes, <500ms for 500 nodes
- **Interaction Latency**: <16ms for drag operations (smooth 60fps)

**Custom Node Example:**
```typescript
import { Handle, Position, type NodeProps } from 'reactflow';

export function DeviceNode({ data, selected }: NodeProps) {
  return (
    <div className={`node ${selected ? 'selected' : ''}`}>
      {/* Input handle (left) */}
      <Handle type="target" position={Position.Left} />

      {/* Node content */}
      <div className="p-2">
        <strong>{data.label}</strong>
        <div className="text-sm text-gray-600">{data.deviceId}</div>
      </div>

      {/* Output handle (right) */}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
```

**Features Implemented:**
- **TriggerNode**: Device state triggers, time-based schedules, manual execution
- **ConditionNode**: Branching logic (if/then/else, comparisons)
- **ActionNode**: Send MQTT, publish alarms, update devices
- **TransformNode**: Data mapping, aggregation, filtering

**When to Reconsider:**
- Need for more complex graph features (use GoJS or Cytoscape)
- Performance with >1000 nodes (virtualize or use alternative)
- Team prefers traditional form-based interface (use form builder)

**Related Technologies:**
- [React 19](#react-19) (UI library)
- [Redux Toolkit](#redux-toolkit-2112) (workflow state management)
- [TypeScript 5.x](#typescript-5x) (type safety)

---

### Recharts

**Purpose**: React charting library for time-series visualization

**Why Chosen:**
- **React-Native**: Built for React (no jQuery dependency)
- **Declarative API**: Chart components use JSX syntax
- **Responsive**: Charts automatically resize with container
- **Time-Series Support**: Built-in support for time-based X-axis
- **Lightweight**: ~50KB gzipped (vs 200KB+ for Chart.js)

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Chart.js** | Not React-native (requires react-chartjs-2 wrapper); imperative API |
| **D3.js** | Too low-level (steep learning curve); manual responsiveness |
| **Victory** | Heavier bundle size; slower rendering for large datasets |
| **ECharts** | Not React-native; imperative API; heavier bundle |

**Trade-offs:**
- **Limited Chart Types**: Fewer chart types than ECharts (no 3D charts, no gauges)
- **Performance**: Slower than D3.js for >10,000 data points (mitigated with data downsampling)

**Performance Metrics:**
- **Bundle Size**: ~50KB gzipped
- **Rendering Speed**: <100ms for 1,000 data points
- **Max Data Points**: 5,000 points before frame drops (use downsampling for more)

**Usage Example:**
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

<LineChart data={deviceStates}>
  <XAxis dataKey="timestamp" />
  <YAxis />
  <CartesianGrid strokeDasharray="3 3" />
  <Tooltip />
  <Line type="monotone" dataKey="temperature" stroke="#8884d8" />
</LineChart>
```

**When to Reconsider:**
- Need for >5,000 data points per chart (use D3.js or downsampling)
- Need for complex chart types (use ECharts)

**Related Technologies:**
- [React 18](#react-18) (UI library)
- [TanStack Query](#tanstack-query-react-query) (data fetching)

---

## Development Tools

### pnpm (Package Manager)

**Purpose**: Fast, disk-efficient package manager

**Why Chosen:**
- **Disk Efficiency**: Single global store for packages (saves 30-50% disk space vs npm/yarn)
- **Faster Installs**: 2-3x faster than npm, 30-50% faster than yarn
- **Strict Dependency Resolution**: Prevents phantom dependencies (accessing packages not in package.json)
- **Monorepo Support**: Native workspace support for monorepos

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **npm** | 2-3x slower installs; no global store (duplicates packages); phantom dependencies |
| **yarn** | Not as fast as pnpm; larger disk usage; phantom dependencies |
| **bun** | Very new (unstable); limited package compatibility; lacks maturity |

**Trade-offs:**
- **Smaller Community**: 10x smaller community than npm/yarn (fewer learning resources)
- **Compatibility**: Some packages don't work with pnpm's symlink approach (rare)

**Performance Metrics:**
- **Install Speed**: 2-3x faster than npm
- **Disk Usage**: 30-50% less disk space than npm/yarn
- **Monorepo Performance**: Handles 100+ packages efficiently

**When to Reconsider:**
- Team has deep npm/yarn expertise (migration cost may not be worth it)
- Package compatibility issues arise (use npm/yarn)

**Related Technologies:**
- [Turborepo](#turborepo) (monorepo build system)

---

### Turborepo

**Purpose**: Monorepo build system with incremental builds and caching

**Why Chosen:**
- **Incremental Builds**: Only rebuild changed packages (90% faster rebuilds)
- **Remote Caching**: Share build cache across team (Vercel remote cache)
- **Task Orchestration**: Parallel task execution with dependency awareness
- **Monorepo-Optimized**: Purpose-built for JavaScript/TypeScript monorepos

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Nx** | More complex; opinionated project structure; heavier tooling |
| **Lerna** | Slower builds (no incremental builds); no remote caching; less maintained |
| **Yarn Workspaces** | No build orchestration; no caching; only package management |

**Trade-offs:**
- **Learning Curve**: 1-2 days to understand pipeline configuration
- **Remote Cache Cost**: Vercel remote cache costs $10-20/month (optional)

**Performance Metrics:**
- **First Build**: Similar to npm/yarn
- **Incremental Builds**: 90% faster (only rebuild changed packages)
- **Cache Hit Rate**: 80-95% for repeated builds

**Configuration Example:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**When to Reconsider:**
- Single package project (use Vite or esbuild)
- Need for more opinionated monorepo tooling (use Nx)

**Related Technologies:**
- [pnpm](#pnpm-package-manager) (package manager)

---

### Vitest + Playwright

**Purpose**: Unit testing (Vitest) + end-to-end testing (Playwright)

**Why Chosen (Vitest):**
- **Vite-Native**: Uses Vite's transformer for instant hot module replacement
- **Jest-Compatible API**: Drop-in replacement for Jest with faster execution
- **TypeScript-Native**: No configuration needed for TypeScript

**Why Chosen (Playwright):**
- **Cross-Browser**: Test Chrome, Firefox, Safari with single API
- **Auto-Waiting**: Automatically waits for elements (no manual `sleep()`)
- **Parallel Execution**: Run tests in parallel across browsers

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Jest** | Slower than Vitest; requires Babel configuration for TypeScript; not Vite-native |
| **Mocha + Chai** | Too low-level; requires more configuration; less TypeScript-friendly |
| **Cypress** | Slower than Playwright; only Chromium-based browsers; heavier bundle |
| **Selenium** | Slower than Playwright; more verbose API; harder to debug |

**Trade-offs:**
- **Vitest Community**: Smaller than Jest (fewer plugins)
- **Playwright Learning Curve**: 1-2 days to learn async/await API

**Performance Metrics:**
- **Vitest Speed**: 2-5x faster than Jest
- **Playwright Speed**: 30-50% faster than Cypress
- **Parallel Execution**: 5-10x faster test suite with parallelization

**When to Reconsider:**
- Team has deep Jest expertise (use Jest)
- Only need Chromium testing (use Cypress)

**Related Technologies:**
- [TypeScript 5.x](#typescript-5x) (type safety)
- [Vite](#nextjs-14) (build tool)

---

## Monitoring & Observability

### Prometheus + Grafana

**Purpose**: Metrics collection (Prometheus) + visualization (Grafana)

**Why Chosen:**
- **Pull-Based Metrics**: Prometheus scrapes metrics from services (no agent installation)
- **Time-Series Database**: Native time-series storage for metrics
- **PromQL Query Language**: Powerful query language for aggregations and alerting
- **Grafana Dashboards**: Pre-built dashboards for common metrics (CPU, memory, latency)
- **Industry Standard**: Used by Google, Uber, Spotify, Netflix
- **MongoDB Integration**: Native MongoDB exporters for monitoring Time Series Collections

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Datadog** | Expensive ($15-30/host/month); vendor lock-in; overkill for <100 hosts |
| **New Relic** | Expensive; vendor lock-in; complex pricing; limited MongoDB support |
| **CloudWatch** | AWS-only; more expensive than self-hosted; limited query capabilities |
| **InfluxDB + Telegraf** | Requires separate data storage (InfluxDB); less mature ecosystem |

**Trade-offs:**
- **Self-Hosted Complexity**: Requires managing Prometheus/Grafana instances
- **No Log Aggregation**: Prometheus only handles metrics (use Loki for logs)
- **Short Retention**: Default 15-day retention (increase storage for longer retention)

**Performance Metrics:**
- **Scrape Interval**: 15-60 seconds (configurable)
- **Query Latency**: <100ms for simple PromQL queries
- **Retention**: 15 days default (increase with more disk space)
- **Cardinality Limit**: 1 million time-series per Prometheus instance

**Key Metrics to Monitor:**
```
# Device metrics
device_count{org_id}
device_state_ingestion_rate{org_id}

# API metrics
http_request_duration_seconds{route, status}
http_requests_total{route, status}

# Workflow metrics
workflow_execution_duration_seconds{workflow_id}
workflow_execution_errors_total{workflow_id}

# MongoDB metrics
mongodb_connections{state}
mongodb_timeseries_compression_ratio
device_state_collection_count
device_state_storage_size
```

**When to Reconsider:**
- Budget allows managed services (use Datadog or New Relic)
- Need for APM (Application Performance Monitoring) features (use Datadog or New Relic)
- <10 hosts (use CloudWatch or simple logging)

**Related Technologies:**
- [Fluent Bit + Loki](#fluent-bit--loki) (log aggregation)
- [Jaeger](#jaeger) (distributed tracing)
- [MongoDB 8](#mongodb-8-with-time-series-collections) (database monitoring)

---

### Fluent Bit + Loki

**Purpose**: Log aggregation (Fluent Bit) + log storage (Loki)

**Why Chosen:**
- **Lightweight**: Fluent Bit uses <50MB RAM (vs 200-500MB for Logstash)
- **Loki's Label-Based Indexing**: Index by labels (not full-text) for 10x cheaper storage
- **Grafana Integration**: Loki integrates seamlessly with Grafana
- **No Log Parsing**: Loki stores logs as-is (parse at query time)

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **ELK Stack (Elasticsearch, Logstash, Kibana)** | Elasticsearch is resource-heavy (JVM overhead); expensive storage; complex setup |
| **Splunk** | Extremely expensive ($150-300/GB ingested); vendor lock-in |
| **CloudWatch Logs** | AWS-only; more expensive than self-hosted; limited query capabilities |

**Trade-offs:**
- **No Full-Text Indexing**: Loki doesn't index log content (slower full-text search)
- **Query Performance**: Slower than Elasticsearch for complex full-text queries
- **Label Cardinality**: High label cardinality (unique values) can cause performance issues

**Performance Metrics:**
- **Log Ingestion**: 100GB/day per Loki instance
- **Storage Cost**: $0.01/GB/month (vs $0.10/GB for Elasticsearch)
- **Query Latency**: 100-500ms for label-based queries

**When to Reconsider:**
- Need for full-text search (use Elasticsearch)
- >1TB logs/day (use managed service like Datadog or Splunk)

**Related Technologies:**
- [Prometheus + Grafana](#prometheus--grafana) (metrics)
- [Jaeger](#jaeger) (tracing)

---

### Jaeger

**Purpose**: Distributed tracing for workflow execution

**Why Chosen:**
- **Trace Workflow Execution**: Visualize workflow node execution across services
- **OpenTelemetry Compatible**: Industry-standard tracing protocol
- **Grafana Integration**: View traces alongside metrics in Grafana
- **Sampling**: Configurable sampling to reduce overhead

**Alternatives Considered:**

| Alternative | Why Not Chosen |
|------------|----------------|
| **Zipkin** | Less mature ecosystem; fewer integrations; less active development |
| **Datadog APM** | Expensive ($30-50/host/month); vendor lock-in |
| **New Relic APM** | Expensive; vendor lock-in; complex pricing |

**Trade-offs:**
- **Storage Cost**: Traces consume 10-100x more storage than metrics
- **Overhead**: Tracing adds 5-10ms latency per traced request
- **Sampling Required**: 100% trace sampling is expensive (use 1-10% sampling)

**Performance Metrics:**
- **Trace Latency Overhead**: 5-10ms per traced request
- **Storage**: 1-10MB per 1,000 traces
- **Sampling Rate**: 1-10% for production (100% for development)

**When to Reconsider:**
- Storage costs exceed $50/month (reduce sampling rate)
- No distributed tracing needed (use simple logging)

**Related Technologies:**
- [Prometheus + Grafana](#prometheus--grafana) (metrics)
- [Fluent Bit + Loki](#fluent-bit--loki) (logs)

---

## Performance Metrics & Targets

### Dashboard Performance

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Dashboard Load Time (TTI)** | <2 seconds (p95) | Lighthouse Performance Score |
| **WebSocket Message Latency** | <100ms (p99) | Device state → Dashboard render |
| **Chart Render Time** | <100ms for 1,000 points | React DevTools Profiler |
| **Concurrent WebSocket Connections** | 10,000 per Node.js instance | Load testing with Socket.io |

### API Performance

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **API Response Time (CRUD)** | <200ms (p95) | Fastify metrics |
| **Device State Ingestion** | 100,000 msg/sec | MQTT → TimescaleDB writes |
| **Database Query Latency** | <50ms (p99) | TimescaleDB continuous aggregates |
| **Concurrent API Requests** | 5,000 req/sec per instance | Load testing with k6 |

### Workflow Performance

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Workflow Execution Time** | <500ms (p95) for simple flows | NATS trigger → completion |
| **Workflow Throughput** | 10,000 workflows/sec | Horizontal scaling with NATS |
| **Function Node Timeout** | 5 seconds max | VM2 sandbox timeout |
| **Workflow Payload Limit** | 5MB max | Validation at workflow trigger |

### Infrastructure Performance

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **EMQX Connection Capacity** | 1M connections per node | EMQX dashboard metrics |
| **NATS Message Latency** | <1ms (p99) | NATS benchmark tool |
| **Redis Read Latency** | <1ms (p99) | Redis INFO command |
| **TimescaleDB Write Rate** | 50,000 writes/sec | Prometheus metrics |

### Scaling Benchmarks

| Device Count | Architecture | Monthly Cost | Performance |
|-------------|-------------|--------------|-------------|
| **0-1k** | Docker Compose (4-core, 8GB) | $50-80 | <100ms p99 latency |
| **1k-10k** | Docker Compose (8-core, 16GB) | $100-150 | <100ms p99 latency |
| **10k-100k** | Docker Compose (16-core, 32GB) | $200-300 | <150ms p99 latency |
| **100k-1M** | Kubernetes (10+ nodes) | $500-1000 | <200ms p99 latency |

---

## Scaling & Cost Analysis

### Early Stage (0-10k Devices)

**Infrastructure:**
- Docker Compose on single VPS (8-core, 16GB RAM, 200GB SSD)
- MongoDB 8 Replica Set (rs0)
- Redis (single instance)
- EMQX (single node)
- NATS (single server)

**Monthly Costs:**
- VPS: $80-120 (DigitalOcean, Hetzner, or AWS Lightsail)
- Domain + SSL: $10-15
- Monitoring (self-hosted): $0
- **Total: $90-135/month**

**Performance:**
- 10,000 devices at 1 message/min = 167 msg/sec
- Device state ingestion: 100k+ writes/sec (MongoDB Time Series)
- Dashboard latency: <100ms p99
- API latency: <200ms p95

**When to Scale:**
- >10k devices
- >1,000 req/sec
- Single VPS CPU >70%
- MongoDB storage >100GB

---

### Growth Stage (10k-100k Devices)

**Infrastructure:**
- Docker Compose on scaled VPS (16-core, 32GB RAM, 500GB SSD)
- MongoDB 8 Replica Set (3 nodes for HA)
- Redis Sentinel (3 nodes for HA)
- EMQX cluster (3 nodes)
- NATS cluster (3 servers)

**Monthly Costs:**
- Primary VPS: $150-250 (16-core, 32GB RAM)
- MongoDB replica nodes (2 additional VPS): $80-120
- Redis Sentinel (2 additional VPS): $40-60
- EMQX cluster (2 additional VPS): $80-120
- Backup storage: $10-20
- Monitoring: $20-30
- **Total: $380-600/month**

**Performance:**
- 100,000 devices at 1 message/min = 1,667 msg/sec
- Time-series compression: 70-90% storage savings
- Dashboard latency: <150ms p99
- API latency: <200ms p95

**When to Scale:**
- >100k devices
- Need auto-scaling
- Multi-region deployment
- 90-day data retention exceeds available storage

---

### Enterprise Stage (100k-1M+ Devices)

**Infrastructure:**
- Kubernetes cluster (EKS/GKE/AKS)
- MongoDB 8 Sharded Cluster (sharding by org_id)
- Redis Cluster (6+ nodes)
- EMQX cluster (10+ nodes)
- NATS cluster (5+ servers)

**Monthly Costs:**
- Managed Kubernetes: $300-500 (EKS/GKE control plane + worker nodes)
- Worker nodes (20+ nodes): $400-600
- Managed MongoDB Atlas: $300-600 (sharded clusters)
- Redis Cluster: $100-200
- Load balancers: $50-100
- Monitoring (Datadog/New Relic): $200-500
- Backup & disaster recovery: $50-100
- **Total: $1,400-2,600/month**

**Performance:**
- 1,000,000 devices at 1 message/min = 16,667 msg/sec
- Time-series compression across all shards: 70-90%
- Dashboard latency: <200ms p99
- API latency: <200ms p95
- 99.9% uptime SLA (multi-region replication)

**When to Scale:**
- >1M devices
- Multi-region deployment
- Compliance requirements (SOC 2, HIPAA, EPA)
- Need for global low-latency access

---

## Key Architectural Decisions

### 1. Monorepo vs Polyrepo

**Decision:** Monorepo (Turborepo)

**Rationale:**
- **Shared Types**: Frontend and backend share TypeScript types (Device, DeviceState, etc.)
- **Atomic Changes**: Change API and frontend in single pull request
- **Simplified Dependency Management**: Single package.json for shared dependencies
- **Faster CI/CD**: Turborepo's incremental builds reduce CI time by 90%

**Trade-offs:**
- **Larger Repository**: Single repo can grow to 1GB+ over time
- **Tooling Required**: Needs Turborepo or Nx for efficient builds
- **Merge Conflicts**: More developers working in same repo = more conflicts

**When to Reconsider:**
- >50 packages in monorepo (consider polyrepo with shared packages)
- Teams work on completely independent services (polyrepo easier)

---

### 2. Unified Database (MongoDB) vs Polyglot Persistence

**Decision:** Unified database for all data (time-series + relational + documents)

**Rationale:**
- **Native Time Series**: MongoDB Time Series Collections are purpose-built for sensor data (not bolt-on)
- **Operational Simplicity**: Single database to backup, monitor, tune (no multiple systems)
- **Document Flexibility**: BSON documents support flexible schema for devices, workflows, audit data
- **Horizontal Scaling**: Native sharding by `orgId` or `deviceId` for multi-million device deployments
- **High Write Throughput**: 100,000+ writes/sec vs PostgreSQL's 50,000 writes/sec
- **EPA Compliance**: Built-in TTL (`expireAfterSeconds`) for 90-day retention policy

**Trade-offs:**
- **No ACID Transactions**: Time Series Collections don't support multi-document transactions (use sequential operations)
- **Aggregation Learning Curve**: MongoDB aggregation pipelines differ from SQL joins
- **Memory Usage**: MongoDB uses more RAM per stored GB than PostgreSQL (offset by compression savings)

**When to Reconsider:**
- Heavy relational operations (use PostgreSQL + Prisma)
- Team exclusively SQL-focused (learning curve for aggregation pipelines)
- <10k devices (PostgreSQL still viable, but MongoDB more future-proof)

---

### 3. Event-Driven (NATS) vs Request-Driven (HTTP) Architecture

**Decision:** Event-driven with NATS for workflow triggers

**Rationale:**
- **Decoupling**: MQTT broker doesn't need to know about workflow engine
- **Horizontal Scaling**: Workflow engines can scale independently
- **Exactly-Once Delivery**: JetStream ensures workflows don't miss messages
- **Replay Capability**: Can replay messages for debugging

**Trade-offs:**
- **Complexity**: NATS adds operational overhead (monitoring, scaling)
- **Eventual Consistency**: Workflows trigger asynchronously (not immediate)

**When to Reconsider:**
- <100 devices (use HTTP webhooks for simplicity)
- Need for synchronous response (use HTTP API)

---

### 4. Progressive Deployment (Docker Compose → Kubernetes)

**Decision:** Start with Docker Compose, migrate to Kubernetes at scale

**Rationale:**
- **Faster Time-to-Market**: Docker Compose setup in hours (vs days for K8s)
- **Lower Operational Cost**: $100-200/month (vs $500-1000/month for K8s)
- **Easier Debugging**: Direct container logs, no K8s abstraction
- **Sufficient for MVP**: Handles 0-10k devices efficiently

**Trade-offs:**
- **Migration Effort**: 4-6 weeks to migrate from Docker Compose to Kubernetes
- **Limited HA**: Docker Compose on single VPS (no multi-node HA)
- **Manual Scaling**: No auto-scaling (must manually adjust replica count)

**Migration Trigger Points:**
- Serving >10,000 devices
- Need automatic scaling (HPA)
- Multi-region requirements
- Team has K8s expertise
- Budget allows $500+/month

---

### 5. WebSocket (Socket.io) vs Server-Sent Events (SSE)

**Decision:** WebSocket with Socket.io

**Rationale:**
- **Bidirectional**: Dashboard input controls (buttons, sliders) can send commands
- **Room-Based Broadcasting**: Efficiently broadcast device state to specific subscribers
- **Automatic Reconnection**: Client auto-reconnects with exponential backoff
- **Fallback to Long Polling**: Works in restrictive networks (corporate firewalls)

**Trade-offs:**
- **Sticky Sessions**: Load balancers need sticky sessions (or Redis adapter)
- **Protocol Overhead**: Socket.io adds ~2KB per message vs raw WebSocket
- **Connection Limits**: ~10,000 connections per Node.js instance

**When to Reconsider:**
- No bidirectional communication needed (use SSE)
- <100 concurrent connections (Socket.io overhead not justified)

---

### 6. Next.js (SSR) vs Vite + React (SPA)

**Decision:** Next.js 14 with App Router

**Rationale:**
- **Faster Time to Interactive**: SSR reduces dashboard TTI by 40-60%
- **SEO-Friendly**: SSR for public-facing pages (documentation, marketing)
- **API Routes Co-Located**: Backend and frontend in same repo
- **Built-in Optimizations**: Image, font, code splitting automatic

**Trade-offs:**
- **Complexity**: React Server Components add client/server boundary complexity
- **Server Component Restrictions**: Server components can't use React hooks
- **Vendor Lock-in**: Best experience on Vercel (self-hosting requires more config)

**When to Reconsider:**
- No need for SSR (dashboard is entirely client-side)
- Team lacks Next.js expertise (use Vite + React)

---

## Appendix: Technology Maturity Matrix

| Component | Maturity | Community Size | Risk Level | Alternatives Considered |
|-----------|----------|----------------|------------|-------------------------|
| **Next.js 16** | Stable | Large (500k+ weekly downloads) | Low | Vite + React, Remix |
| **React 19** | Stable | Large (10M+ weekly downloads) | Low | Vue, Angular, Svelte |
| **Fastify 4.x** | Stable | Medium (100k+ weekly downloads) | Low | Express, Hono |
| **MongoDB 8 + Time Series** | Stable | Large (1M+ production deployments) | Low | InfluxDB, QuestDB, PostgreSQL + TimescaleDB |
| **Mongoose 8.23** | Stable | Large (100k+ weekly downloads) | Low | TypeORM, Prisma (MongoDB), Motor |
| **EMQX 5.x** | Production | Medium (10k+ production deployments) | Medium | VerneMQ, Mosquitto, AWS IoT Core |
| **NATS 2.10** | Production | Medium (10k+ production deployments) | Low | RabbitMQ, Kafka, Redis Streams |
| **Redis 7.2** | Mature | Large (1M+ production deployments) | Low | Memcached, in-memory Maps |
| **Docker Compose** | Mature | Large (widely used) | Low | Docker Swarm, Kubernetes (initial) |
| **Kubernetes** | Mature | Large (industry standard) | Medium | Used after scale (10k+ devices) |
| **Redux Toolkit 2.11** | Stable | Large (100k+ weekly downloads) | Low | Zustand, Context API, MobX |
| **TanStack Query** | Stable | Large (100k+ weekly downloads) | Low | SWR, Apollo Client, RTK Query |
| **Socket.io 4.x** | Stable | Large (200k+ weekly downloads) | Low | SSE, raw WebSocket, GraphQL Subscriptions |
| **Tailwind CSS v4** | Stable | Large (1M+ weekly downloads) | Low | Material-UI, Ant Design, Bootstrap |
| **React Flow** | Stable | Medium (50k+ weekly downloads) | Low | Xyflow, Reactflow alternatives |

---

## Document Maintenance

**Last Updated:** 2026-02-04
**Version:** 1.0
**Maintained By:** Architecture Team

**Update Triggers:**
- New technology added to stack
- Technology version upgrade (major version)
- Performance metric changes
- Cost analysis updates
- Alternative technology evaluation

**Related Documents:**
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical architecture details
- [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) - Phase-by-phase implementation
- [PRODUCTION_READY_POC.md](PRODUCTION_READY_POC.md) - POC guide with production architecture

---

**This document provides the foundation for all technology decisions in the Dynamic Dashboard Enterprise IoT Platform. Use it to onboard new team members, evaluate technology changes, and justify architectural choices to stakeholders.**
