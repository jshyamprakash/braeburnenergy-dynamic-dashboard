# Feature Tasks: Gateway → NATS Publisher

T01 | Create src/lib/nats-client.ts with NatsClient singleton and SensorRawEvent interface
T02 | Add natsUrl to src/config/config.ts from NATS_URL env var
T03 | Connect natsClient in src/index.ts after MongoDB connects
T04 | Add drain(natsClient) to graceful shutdown in src/index.ts
T05 | Add setNatsClient() method to ModbusGatewayManagerService
T06 | Publish SensorRawEvent to sensor.raw.{deviceId} in Modbus poll loop (after DB write)
T07 | Add setNatsClient() method to OpcuaGatewayManager
T08 | Publish SensorRawEvent to sensor.raw.{deviceId} in OPC-UA poll loop (after DB write)
T09 | Import natsClient singleton in DeviceStateController
T10 | Publish SensorRawEvent fire-and-forget in DeviceStateController.create() (after DB write)
T11 | Inject natsClient into gateway managers in src/index.ts
T12 | Verify sensor_raw stream receives messages via nats stream info sensor_raw
T13 | Confirm REST POST /devices/:id/states response unchanged (200 + state object)
T14 | Confirm WebSocket broadcast still fires after REST ingest (no regression)
T15 | Delete smoke test scripts: test-redis.ts, test-nats.ts, test-bullmq.ts
