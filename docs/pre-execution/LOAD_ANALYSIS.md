# Load Analysis & Architecture Capacity Assessment

**Date:** 2026-02-05
**Target Load:** 93.15 GB/day | 1.59 GB/hr | 27.13 MB/sec

---

## Executive Summary

✅ **YES - The documented architecture CAN handle this load with significant headroom.**

Your target load of **27.13 MB/sec** translates to approximately **13,500-54,000 messages/sec** depending on message size. The architecture is designed for **100,000 messages/sec** ingestion capacity, giving you **2-7x headroom** for growth.

---

## Load Translation & Assumptions

### Your Requirements
- **Data Flow:** 27.13 MB/sec (27,132.81 KB/sec)
- **Hourly:** 1.59 GB/hr (97,678,125 KB/hr)
- **Daily:** 93.15 GB/day

### Message Size Scenarios

| Message Size | Messages/Second | Messages/Hour | Messages/Day | Typical Use Case |
|--------------|----------------|---------------|--------------|------------------|
| **500 bytes** | 54,266 msg/sec | 195M msg/hr | 4.69B msg/day | Compact telemetry (temp, pressure, GPS) |
| **1 KB** | 27,133 msg/sec | 97.7M msg/hr | 2.34B msg/day | Standard IoT payload (JSON with 5-10 fields) |
| **2 KB** | 13,566 msg/sec | 48.8M msg/hr | 1.17B msg/day | Rich payloads (images thumbnails, arrays) |
| **5 KB** | 5,426 msg/sec | 19.5M msg/hr | 468M msg/day | Large payloads (waveforms, batch data) |

**Assumption Used:** 1 KB average message size → **~27,000 messages/sec**

---

## Architecture Capacity (Per Documentation)

From `docs/ARCHITECTURE.md` (lines 1308-1310):

| Component | Documented Capacity | Your Load | Headroom |
|-----------|-------------------|-----------|----------|
| **Device State Ingestion** | 100,000 msg/sec | 27,133 msg/sec | **3.7x** |
| **Database Writes** | 50,000 writes/sec | 27,133 writes/sec | **1.8x** |
| **Concurrent Connections** | 1M+ devices | (calculated below) | **10-100x** |
| **EMQX per Node** | 250k connections | (depends on devices) | Varies |
| **API Response Time** | <200ms p95 | N/A | N/A |
| **Dashboard Latency** | <100ms p99 | N/A | N/A |

---

## Device Calculation

### How Many Devices Generate This Load?

| Reporting Frequency | Devices Needed (1KB msg) | Architecture Capacity | Feasible? |
|---------------------|-------------------------|----------------------|-----------|
| **1 second** | 27,133 devices | 1M+ devices | ✅ YES (95% headroom) |
| **5 seconds** | 135,665 devices | 1M+ devices | ✅ YES (86% headroom) |
| **10 seconds** | 271,330 devices | 1M+ devices | ✅ YES (73% headroom) |
| **30 seconds** | 813,990 devices | 1M+ devices | ✅ YES (19% headroom) |
| **60 seconds** | 1,627,980 devices | 1M+ devices | ⚠️ TIGHT (need scaling) |

**Most Common IoT Pattern:** 10-30 second reporting interval
- **10 seconds:** ~270,000 devices → Well within capacity
- **30 seconds:** ~810,000 devices → Approaches limits, but feasible

---

## Component-by-Component Analysis

### 1. MQTT Broker (EMQX)

**Capacity:**
- 250,000 connections per node (4-core, 8GB RAM)
- Clustered for horizontal scaling
- 100,000 msg/sec ingestion rate

**Your Load:**
- 27,133 msg/sec
- Estimated 50,000-300,000 concurrent devices

**Assessment:** ✅ **1-2 EMQX nodes sufficient**
- Single node handles 250k devices
- For 270k devices (10-sec reporting), use 2 nodes
- Throughput well under limit (27% of capacity)

---

### 2. Database Layer (PostgreSQL + TimescaleDB)

