# Current Decisions: Gateway → NATS Publisher Implementation

## Summary
Implemented dual-write NATS publishing for all device state ingestion points:
Modbus polling, OPC-UA polling, and REST API. Completes first phase of ADR-043
production streaming architecture. Maintains all existing MongoDB writes.

## Technical Changes

### 1. NATS Client (src/lib/nats-client.ts)
- NatsClient class: singleton pattern with connect/publish/drain methods
- SensorRawEvent interface: source field (modbus|opcua|rest), quality metadata
- Uses nats library v2.29.3 (already in package.json)

### 2. Config Extension (src/config/config.ts)
- Added nats.url from NATS_URL env var (default: localhost:4222)
- Exported nats config for module access

### 3. Application Bootstrap (src/index.ts)
- After MongoDB connects: await natsClient.connect(config.nats.url)
- After gateway manager setup: setNatsClient(natsClient) for both managers
- Graceful shutdown: await natsClient.drain() in signal handlers

### 4. Modbus Gateway (src/services/modbus-gateway-manager.service.ts)
- Added private natsClient field and setNatsClient() method
- After deviceStateService.create() in polling loop:
  Publishes SensorRawEvent to sensor.raw.{deviceId} (fire-and-forget)
- Filters out _unit fields (same as workflow dispatch)

### 5. OPC-UA Gateway (src/services/opcua-gateway-manager.service.ts)
- Added private natsClient field and setNatsClient() method
- After deviceStateService.create() in polling loop:
  Publishes SensorRawEvent to sensor.raw.{deviceId} (fire-and-forget)
- Includes quality metadata from data quality service

### 6. Device State Controller (src/controllers/device-state.controller.ts)
- Imported natsClient singleton
- After deviceStateService.create() in REST endpoint:
  Fire-and-forget publish (response NOT blocked by NATS)
- Uses request.log.warn for failure logging (non-critical)

## Behavioral Guarantees

1. **Non-blocking REST responses:** NATS publish is fire-and-forget with .catch()
2. **MongoDB dual-write:** All existing device state writes unchanged
3. **No workflow/WebSocket regression:** Existing dispatch logic unchanged
4. **Subject pattern:** sensor.raw.{deviceId} for all sources
5. **Fire-and-forget semantics:** Failures logged but not fatal

## Compliance & Architecture

- Aligns with ADR-043: Production Streaming Architecture (NATS JetStream)
- First implementation of streaming bus (replaces future Socket.io at scale)
- Quality metadata preserved from data quality service
- Source attribution enables stream consumer routing
- Graceful shutdown ensures message drains before termination

## Testing Vectors

Run after code deploy:
1. `nats stream info sensor_raw` — should exist with messages
2. REST POST /devices/:id/states — response unblocked (< 100ms)
3. Modbus polling — check NATS message count increases every interval
4. OPC-UA polling — same as Modbus
5. WebSocket broadcast still fires (separate integration test)
