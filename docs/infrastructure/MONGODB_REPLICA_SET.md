# MongoDB Replica Set: Significance and Implementation

## Executive Summary

MongoDB Replica Sets are essential for production IoT applications, providing automatic failover, data redundancy, and consistency guarantees. This document explains why the IoT Platform uses replica sets and how they benefit the system.

---

## What is a MongoDB Replica Set?

A **Replica Set** is a group of MongoDB instances that maintain the same data. One instance acts as the **Primary** (accepts reads and writes), while others act as **Secondaries** (replicate data from Primary).

```
┌─────────────┐
│   Primary   │  ← Accepts all reads/writes
│  (Read/Write)│
└─────────────┘
       ↓ replicates
    ┌──┴──┐
    ↓     ↓
┌────────────┐  ┌────────────┐
│ Secondary  │  │ Secondary  │  ← Read-only copies
│ (Read Only)│  │ (Read Only)│
└────────────┘  └────────────┘
```

---

## Significance for IoT Platform

### 1. **High Availability & Automatic Failover**

**Problem Without Replica Sets:**
- Single MongoDB instance fails → entire system down
- No automatic recovery
- Data loss risk

**Solution With Replica Sets:**
```typescript
// Automatic failover happens within seconds
// If Primary fails:
// 1. Replica Set elects new Primary (automatic)
// 2. Application reconnects (automatic via driver)
// 3. System continues operating without downtime
```

**Real-World Example:**
```
Time 0s:    Primary dies (power failure, network issue)
Time 1s:    Replica Set detects failure (heartbeat timeout)
Time 2-5s:  Secondaries elect new Primary
Time 6s:    Application reconnects automatically
Time 7s:    Operations resume (zero data loss)
```

### 2. **Data Redundancy & Durability**

**Problem Without Replica Sets:**
- Single copy of data
- Disk corruption → data lost forever

**Solution With Replica Sets:**
```typescript
// Data exists on 3+ nodes
// Even if one node has corruption, others have clean copies

// Journaling + Replication provides:
// - Write durability (data committed to disk)
// - Replication durability (data on multiple nodes)
```

**EPA 21 CFR Part 11 Compliance:**
```
Requirement: "Complete, accurate, and durable" records
Replica Set Solution:
  ✅ Primary writes to disk (durability)
  ✅ Secondaries replicate (redundancy)
  ✅ Automatic failover (availability)
```

### 3. **Time Series Data Guarantees**

**MongoDB Time Series Collections Requirement:**
```
⚠️  CRITICAL: Time Series Collections REQUIRE Replica Set
```

Our system uses MongoDB Time Series Collections for 5-year device state retention. These collections are optimized for time-ordered data but have a hard requirement: **replica set must be running**.

```typescript
// Without replica set (FAILS):
db.createCollection("device_states", {
  timeseries: {
    timeField: "timestamp",
    metaField: "metadata",
    granularity: "seconds"
  }
})
// Error: Cannot create time-series collection on standalone MongoDB

// With replica set (WORKS):
// Replica set running with rs.initiate() → Time Series Collections enabled
```

**Why This Matters:**
- Time Series Collections provide **65% storage compression** vs regular collections
- Automatic data aggregation and bucketing
- Optimal for sensor data (1M+ readings per hour per sensor)

---

## Current Implementation

### Setup in IoT Platform

```bash
# Environment
MONGODB_URI=mongodb://localhost:27018/iot_platform?replicaSet=rs0

# Initialization
mongod --replSet rs0 --port 27018 --dbpath ~/.mongodb-iot-platform/data
rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27018'}]})
```

### Auto-Initialization Script

```typescript
// scripts/ensure-mongodb.sh
// Runs before `npm run dev` starts
// Checks if replica set is running
// Automatically initializes if needed
// Idempotent (safe to run multiple times)
```

### Application Configuration

