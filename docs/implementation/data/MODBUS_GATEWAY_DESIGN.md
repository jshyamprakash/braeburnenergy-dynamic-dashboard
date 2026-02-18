# Modbus Gateway Design

**Date:** 2026-02-13
**Status:** Implementation in Progress
**Phase:** 3.1 - Industrial Protocol Gateway (Modbus)

---

## Overview

The Modbus Gateway enables the IoT platform to connect directly to industrial devices (PLCs, RTUs, sensors) using the Modbus TCP and Modbus RTU protocols. This eliminates the need for separate edge gateways and enables direct device integration.

### Key Features
- ✅ Modbus TCP and Modbus RTU support
- ✅ Connection pooling and management
- ✅ Configurable polling intervals
- ✅ Automatic device registration
- ✅ Register-to-device-state mapping
- ✅ Error handling and reconnection logic
- ✅ Real-time data streaming via WebSocket

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     IoT Platform (Node.js)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         ModbusGatewayManager Service                        │ │
│  │  • Connection pooling                                       │ │
│  │  • Polling scheduler                                        │ │
│  │  • Data mapping                                             │ │
│  └─────────────────┬──────────────────────────────────────────┘ │
│                    │                                             │
│  ┌─────────────────▼──────────────────────────────────────────┐ │
│  │         ModbusClient Service (modbus-serial)                │ │
│  │  • Connect/disconnect                                       │ │
│  │  • Read holding registers (FC3)                             │ │
│  │  • Read input registers (FC4)                               │ │
│  │  • Write registers (FC6, FC16)                              │ │
│  └─────────────────┬──────────────────────────────────────────┘ │
└────────────────────┼──────────────────────────────────────────────┘
                     │ Modbus TCP/RTU
┌────────────────────▼──────────────────────────────────────────────┐
│                   Industrial Devices                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   PLC        │  │   RTU        │  │   Sensor     │           │
│  │   (TCP)      │  │   (RTU)      │  │   (TCP)      │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└───────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### ModbusGateway Schema

```typescript
{
  _id: ObjectId,                    // Gateway ID
  orgId: ObjectId,                  // Organization (multi-tenancy)
  name: string,                     // Gateway name (e.g., "Plant 1 PLC Gateway")
  description?: string,             // Optional description
  protocol: 'tcp' | 'rtu',          // Modbus protocol

  // Connection Configuration
  connection: {
    host: string,                   // IP address (TCP) or serial port (RTU)
    port: number,                   // Port (default: 502 for TCP)
    unitId: number,                 // Modbus unit/slave ID (default: 1)
    timeout: number,                // Connection timeout in ms (default: 5000)
    retryDelay: number,             // Retry delay in ms (default: 3000)

    // RTU-specific
    baudRate?: number,              // Baud rate (RTU only, default: 9600)
    dataBits?: number,              // Data bits (RTU only, default: 8)
    stopBits?: number,              // Stop bits (RTU only, default: 1)
    parity?: 'none' | 'even' | 'odd', // Parity (RTU only, default: 'none')
  },

  // Polling Configuration
  polling: {
    enabled: boolean,               // Enable/disable polling
    interval: number,               // Polling interval in ms (default: 5000)
    onError: 'continue' | 'stop',   // Behavior on error (default: 'continue')
  },

  // Register Mappings
  registers: [{
    name: string,                   // Register name (e.g., "temperature")
    address: number,                // Register address (0-65535)
    type: 'holding' | 'input' | 'coil' | 'discrete', // Register type
    dataType: 'int16' | 'uint16' | 'int32' | 'uint32' | 'float' | 'boolean', // Data type
    scale?: number,                 // Scale factor (e.g., 0.1 for temp in tenths)
    offset?: number,                // Offset (e.g., -273.15 for Kelvin to Celsius)
    unit?: string,                  // Unit (e.g., "°C", "bar", "m³/h")
    deviceId?: string,              // Target device ID (ULID) - optional
  }],

  // Device Mapping
  deviceMapping: {
    autoRegister: boolean,          // Automatically create devices
    deviceIdPrefix?: string,        // Prefix for auto-generated device IDs
    defaultTags?: string[],         // Default tags for auto-created devices
  },

  // Status
  status: 'connected' | 'disconnected' | 'error', // Connection status
  lastConnected?: Date,             // Last successful connection
  lastError?: string,               // Last error message

  // Audit fields
  createdAt: Date,
  updatedAt: Date,
  createdBy?: ObjectId,             // User who created the gateway
}
```

---

## Register Types & Function Codes

| Register Type | Function Code | Access | Description |
|--------------|---------------|--------|-------------|
| **Holding Register** | FC3 (Read), FC6/FC16 (Write) | Read/Write | General-purpose registers for configuration and data |
| **Input Register** | FC4 (Read) | Read-only | Sensor readings, status values |
| **Coil** | FC1 (Read), FC5/FC15 (Write) | Read/Write | Single-bit values (on/off) |
| **Discrete Input** | FC2 (Read) | Read-only | Single-bit status (switch states) |

---

## Data Type Mappings

| Data Type | Registers | Bytes | Range |
|-----------|-----------|-------|-------|
| **int16** | 1 | 2 | -32,768 to 32,767 |
| **uint16** | 1 | 2 | 0 to 65,535 |
| **int32** | 2 | 4 | -2,147,483,648 to 2,147,483,647 |
| **uint32** | 2 | 4 | 0 to 4,294,967,295 |
| **float** | 2 | 4 | IEEE 754 single-precision |
| **boolean** | 1 (coil/discrete) | 1 bit | true/false |