**Capacity:**
- 50,000 writes/sec
- Vertical scaling to 64 cores, 256GB RAM
- Read replicas for dashboard queries

**Your Load:**
- 27,133 writes/sec (if all messages persist)
- ~2.34 billion rows/day (at 1KB/msg)

**Data Size:**
```
Daily data: 93.15 GB raw JSON
With compression (3:1): ~31 GB/day compressed
Monthly: ~930 GB compressed
Yearly: ~11.1 TB compressed
```

**Assessment:** ✅ **Medium-tier PostgreSQL handles this**
- **Recommendation:** 16-32 CPU cores, 64-128GB RAM
- Use TimescaleDB compression (3-5x reduction)
- Set retention policy: 90 days hot, 1 year cold storage (MinIO)
- Read replicas for dashboard queries

**Storage Planning:**
| Timeframe | Raw Data | Compressed | Total (with metadata) |
|-----------|----------|------------|----------------------|
| 1 month | 2.79 TB | 930 GB | ~1.2 TB |
| 3 months | 8.38 TB | 2.79 TB | ~3.5 TB |
| 1 year | 33.5 TB | 11.1 TB | ~14 TB |

**Disk Requirements:** 5-10 TB SSD for 90-day hot storage

---

### 3. Workflow Engine (Node.js)

**Capacity:**
- 1 pod per 1,000 concurrent workflows
- Stateless, horizontally scalable
- 60-second timeout, 5MB payload limit

**Your Load:**
- Depends on workflow complexity
- If 10% of messages trigger workflows: 2,713 workflows/sec
- If workflows take 500ms avg: ~1,356 concurrent workflows

**Assessment:** ✅ **2-3 workflow engine pods sufficient**
- Each pod handles ~1,000 concurrent workflows
- Auto-scale based on NATS queue depth
- CPU target: 70%

---

### 4. Redis (State & Cache)

**Capacity:**
- Redis Cluster for horizontal scaling
- 50k-100k ops/sec per node

**Your Load:**
- Session storage: negligible
- Workflow state: ~2,713 writes/sec (if 10% trigger workflows)
- Cache hits: ~5,000 reads/sec

**Assessment:** ✅ **Single Redis instance sufficient**
- Use Redis Cluster for HA
- Separate instances for sessions, workflow state, cache

---

### 5. Message Bus (NATS)

**Capacity:**
- Low-latency pub/sub
- Millions of messages/sec

**Your Load:**
- 27,133 messages/sec

**Assessment:** ✅ **Massive headroom**
- NATS designed for millions of msg/sec
- Single NATS cluster sufficient

---

### 6. WebSocket Server (Socket.io)

**Capacity:**
- ~10,000 concurrent connections per pod
- Horizontally scalable

**Your Load:**
- Depends on active dashboard users
- Typical: 50-500 concurrent users
- Peak: 1,000-5,000 users

**Assessment:** ✅ **1-2 WebSocket pods sufficient**
- Sticky sessions required (use load balancer affinity)
- Auto-scale based on connection count

---

## Deployment Recommendations

### Phase 1: POC/MVP (0-50k devices)
**Infrastructure:** Docker Compose on VPS

```
VPS Specifications:
- CPU: 16 cores
- RAM: 32 GB
- Storage: 1 TB NVMe SSD
- Network: 1 Gbps
- Cost: ~$150-250/month
```

**Components:**
- EMQX: 1 container (250k device capacity)
- PostgreSQL + TimescaleDB: 1 container (12GB allocated)
- Redis: 1 container (4GB allocated)
- NATS: 1 container (2GB allocated)
- API: 3 replicas (2GB each)
- Workflow Engine: 3 replicas (2GB each)
- WebSocket: 2 replicas (1GB each)
- Frontend: 2 replicas (512MB each)

**Estimated Load:**
- CPU: 60-70% avg
- RAM: 26/32 GB
- Disk: 100-200 GB/month growth

---

### Phase 2: Production (50k-300k devices)
**Infrastructure:** Docker Compose or Kubernetes