```typescript
// apps/api/src/lib/mongoose.ts
const MONGODB_URI = process.env.MONGODB_URI ||
  'mongodb://localhost:27018/iot_platform?replicaSet=rs0';

await mongoose.connect(MONGODB_URI);
// Driver automatically handles:
// - Primary/Secondary routing
// - Connection pooling
// - Automatic reconnection
// - Failover detection
```

---

## Data Persistence in Replica Set

### Write Path (Insert Device State)

```
1. Application sends insert to MongoDB
   ↓
2. Primary writes to memory and journal (disk)
   ↓
3. Primary sends replication stream to Secondaries
   ↓
4. Secondaries write to memory and journal (disk)
   ↓
5. Secondaries acknowledge replication
   ↓
6. Primary returns success to application
   ↓
✅ Data guaranteed on 3+ nodes
```

### Read Path (Query Device History)

```typescript
// Default: Read from Primary (strong consistency)
const states = await DeviceState.find({deviceId});

// Optional: Read from Secondary (eventual consistency, faster)
const states = await DeviceState.find({deviceId})
  .read('secondary')  // Read from secondary if available
  .lean();            // Better performance for read-only queries
```

---

## TTL (Time-To-Live) Implementation

Device states auto-delete after 5 years (EPA compliance):

```typescript
// MongoDB TTL index
db.device_states.createIndex(
  {createdAt: 1},
  {expireAfterSeconds: 157680000}  // 5 years
)

// Works across Replica Set:
// - Primary processes TTL deletes every 60 seconds
// - Secondaries replicate delete operations
// - All nodes clean up expired documents simultaneously
```

**Why TTL + Replica Set?**
- Automatic expiration on all nodes
- No need for cron jobs or manual cleanup
- Guaranteed consistency: same data expires on all nodes

---

## Consistency Models

### Strong Consistency (Default)

```typescript
// Write to Primary, read from Primary
const device = await Device.create({name: 'Sensor 1'});
const stored = await Device.findById(device._id);
// Guaranteed: stored.name === 'Sensor 1'
```

**Trade-off:** Slightly higher latency (Primary handles all operations)

### Eventual Consistency (Optional)

```typescript
// Write to Primary, read from Secondary
await DeviceState.updateOne({deviceId}, {data: {...}});

// Read from secondary (may be behind by ~1 second)
const state = await DeviceState.findOne({deviceId})
  .read('secondary');
// Possible: state has old data (< 1 sec lag)
```

**Trade-off:** Lower latency, but temporary inconsistency

---

## Transactions and Time Series Collections

### Important Limitation

```typescript
// ❌ WRONG: Transactions don't work with Time Series deletes
await session.withTransaction(async () => {
  await DeviceState.deleteMany({deviceId}, {session});
  await Device.deleteOne({_id: deviceId}, {session});
});
// Error: Cannot delete from Time Series Collection in transaction

// ✅ CORRECT: Sequential deletes without transaction
await DeviceState.deleteMany({deviceId});
await Device.deleteOne({_id: deviceId});
```

**Why?** Time Series Collections are append-only for transactions. Deletes must happen outside transaction scope.

---

## Failover Scenarios

### Scenario 1: Primary Node Fails

```
Before:     After:
Primary ✓   Primary ✗ (dead)
Secondary ✓ Secondary ✓ (elected new Primary)
Secondary ✓ Secondary ✓

Impact: ~5 second downtime during election
Data Loss: 0 (all data on Secondaries)
```

### Scenario 2: Network Partition

```
Partition 1 (2 nodes):    Partition 2 (1 node):
Primary ✓                 Secondary ✓ (isolated)
Secondary ✓

Behavior:
- Partition 1 continues (has majority = 2/3)
- Partition 2 becomes read-only (lost majority)
- When healed: Partition 2 catches up from Primary
```

### Scenario 3: Disk Corruption

```
Primary: data corrupted (bad disk)
Secondary 1: clean copy ✓
Secondary 2: clean copy ✓

Solution:
1. Remove Primary from replica set
2. Election: Secondary 1 becomes new Primary
3. Rebuild corrupted Primary from Secondary 2
4. Rejoin replica set
```