---

## API Endpoints

### Gateway Management

```
POST   /modbus-gateways              Create new gateway
GET    /modbus-gateways              List all gateways (pagination)
GET    /modbus-gateways/:id          Get gateway by ID
PATCH  /modbus-gateways/:id          Update gateway configuration
DELETE /modbus-gateways/:id          Delete gateway

POST   /modbus-gateways/:id/start    Start gateway polling
POST   /modbus-gateways/:id/stop     Stop gateway polling
POST   /modbus-gateways/:id/test     Test connection
GET    /modbus-gateways/:id/status   Get current status

POST   /modbus-gateways/:id/read     Manual register read
POST   /modbus-gateways/:id/write    Manual register write
```

---

## Data Flow

### 1. Gateway Creation
```
User → API → ModbusGateway.create() → MongoDB
```

### 2. Gateway Start (Polling)
```
User → API → ModbusGatewayManager.start(gatewayId)
  ↓
ModbusClient.connect(config)
  ↓
setInterval(() => {
  for each register mapping:
    data = ModbusClient.readRegister(address, type)
    value = applyScaleAndOffset(data)
    DeviceState.create({ deviceId, data: { [name]: value } })
    WebSocket.emit('device:state:update')
}, pollingInterval)
```

### 3. Gateway Stop
```
User → API → ModbusGatewayManager.stop(gatewayId)
  ↓
clearInterval(pollingJob)
  ↓
ModbusClient.disconnect()
```

---

## Error Handling

### Connection Errors
- **Retry Logic:** Automatically retry connection with exponential backoff
- **Max Retries:** 5 attempts before marking as `status: 'error'`
- **Notification:** WebSocket event `modbus:gateway:error`

### Polling Errors
- **On Error:** Log error, continue polling (default)
- **Alternative:** Stop polling on error (configurable)

### Data Validation
- **Range Check:** Validate register data is within expected range
- **Quality Flag:** Mark data as `questionable` if validation fails

---

## Example Configuration

### Temperature Sensor (Modbus TCP)

```json
{
  "name": "Water Treatment Plant - Temperature Sensor",
  "protocol": "tcp",
  "connection": {
    "host": "192.168.1.100",
    "port": 502,
    "unitId": 1,
    "timeout": 5000
  },
  "polling": {
    "enabled": true,
    "interval": 5000,
    "onError": "continue"
  },
  "registers": [
    {
      "name": "temperature",
      "address": 30001,
      "type": "input",
      "dataType": "int16",
      "scale": 0.1,
      "unit": "°C",
      "deviceId": "01HGW5N8XZ7KQRST9VW2XY3Z4A"
    },
    {
      "name": "pressure",
      "address": 30002,
      "type": "input",
      "dataType": "uint16",
      "scale": 0.01,
      "unit": "bar",
      "deviceId": "01HGW5N8XZ7KQRST9VW2XY3Z4A"
    }
  ],
  "deviceMapping": {
    "autoRegister": true,
    "deviceIdPrefix": "MODBUS_",
    "defaultTags": ["modbus", "water-treatment"]
  }
}
```

---

## Performance Considerations

### Connection Pooling
- Reuse connections across polling cycles
- Maximum 100 concurrent connections per gateway manager
- Connection timeout: 5 seconds

### Polling Optimization
- Minimum interval: 1 second (prevent flooding)
- Batch register reads when possible (consecutive registers)
- Async polling (non-blocking)

### Data Rate
- Expected: 100-1000 registers/second per gateway
- Maximum: 5000 registers/second (with batch reads)

---

## Security

### Network Security
- ✅ Firewall rules (allow only IoT platform IP)
- ✅ VPN for remote Modbus devices
- ❌ Modbus has no built-in encryption (use VPN/IPSec)

### Access Control
- ✅ Organization-scoped gateways (multi-tenancy)
- ✅ Role-based access control (Admin, Operator, Viewer)
- ✅ Audit logging for all gateway operations

---

## Testing Strategy

### Unit Tests
- ModbusClient.connect/disconnect
- ModbusClient.readRegister (all types)
- Data type conversions (int16, uint16, float, etc.)
- Scale and offset calculations

### Integration Tests
- Gateway CRUD API endpoints
- Start/stop polling
- Test connection
- Manual read/write operations

### E2E Tests
- Use modbus-serial simulator
- Simulate PLC with mock registers
- Verify data flows to device states
- Verify WebSocket notifications

---

## Implementation Phases

### Phase 1: Core Gateway (Current)
- [x] Install modbus-serial
- [ ] Create ModbusGateway model
- [ ] Create ModbusClient service
- [ ] Create ModbusGatewayManager service
- [ ] Create API routes and controllers
- [ ] Integration tests

### Phase 2: Advanced Features (Future)
- [ ] Batch register reads (optimize performance)
- [ ] Write register support (control devices)
- [ ] Connection pooling
- [ ] Register mapping templates (common PLCs)
- [ ] Frontend UI for gateway management

### Phase 3: Production Hardening (Future)
- [ ] Load testing (1000+ registers/second)
- [ ] Failover and high availability
- [ ] Performance monitoring
- [ ] Alerting on connection failures

---

## References

- **Modbus Protocol:** https://modbus.org/docs/Modbus_Application_Protocol_V1_1b3.pdf
- **modbus-serial Library:** https://github.com/yaacov/node-modbus-serial
- **IEC 61158:** Modbus TCP standard
- **Water Treatment SCADA:** Common Modbus use case

---

**Status:** Ready to implement Phase 1
**Next:** Create ModbusGateway Mongoose model
