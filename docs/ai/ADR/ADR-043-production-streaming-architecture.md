# ADR-043: Production Streaming Architecture — NATS JetStream + Redis + Storage Worker

## Context
POC architecture uses fire-and-forget workflow dispatch and Socket.io embedded in the main API process.
At 10K sensors / 25Hz = 250,000 msg/sec this fails on three axes:
1. **Backpressure**: no queue between ingestion and workflow dispatch; spikes cause cascading delays
2. **WebSocket fan-out**: Socket.io broadcast inside API process unbounded at scale
3. **Write amplification**: one `insertMany` per device per gateway poll; no cross-gateway batching

## Decision
Adopt a four-component production streaming layer:

| Component | Technology | Role |
|---|---|---|
| Streaming bus | NATS JetStream | Internal message broker; streams: `sensor.raw`, `sensor.processed`, `sensor.alerts` |
| Real-time cache | Redis 7 + ioredis | `sensor:latest:{sensorId}` key; pub/sub for WebSocket fan-out |
| Storage Worker | BullMQ + Node.js | Subscribes to `sensor.raw`; batches raw readings into MongoDB `insertMany()` — 1000 docs / 200ms flush |
| WebSocket Gateway | Dedicated process | Subscribes to Redis pub/sub; manages client rooms by sensorId; zero API coupling |

Processing engine sits between `sensor.raw` and `sensor.processed`:
noise filter → delta detection → emit `sensor.processed` → Redis cache + WorkflowDispatcher.
StorageWorker subscribes directly to `sensor.raw`; writes raw, unfiltered readings to MongoDB (`device_states`), preserving the full audit trail per EPA 21 CFR Part 11.

## Consequences
- **Non-breaking to API contract**: all existing REST endpoints and Mongoose models unchanged
- **Compliance layer unchanged**: audit logs, retention policies, alarm state machine carry forward
- **New infrastructure deps**: NATS JetStream server, Redis 7, BullMQ (backed by Redis)
- **WorkflowTriggerDispatcher** refactored from `Workflow.find()` per poll → NATS consumer + workflow ID cache
- **ModbusGatewayManager** publishes raw readings to `sensor.raw` stream instead of direct DB write
- **MongoDb pool**: `maxPoolSize: 50` required (was 10); Storage Worker handles sustained write load
- Horizontal scaling: WebSocket Gateway and Storage Worker can run as separate deployable units

## Clustering (HA)
| Component | Config |
|---|---|
| NATS JetStream | 3-node cluster; R=3 stream replication; consumer groups load-balance across Processing Engine + WorkflowDispatcher replicas |
| Redis | Cluster mode: 6 nodes (3P+3R); `ioredis` Cluster client; hash-slot distributed keys (`sensor:latest:{sensorId}`, `workflow:active:{orgId}`) |
| WebSocket Gateway | N stateless instances; sticky LB (IP-hash/cookie); each instance subscribes Redis pub/sub for fan-out |