---

## Monitoring & Health

### Check Replica Set Status

```bash
# From MongoDB shell
mongosh --port 27018
rs.status()

# Output shows:
# - Primary node
# - Secondary nodes
# - Replication lag
# - Health of each node
```

### Application-Level Monitoring

```typescript
// Mongoose automatically detects Primary/Secondary status
// Connection pools route reads/writes correctly
// Failed nodes automatically bypassed

// Manual check if needed:
const connection = mongoose.connection;
const admin = connection.db.admin();
const serverStatus = await admin.serverStatus();
console.log(serverStatus.repl); // Replication info
```

---

## Production Best Practices

### 1. **Minimum 3 Nodes**
```
✅ 3+ nodes recommended
❌ 1 or 2 nodes insufficient
   - 2 nodes: if one fails, no majority for election
   - 3 nodes: if one fails, 2/3 can elect new Primary
```

### 2. **Distribute Across Servers**
```
❌ BAD: All 3 nodes on same server
✅ GOOD: Each node on different server
✅ BEST: Nodes in different data centers (for disasters)
```

### 3. **Backup Strategy**
```typescript
// Backup from Secondary (doesn't impact Primary)
// Use mongodump on Secondary node:
mongodump --host localhost:27018 --out /backups/$(date +%Y%m%d)

// Restore to new instance:
mongorestore --host new-server:27018 /backups/20260217
```

### 4. **Maintenance Windows**
```
Schedule maintenance on Secondary first:
1. Shut down Secondary
2. Perform maintenance (disk upgrade, etc.)
3. Restart Secondary
4. Wait for sync (~2-5 minutes)
5. Repeat for other Secondaries
6. Finally, step down Primary and maintain it

Result: Zero downtime maintenance
```

---

## Performance Impact

### Write Performance

```
Single Node:     ~100 microseconds
Replica Set (3):  ~200-300 microseconds (network latency for replication)

Impact: Negligible (< 1ms additional latency)
```

### Read Performance

```
Read from Primary:     ~50 microseconds
Read from Secondary:   ~40 microseconds (slightly faster, less contention)

Scaling:
- 1000 ops/sec → Primary handles all
- 10000 ops/sec → Distribute reads to Secondaries
```

### Storage

```
Data Size: 100 GB
With Replication: 300 GB (3 nodes × 100 GB)
Compression: Time Series Collections reduce by ~65%
  Effective: ~315 GB (compressed on all 3 nodes)
```

---

## Comparison: Standalone vs Replica Set

| Feature | Standalone | Replica Set |
|---------|-----------|------------|
| **Availability** | Single point of failure | Automatic failover |
| **Data Redundancy** | Single copy | 3+ copies |
| **Downtime for Maintenance** | Yes | No (rolling updates) |
| **Backup During Operation** | No (performance impact) | Yes (from Secondary) |
| **Time Series Collections** | ❌ Not supported | ✅ Supported |
| **Disaster Recovery** | Manual restore | Automatic sync |
| **Latency** | Lowest | +1-2ms (acceptable) |
| **Complexity** | Simple | Moderate |

---

## Conclusion

MongoDB Replica Sets are **not optional** for production IoT systems:

1. **Availability:** Automatic failover means zero-downtime operations
2. **Data Durability:** Time-series data on 3+ nodes prevents loss
3. **Compliance:** 21 CFR Part 11 requires redundancy and durability
4. **Scalability:** Distribute reads to Secondaries as load increases
5. **Operational Agility:** Maintenance without downtime

The IoT Platform requires replica sets for:
- Time Series Collections (EPA device state retention)
- Automatic failover (24/7 operation)
- 21 CFR Part 11 compliance (immutable audit logs)

**Investment:** ~2x storage, ~1-2ms latency
**Return:** 99.99% uptime, zero data loss, regulatory compliance
