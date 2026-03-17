# Current Task: ADR-043 Storage Worker

## Goal
Consume sensor.raw NATS stream via BullMQ Storage Worker.
Batch device state documents into MongoDB via insertMany.
Remove direct MongoDB writes from Modbus + OPC-UA gateways.
REST endpoint keeps direct write (response contract unchanged).

## Scope
- New: src/lib/redis-client.ts (ioredis singleton from REDIS_URL)
- New: src/workers/storage-worker.ts (NATS consumer + batch accumulator + BullMQ flush)
- Modify: src/config/config.ts (redisUrl, worker.batchSize, worker.flushIntervalMs)
- Modify: src/index.ts (start worker after NATS; drain/close on shutdown)
- Modify: src/services/modbus-gateway-manager.service.ts (remove direct DB write)
- Modify: src/services/opcua-gateway-manager.service.ts (remove direct DB write)

## Constraints
- BATCH_SIZE: 1000 documents; FLUSH_INTERVAL: 200ms
- BullMQ retry: 3 attempts, exponential backoff 1000ms
- insertMany: ordered:false (skip duplicate key errors)
- Storage Worker filters source='rest' events (REST controller keeps direct write)
- Graceful shutdown: consumer drain → worker close → redis quit
- REST POST /devices/:id/states response unchanged (201 + state object)

## Architectural Impact
Yes — Redis introduced; direct Modbus/OPC-UA writes replaced by NATS→BullMQ path.

## Done When
Simulator sends states → device_states populated via insertMany (not direct write).
NATS message count matches MongoDB document count for modbus/opcua sources.
