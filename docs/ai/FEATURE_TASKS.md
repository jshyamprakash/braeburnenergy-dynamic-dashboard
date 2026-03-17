# Feature Tasks: ADR-043 Storage Worker

T01 | Create src/lib/redis-client.ts with ioredis singleton from REDIS_URL
T02 | Add redis.url, worker.batchSize(1000), worker.flushIntervalMs(200) to config.ts
T03 | Create src/workers/storage-worker.ts: NATS durable consumer on sensor_raw (explicit ack)
T04 | Implement batch accumulator: array + setTimeout flush when BATCH_SIZE or FLUSH_INTERVAL reached
T05 | Create BullMQ Queue 'device-state-storage' backed by redis-client
T06 | Wire flush(): storageQueue.add(batch, {attempts:3, backoff:{type:exponential,delay:1000}})
T07 | Create BullMQ Worker: SensorRawEvent[] → DeviceState docs → insertMany(ordered:false)
T08 | Filter source='rest' events in Worker (skip — REST controller already wrote to DB)
T09 | Add failed handler: log job data + failed reason (DLQ via BullMQ failed state)
T10 | Start storage worker in src/index.ts after natsClient.connect()
T11 | Add graceful shutdown: consumer.drain() + worker.close() + redisClient.quit()
T12 | Remove deviceStateService.create() from modbus-gateway-manager.service.ts
T13 | Remove deviceStateService.create() from opcua-gateway-manager.service.ts
T14 | Verify: simulator → NATS message count matches device_states insertMany count
T15 | Verify: REST POST /devices/:id/states still returns 201 with state object
