# Device Simulator

Generate realistic IoT device data for testing and demonstrations.

## Quick Start

```bash
# From project root
pnpm run simulate

# Or from scripts directory  
cd scripts
pnpm run simulate
```

## Usage Examples

```bash
# Default: 3 devices, 2 second interval
pnpm run simulate

# 5 devices with 1 second updates
pnpm run simulate -- --devices 5 --interval 1s

# 10 devices with anomalies enabled
pnpm run simulate -- --devices 10 --interval 500ms --anomalies
```

## Device Profiles

- **Temperature Sensor**: temperature, humidity
- **Pressure Sensor**: pressure, temperature
- **Air Quality Sensor**: co2, pm25, voc
- **Energy Meter**: power, voltage, current
- **Vibration Sensor**: vibration_x/y/z, temperature

Generates realistic data with drift, noise, and optional anomalies.
