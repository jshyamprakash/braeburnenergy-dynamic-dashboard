# ULID Implementation Guide

## Overview

We're using **ULID (Universally Unique Lexicographically Sortable Identifier)** for device IDs instead of UUID.

## Why ULID?

| Feature | UUID | ULID |
|---------|------|------|
| **Length** | 36 chars | 26 chars (28% shorter) |
| **Sortable** | ❌ Random | ✅ Time-ordered |
| **Storage** | 16 bytes | 16 bytes |
| **Readable** | ⚠️ Hyphens | ✅ Clean (no hyphens) |
| **Case** | Mixed | Uppercase only |
| **Example** | `550e8400-e29b-41d4-a716-446655440000` | `01HGW5N8XZ7KQRST9VW2XY3Z4A` |

## Schema Structure

```prisma
model Device {
  id         String   @id @default(uuid()) @db.Uuid  // Internal PK (UUID, 16 bytes)
  deviceId   String   @unique @map("device_id")      // User-facing ID (ULID, 26 chars)
  name       String
  tags       String[]
  attributes Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt()

  states DeviceState[]
}

model DeviceState {
  id        String   @default(uuid()) @db.Uuid       // Internal PK
  deviceId  String   @map("device_id")               // References Device.deviceId (ULID)
  data      Json
  timestamp DateTime @default(now())

  device Device @relation(fields: [deviceId], references: [deviceId])

  @@id([id, timestamp])  // Composite key for TimescaleDB
}
```

## Database Types

```sql
-- devices table
id          UUID        -- Native PostgreSQL UUID (16 bytes)
device_id   TEXT        -- ULID stored as text (26 chars)

-- device_states table
id          UUID        -- Native PostgreSQL UUID (16 bytes)
device_id   TEXT        -- ULID reference (26 chars)
timestamp   TIMESTAMP   -- Partitioning column
```

## Usage Pattern

### 1. Install Package

```bash
pnpm add ulid
```

### 2. Generate ULID in Service Layer

```typescript
import { ulid } from 'ulid';
import { prisma } from '../lib/prisma';

// Create device with system-generated ULID
const device = await prisma.device.create({
  data: {
    deviceId: ulid(),  // "01HGW5N8XZ7KQRST9VW2XY3Z4A"
    name: "Temperature Sensor",
    tags: ["warehouse", "floor-1"],
  }
});
```

### 3. Query by ULID

```typescript
// Find device by ULID
const device = await prisma.device.findUnique({
  where: { deviceId: "01HGW5N8XZ7KQRST9VW2XY3Z4A" }
});

// Time-sorted queries (ULID is sortable!)
const devices = await prisma.device.findMany({
  orderBy: { deviceId: 'desc' }  // Newest first
});
```

### 4. API Example

```typescript
// POST /api/devices
app.post('/devices', async (req, res) => {
  const device = await prisma.device.create({
    data: {
      deviceId: ulid(),  // System-generated
      name: req.body.name,
      tags: req.body.tags,
    }
  });

  res.json(device);
});

// Response:
// {
//   "id": "550e8400-e29b-41d4-a716-446655440000",  // Internal (not exposed)
//   "deviceId": "01HGW5N8XZ7KQRST9VW2XY3Z4A",      // User-facing
//   "name": "Temperature Sensor",
//   "tags": ["warehouse", "floor-1"],
//   "createdAt": "2026-02-05T10:44:57.000Z"
// }
```

## ULID Format

```
01HGW5N8XZ7KQRST9VW2XY3Z4A
|--------| |--------------|
Timestamp  Randomness
(48 bits)  (80 bits)
```

- **First 10 chars**: Timestamp (millisecond precision)
- **Last 16 chars**: Cryptographically strong randomness
- **Total**: 128 bits (same entropy as UUID)

## Benefits for IoT

### 1. Time-Sortable Queries

```sql
-- Get latest devices (no need for createdAt!)
SELECT * FROM devices ORDER BY device_id DESC LIMIT 100;
```

ULID's lexicographic sorting means newest devices come first when sorted descending.

### 2. Partition-Friendly

```sql
-- Get devices created today
SELECT * FROM devices
WHERE device_id >= ulid_for_date('2026-02-05')
  AND device_id < ulid_for_date('2026-02-06');
```

### 3. Shorter URLs

```
❌ UUID: /api/devices/550e8400-e29b-41d4-a716-446655440000
✅ ULID: /api/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A
```

28% shorter, no hyphens, easier to read.

### 4. MQTT Topics

```
❌ UUID: losant/550e8400-e29b-41d4-a716-446655440000/state
✅ ULID: losant/01HGW5N8XZ7KQRST9VW2XY3Z4A/state
```

## Decoding ULID Timestamp

```typescript
import { ulid } from 'ulid';

const deviceId = "01HGW5N8XZ7KQRST9VW2XY3Z4A";
const timestamp = ulid.decodeTime(deviceId);  // Unix timestamp (ms)
const date = new Date(timestamp);

console.log(date); // 2026-02-05T10:44:57.000Z
```

## Migration Path

### Applied Migrations

1. **20260205094059_init** - Initial schema
2. **20260205095838_update_device_state_composite_key** - Composite PK for TimescaleDB
3. **20260205095845_add_timescaledb_features** - Hypertable + retention
4. **20260205104457_use_native_uuid_and_ulid_deviceid** - Native UUID + ULID pattern ✅

### Changes Made

- Changed `id` from `TEXT` to `UUID` (native type, 16 bytes)
- Foreign key now references `device_id` instead of `id`
- `deviceId` remains `TEXT` (stores ULID, 26 chars)
- ULID generation in application layer (Prisma doesn't have native ULID)

## Performance Comparison

### Storage (10M devices)

| Type | Size per ID | Total Size |
|------|-------------|------------|
| UUID (text) | 36 bytes | 360 MB |
| ULID (text) | 26 bytes | 260 MB (28% savings) |
| UUID (native) | 16 bytes | 160 MB (best) |

**Our approach:**
- `id`: Native UUID (16 bytes) - internal, fast joins
- `deviceId`: ULID text (26 bytes) - user-facing, readable

### Index Performance

- **UUID (text)**: Slower string comparisons
- **UUID (native)**: Fast binary comparisons
- **ULID (text)**: Slower than native, but time-sortable ✅

## Best Practices

### ✅ Do

- Generate ULID in service layer
- Use `deviceId` in all external APIs
- Sort by `deviceId` for time-ordered results
- Index `device_id` for fast lookups

### ❌ Don't

- Expose internal `id` (UUID) to users
- Try to generate ULID in Prisma schema (not supported)
- Store ULID in UUID column (incompatible)
- Assume ULID is globally unique across systems (use proper entropy)

## Example Service Implementation

See `src/services/device.service.example.ts` for full working examples.

## References

- **ULID Spec**: https://github.com/ulid/spec
- **NPM Package**: https://www.npmjs.com/package/ulid
- **Comparison**: https://blog.daveallie.com/ulid-primary-keys
- **TimescaleDB Docs**: https://docs.timescale.com/
