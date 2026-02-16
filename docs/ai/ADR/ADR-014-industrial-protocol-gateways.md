# ADR-014: Industrial Protocol Gateway Architecture

## Status
Accepted (2026-02-13)

## Context
- Need integration with PLCs, SCADA systems, industrial sensors
- Requirements: Modbus TCP/RTU, OPC-UA, auto device registration
- Alternative: Direct device integration (no protocol abstraction)

## Decision
Implement gateway architecture for Modbus (IEC 61158) and OPC-UA (IEC 62541)

**Protocols:**
- Modbus: TCP + RTU, 4 register types, 5 data types
- OPC-UA: Endpoint + security modes (None/Sign/SignAndEncrypt)
- Auto device registration with scale/offset transformation
- ModbusClient/OpcuaClient for protocol ops, GatewayManager for pooling

## Consequences

### Positive
- Protocol abstraction (device-agnostic API)
- Auto device discovery (less manual config)
- Scale/offset conversion (raw → engineering units)
- Retry logic with exponential backoff
- Connection pooling for efficiency

### Negative
- Gateway lifecycle complexity
- Protocol-specific error handling
- Modbus RTU polling overhead (serial latency)
- No encryption for Modbus TCP
