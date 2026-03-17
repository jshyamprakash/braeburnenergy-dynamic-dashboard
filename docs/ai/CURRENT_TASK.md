# Current Task: Gateway → NATS Publisher

## Goal
Publish every raw device state reading to NATS stream sensor.raw.{deviceId}
from all three ingestion points (Modbus, OPC-UA, REST).
Dual-write strategy: keep existing MongoDB writes during transition.

## Scope
- New: src/lib/nats-client.ts (singleton NatsClient + SensorRawEvent type)
- Modify: src/config/config.ts (add natsUrl)
- Modify: src/index.ts (connect/drain natsClient; inject into gateways)
- Modify: src/services/modbus-gateway-manager.service.ts (setNatsClient + publish)
- Modify: src/services/opcua-gateway-manager.service.ts (setNatsClient + publish)
- Modify: src/controllers/device-state.controller.ts (publish fire-and-forget)

## Constraints
- REST response must NOT be blocked by NATS publish (fire-and-forget with .catch)
- Existing WebSocket broadcast and workflow dispatch unchanged
- No removal of direct MongoDB writes in this step
- NATS subject pattern: sensor.raw.{deviceId}
- Source field required: 'modbus' | 'opcua' | 'rest'

## Architectural Impact
Yes — introduces NATS JetStream as first production streaming dependency.
ADR-043 implementation begins here.

## Done When
nats stream info sensor_raw shows messages after device state ingestion
via Modbus poll, OPC-UA poll, and REST POST endpoint.