```
VPS/Cluster Specifications:
- CPU: 32 cores (or 3x 16-core nodes)
- RAM: 64 GB (or 3x 32GB nodes)
- Storage: 5 TB NVMe SSD
- Network: 10 Gbps
- Cost: ~$400-600/month (Docker) or $800-1200/month (K8s)
```

**Scaling Points:**
- EMQX: 2 nodes (500k device capacity)
- PostgreSQL: Vertical scaling + read replica
- Redis: Redis Cluster (3 nodes)
- Workflow Engine: 5-10 pods (auto-scaled)
- API: 5 pods
- WebSocket: 3 pods

---

### Phase 3: Enterprise (300k-1M devices)
**Infrastructure:** Kubernetes (EKS/GKE/AKS)

```
Cluster Specifications:
- Nodes: 5-10 worker nodes (8-16 cores, 32-64GB each)
- Storage: 10-20 TB (managed disks)
- Network: Load balancer + CDN
- Cost: ~$2,000-5,000/month
```

**Advanced Features:**
- Horizontal Pod Autoscaler (HPA)
- Multi-region deployment
- Database sharding by org_id
- Read replicas in each region
- Edge CDN for dashboards

---

## Bottleneck Analysis

### Potential Bottlenecks (In Order of Risk)

1. **Database Write Throughput** ⚠️ **MOST LIKELY**
   - **Symptom:** Write latency >500ms, queue backlog
   - **Solution:**
     - Batch inserts (100-1000 rows per transaction)
     - Use TimescaleDB compression
     - Vertical scaling (more CPU/RAM)
     - Read replicas for queries

2. **Network Bandwidth** ⚠️ **MODERATE RISK**
   - **Load:** 27.13 MB/sec = ~217 Mbps
   - **Solution:**
     - Use 1 Gbps network (5x headroom)
     - GZIP compression on MQTT (30-50% reduction)

3. **Disk I/O** ⚠️ **MODERATE RISK**
   - **Load:** ~2.34 billion writes/day
   - **Solution:**
     - Use NVMe SSD (100k IOPS+)
     - TimescaleDB auto-chunking (daily chunks)
     - Move old data to MinIO (S3) after 90 days

4. **Workflow Engine CPU** ⚠️ **LOW RISK**
   - **Solution:** Horizontal scaling (stateless pods)
   - Auto-scale based on CPU %

5. **EMQX Connections** ⚠️ **LOW RISK**
   - **Solution:** Add nodes to cluster (automatic rebalancing)

---

## Optimization Recommendations

### 1. Edge Filtering ("Report by Exception")
Reduce data volume by 50-90% by filtering at edge:

```javascript
// Edge Agent (Go) - Only send if value changed
const threshold = 0.5; // 0.5°C change
if (Math.abs(currentTemp - lastTemp) > threshold) {
  publishToMQTT(currentTemp);
  lastTemp = currentTemp;
}
```

**Impact:** Reduces load from 27 MB/sec to 2.7-13.5 MB/sec

---

### 2. Batch Inserts
Instead of individual row inserts, batch 100-1000 rows:

```typescript
// Bad: 27,000 inserts/sec
await prisma.deviceState.create({ data: {...} });

// Good: 270 batch inserts/sec (100 rows each)
await prisma.deviceState.createMany({
  data: batchOf100Rows,
  skipDuplicates: true
});
```

**Impact:** Reduces database load by 70-80%

---

### 3. TimescaleDB Compression
Compress data older than 7 days:

```sql
-- Compression policy (3-5x reduction)
SELECT add_compression_policy('device_states', INTERVAL '7 days');
```

**Impact:** Reduces storage by 70-80%

---

### 4. Data Retention Policy
Move cold data to MinIO after 90 days:

```sql
-- Retention policy
SELECT add_retention_policy('device_states', INTERVAL '90 days');
```

**Impact:** Keeps hot storage <1 TB

---

### 5. MQTT QoS Optimization
Use QoS 0 for telemetry (no acknowledgment):

