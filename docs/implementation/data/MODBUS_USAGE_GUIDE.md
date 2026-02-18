# Modbus Gateway Usage Guide

**Version:** 1.0
**Date:** 2026-02-13
**Audience:** System administrators, operators, integrators

---

## Overview

The Modbus Gateway enables the IoT platform to connect directly to industrial devices using Modbus TCP or Modbus RTU protocols. This guide covers setup, configuration, and troubleshooting.

### What is Modbus?

Modbus is an industry-standard communication protocol used in industrial automation. It's widely supported by PLCs, RTUs, sensors, and SCADA systems.

**Supported Variants:**
- **Modbus TCP** - Ethernet-based (most common in modern systems)
- **Modbus RTU** - Serial-based (RS-232, RS-485)

---

## Prerequisites

### Hardware Requirements
- **Modbus TCP**: Network connection to device (Ethernet)
- **Modbus RTU**: Serial port (USB-to-RS485 adapter, RS-232 cable)

### Software Requirements
- IoT Platform API running (http://localhost:3001)
- Network access to Modbus devices
- Device documentation (register addresses, data types)

### Information Needed
Before configuring a gateway, gather:
- Device IP address (TCP) or serial port (RTU)
- Modbus unit ID (slave ID)
- Register addresses and data types
- Scale factors and units

---

## Quick Start

### 1. Create a Modbus TCP Gateway

**Example: Temperature Sensor**

```bash
curl -X POST http://localhost:3001/modbus-gateways \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Water Treatment - Temperature Sensor",
    "description": "Main tank temperature monitoring",
    "protocol": "tcp",
    "connection": {
      "host": "192.168.1.100",
      "port": 502,
      "unitId": 1,
      "timeout": 5000,
      "retryDelay": 3000
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
        "unit": "°C"
      }
    ],
    "deviceMapping": {
      "autoRegister": true,
      "deviceIdPrefix": "MODBUS_",
      "defaultTags": ["modbus", "temperature"]
    }
  }'
```

### 2. Start the Gateway

```bash
# Get gateway ID from creation response
GATEWAY_ID="65c123..."

# Start polling
curl -X POST http://localhost:3001/modbus-gateways/$GATEWAY_ID/start
```

### 3. Monitor Data

```bash
# Check gateway status
curl http://localhost:3001/modbus-gateways/$GATEWAY_ID/status

# View auto-created device
curl http://localhost:3001/devices

# View device states (data)
curl http://localhost:3001/devices/DEVICE_ID/states
```

---

## Configuration Reference

### Connection Configuration

#### Modbus TCP
```json
{
  "host": "192.168.1.100",      // Device IP address
  "port": 502,                  // Modbus TCP port (standard: 502)
  "unitId": 1,                  // Modbus unit/slave ID (1-247)
  "timeout": 5000,              // Connection timeout in ms
  "retryDelay": 3000            // Retry delay in ms
}
```

#### Modbus RTU
```json
{
  "host": "/dev/ttyUSB0",       // Serial port
  "port": 502,                  // Not used for RTU
  "unitId": 1,                  // Modbus unit/slave ID
  "timeout": 5000,              // Connection timeout in ms
  "retryDelay": 3000,           // Retry delay in ms
  "baudRate": 9600,             // Serial baud rate
  "dataBits": 8,                // Data bits (7 or 8)
  "stopBits": 1,                // Stop bits (1 or 2)
  "parity": "none"              // Parity: none, even, odd
}
```

### Polling Configuration

```json
{
  "enabled": true,              // Enable automatic polling
  "interval": 5000,             // Polling interval in ms (min: 1000)
  "onError": "continue"         // Error behavior: continue | stop
}
```

**Polling Interval Guidelines:**
- **Fast (1-2 seconds)**: Critical alarms, emergency shutdowns
- **Normal (5-10 seconds)**: Standard monitoring (temperature, pressure)
- **Slow (30-60 seconds)**: Status checks, configuration reads

**Error Behavior:**
- **continue**: Log error, keep polling other registers
- **stop**: Stop all polling on error (requires manual restart)

### Register Configuration

#### Register Types

| Type | Access | Function Code | Use Case |
|------|--------|---------------|----------|
| **holding** | Read/Write | FC3, FC6, FC16 | Configuration, setpoints |
| **input** | Read-only | FC4 | Sensor readings, status |
| **coil** | Read/Write | FC1, FC5, FC15 | On/off controls |
| **discrete** | Read-only | FC2 | Switch states |

#### Data Types

| Data Type | Registers | Range | Example |
|-----------|-----------|-------|---------|
| **int16** | 1 | -32,768 to 32,767 | Temperature (-40°C to 120°C) |
| **uint16** | 1 | 0 to 65,535 | Pressure (0-1000 bar) |
| **int32** | 2 | -2.1B to 2.1B | Flow totalizer |
| **uint32** | 2 | 0 to 4.3B | Counter values |
| **float** | 2 | IEEE 754 | Precise measurements |
| **boolean** | 1 bit | true/false | Pump on/off |

#### Scale and Offset

**Scale**: Multiply raw value
```json
{
  "scale": 0.1,
  "comment": "Convert tenths to actual value (254 → 25.4)"
}
```

**Offset**: Add to scaled value
```json
{
  "scale": 0.1,
  "offset": -273.15,
  "comment": "Convert Kelvin to Celsius"
}
```

**Formula**: `finalValue = (rawValue * scale) + offset`

### Device Mapping

```json
{
  "autoRegister": true,          // Auto-create devices
  "deviceIdPrefix": "MODBUS_",   // Prefix for device names
  "defaultTags": ["modbus", "water-treatment"]
}
```

**Auto-Registration Behavior:**
- Creates device if not found: `{prefix}{registerName}`
- Example: `MODBUS_temperature`
- Adds metadata: gateway ID, register address, data type
- Tags: `modbus`, protocol, custom tags

---

## Common Use Cases

### Water Treatment Plant

**Scenario**: Monitor tank temperature, pH, and flow rate

```json
{
  "name": "Water Treatment - Main Tank",
  "protocol": "tcp",
  "connection": {
    "host": "192.168.1.100",
    "port": 502,
    "unitId": 1
  },
  "polling": {
    "enabled": true,
    "interval": 5000
  },
  "registers": [
    {
      "name": "tank_temperature",
      "address": 30001,
      "type": "input",
      "dataType": "int16",
      "scale": 0.1,
      "unit": "°C"
    },
    {
      "name": "tank_ph",
      "address": 30002,
      "type": "input",
      "dataType": "uint16",
      "scale": 0.01,
      "unit": "pH"
    },
    {
      "name": "flow_rate",
      "address": 30003,
      "type": "input",
      "dataType": "uint16",
      "scale": 0.1,
      "unit": "m³/h"
    }
  ]
}
```

### Manufacturing Line - PLC Integration

**Scenario**: Monitor production counters and machine status

```json
{
  "name": "Production Line 1 - PLC",
  "protocol": "tcp",
  "connection": {
    "host": "10.0.1.50",
    "port": 502,
    "unitId": 1
  },
  "polling": {
    "enabled": true,
    "interval": 2000
  },
  "registers": [
    {
      "name": "production_count",
      "address": 40001,
      "type": "holding",
      "dataType": "uint32",
      "unit": "units"
    },
    {
      "name": "machine_running",
      "address": 1,
      "type": "coil",
      "dataType": "boolean"
    },
    {
      "name": "alarm_active",
      "address": 10001,
      "type": "discrete",
      "dataType": "boolean"
    }
  ]
}
```

### Energy Meter - RTU Serial

**Scenario**: Read power consumption via RS-485

```json
{
  "name": "Building Energy Meter",
  "protocol": "rtu",
  "connection": {
    "host": "/dev/ttyUSB0",
    "unitId": 1,
    "baudRate": 9600,
    "dataBits": 8,
    "stopBits": 1,
    "parity": "even"
  },
  "polling": {
    "enabled": true,
    "interval": 10000
  },
  "registers": [
    {
      "name": "active_power",
      "address": 30001,
      "type": "input",
      "dataType": "float",
      "unit": "kW"
    },
    {
      "name": "energy_total",
      "address": 30003,
      "type": "input",
      "dataType": "float",
      "unit": "kWh"
    }
  ]
}
```

---

## Operations

### Start Gateway
```bash
POST /modbus-gateways/:id/start
```

**What Happens:**
1. Connects to Modbus device
2. Verifies connection
3. Starts polling scheduler
4. Creates/updates device states
5. Broadcasts data via WebSocket

### Stop Gateway
```bash
POST /modbus-gateways/:id/stop
```

**What Happens:**
1. Stops polling scheduler
2. Disconnects from device
3. Updates gateway status

### Test Connection
```bash
POST /modbus-gateways/:id/test
```

**What Happens:**
1. Attempts connection
2. Disconnects immediately
3. Returns success/failure

**Use Cases:**
- Verify device is reachable
- Test configuration before starting
- Troubleshoot connection issues

### Manual Register Read
```bash
POST /modbus-gateways/:id/read
{
  "registerName": "temperature"
}
```

**What Happens:**
1. Reads single register
2. Applies scale/offset
3. Returns current value

**Use Cases:**
- Verify register address
- Check data type conversion
- Debug scaling issues

---

## Troubleshooting

### Connection Failed

**Symptom**: `Failed to connect to Modbus device`

**Causes & Solutions:**

1. **Device not reachable**
   ```bash
   # Test network connectivity
   ping 192.168.1.100

   # Test Modbus port
   telnet 192.168.1.100 502
   ```

2. **Wrong unit ID**
   - Check device documentation
   - Common unit IDs: 1, 2, 247
   - Try unit ID 255 (broadcast)

3. **Firewall blocking**
   - Allow port 502 (Modbus TCP)
   - Check device firewall settings

4. **Wrong serial port (RTU)**
   ```bash
   # List serial ports
   ls /dev/tty*

   # Check permissions
   sudo chmod 666 /dev/ttyUSB0
   ```

### No Data Received

**Symptom**: Gateway connected but no device states created

**Causes & Solutions:**

1. **Wrong register address**
   - Verify address in device manual
   - Common: 30001 (input), 40001 (holding)
   - Some devices use 0-based addressing

2. **Wrong register type**
   - Try different type (holding vs input)
   - Check function code in manual

3. **Wrong data type**
   - Try uint16 first (most common)
   - Check if value looks reasonable

4. **Polling disabled**
   ```bash
   # Check gateway config
   curl http://localhost:3001/modbus-gateways/:id

   # Verify: "polling.enabled": true
   ```

### Incorrect Values

**Symptom**: Data received but values are wrong

**Causes & Solutions:**

1. **Scale factor needed**
   ```json
   {
     "scale": 0.1,
     "comment": "Value in tenths"
   }
   ```

2. **Offset needed**
   ```json
   {
     "offset": -273.15,
     "comment": "Kelvin to Celsius"
   }
   ```

3. **Wrong data type**
   - Try int16 if values seem negative
   - Try float for precise measurements

4. **Byte order (endianness)**
   - Contact support if values are garbled
   - May need custom conversion

### Polling Errors

**Symptom**: `Polling error for gateway...`

**Causes & Solutions:**

1. **Device slow to respond**
   ```json
   {
     "timeout": 10000,
     "comment": "Increase timeout to 10 seconds"
   }
   ```

2. **Too many registers**
   - Reduce polling frequency
   - Split into multiple gateways

3. **Network instability**
   - Enable retry logic
   - Check network quality

---

## Best Practices

### Security

1. **Network Segmentation**
   - Isolate Modbus devices on separate VLAN
   - Use firewall rules
   - Restrict access to IoT platform only

2. **Authentication**
   - Use Modbus TCP with authentication (if supported)
   - Secure serial connections physically

3. **Monitoring**
   - Monitor gateway connection status
   - Alert on connection failures
   - Log all configuration changes

### Performance

1. **Polling Intervals**
   - Don't poll faster than device can respond
   - Typical: 5-10 seconds
   - Critical alarms: 1-2 seconds

2. **Register Grouping**
   - Group consecutive registers
   - Reduces Modbus queries
   - Improves performance

3. **Error Handling**
   - Use `"onError": "continue"` for production
   - Monitor error rates
   - Alert on high error rates

### Reliability

1. **Device Registration**
   - Use auto-register for dynamic systems
   - Use explicit deviceId for critical devices
   - Include metadata for traceability

2. **Data Quality**
   - Validate register ranges
   - Check for sensor drift
   - Implement quality flags

3. **Backup Configuration**
   - Export gateway configurations
   - Store in version control
   - Document register mappings

---

## API Reference

### Interactive Documentation
**URL**: http://localhost:3001/docs
**Section**: "Modbus" tag

### Quick Reference

```bash
# Create gateway
POST /modbus-gateways
Body: { gateway config }

# List gateways
GET /modbus-gateways?protocol=tcp&status=connected

# Get gateway
GET /modbus-gateways/:id

# Update gateway
PATCH /modbus-gateways/:id
Body: { updates }

# Delete gateway
DELETE /modbus-gateways/:id

# Start polling
POST /modbus-gateways/:id/start

# Stop polling
POST /modbus-gateways/:id/stop

# Test connection
POST /modbus-gateways/:id/test

# Get status
GET /modbus-gateways/:id/status

# Read register
POST /modbus-gateways/:id/read
Body: { "registerName": "temperature" }
```

---

## Support

### Additional Resources
- **Design Document**: `docs/MODBUS_GATEWAY_DESIGN.md`
- **Implementation Status**: `docs/MODBUS_IMPLEMENTATION_STATUS.md`
- **Modbus Specification**: https://modbus.org/specs.php

### Getting Help
1. Check API docs: http://localhost:3001/docs
2. Review device manual for register addresses
3. Test connection with `modbus-cli` tool
4. Enable debug logging in API server

---

**Last Updated:** 2026-02-13
**Version:** 1.0
**Status:** Production Ready