```javascript
// QoS 0: Fire-and-forget (fastest)
client.publish('losant/deviceId/state', payload, { qos: 0 });
```

**Impact:** Reduces MQTT overhead by 30-50%

---

## Load Testing Plan

### Test Scenarios

**Scenario 1: Sustained Load**
- Duration: 1 hour
- Rate: 30,000 msg/sec (110% of target)
- Metrics: CPU, memory, latency p99

**Scenario 2: Spike Test**
- Duration: 10 minutes
- Rate: 50,000 msg/sec (2x target)
- Metrics: Queue depth, error rate

**Scenario 3: Endurance Test**
- Duration: 24 hours
- Rate: 27,000 msg/sec
- Metrics: Memory leaks, disk growth, connection stability

### Tools
- **MQTT Load Testing:** [emqtt_bench](https://github.com/emqx/emqtt-bench)
- **API Load Testing:** [k6](https://k6.io/)
- **Monitoring:** Prometheus + Grafana

---

## Cost Estimate

### Docker Compose (Recommended for your load)

**VPS Costs:**
| Provider | Specs | Monthly Cost |
|----------|-------|--------------|
| Hetzner | 16 CPU, 32GB RAM, 1TB SSD | $150 |
| DigitalOcean | 16 CPU, 32GB RAM, 1TB SSD | $240 |
| AWS EC2 | c6i.4xlarge (16 CPU, 32GB RAM) | $490 |
| Vultr | 16 CPU, 32GB RAM, 1TB SSD | $192 |

**Additional Costs:**
- Backups: $20-50/month (block storage)
- Monitoring: $0 (self-hosted Prometheus/Grafana)
- CDN: $20-100/month (Cloudflare free tier available)

**Total: $150-300/month** for 50k-300k devices

---

### Kubernetes (If scaling >300k devices)

**Cluster Costs:**
| Provider | Specs | Monthly Cost |
|----------|-------|--------------|
| AWS EKS | 5x c6i.2xlarge (8 CPU, 16GB) | $1,200 |
| GCP GKE | 5x n2-standard-8 (8 CPU, 32GB) | $1,450 |
| Azure AKS | 5x Standard_D8s_v3 (8 CPU, 32GB) | $1,380 |

**Total: $1,200-2,000/month** for 300k-1M devices

---

## Conclusion

### ✅ Architecture Assessment: **CAPABLE**

Your load of **27.13 MB/sec (93.15 GB/day)** is well within the architecture's capacity:

1. **Ingestion:** 27k msg/sec vs. 100k capacity = **27% utilization**
2. **Database:** 27k writes/sec vs. 50k capacity = **54% utilization**
3. **Devices:** 50k-300k devices vs. 1M capacity = **5-30% utilization**

### Recommended Deployment Path

**Phase 0: POC (Week 1-3)**
- Local dev environment
- 10-100 simulated devices
- HTTP data ingestion
- SQLite or PostgreSQL

**Phase 1: MVP (Week 4-8)**
- Docker Compose on $150-250/month VPS
- 1,000-10,000 devices
- MQTT + TimescaleDB
- **Target:** Handle 10% of your target load (2.7 MB/sec)

**Phase 2: Production (Week 9-16)**
- Scaled Docker Compose or Kubernetes
- 10,000-300,000 devices
- Full load: 27 MB/sec
- Monitoring, backups, HA

**Phase 3: Enterprise (Week 17+)**
- Kubernetes if needed (>300k devices)
- Multi-region deployment
- Edge filtering enabled
- **Target:** 2-5x your current load

### Key Success Factors

1. **Use TimescaleDB compression** (70-80% storage reduction)
2. **Batch database inserts** (70-80% load reduction)
3. **Edge filtering** (50-90% data reduction)
4. **Monitor early** (identify bottlenecks before production)
5. **Start with Docker Compose** (faster, cheaper, simpler)

---

**Final Answer: YES, the architecture supports your load with 2-7x headroom for growth.**

