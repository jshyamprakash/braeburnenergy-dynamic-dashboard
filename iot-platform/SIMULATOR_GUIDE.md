# 🎮 Device Simulator & Dashboard Integration Guide

## Overview

This guide shows you how to connect the IoT Device Simulator to the Dashboard Builder to visualize real-time device data.

## Quick Start

### Step 1: Start the Backend API

```bash
cd apps/api
pnpm dev
```

The API should be running at `http://localhost:3001`

### Step 2: Start the Frontend

```bash
cd apps/web
pnpm dev
```

The dashboard should be running at `http://localhost:3000`

### Step 3: Start the Device Simulator

```bash
# From the project root
pnpm run simulate

# Or with custom options:
pnpm run simulate -- --devices 5 --interval 1s --anomalies
```

**Simulator Options:**
- `--devices <n>` - Number of devices to simulate (default: 3)
- `--interval <time>` - Update interval, e.g., `1s`, `500ms` (default: 2s)
- `--anomalies` - Enable random anomalies (spikes, drift)

### Step 4: Open the Dashboard Builder

1. Navigate to `http://localhost:3000/dashboard-builder`
2. Click **"Edit Dashboard"** to enter edit mode
3. Click **"Show Palette"** to see available blocks

## Creating Your First Real-Time Dashboard

### 1. Add a Gauge Block

1. Click **"Gauge"** in the Block Palette
2. A gauge block will appear on your dashboard
3. Click the **settings icon (⋮)** on the block
4. Select **"Edit Settings"**
5. In the configuration panel:
   - **Device**: Select one of your simulated devices
   - **Field**: Choose a field like "temperature", "pressure", or "humidity"
   - **Min/Max**: Adjust the gauge range
   - **Thresholds**: Set warning and critical thresholds
6. Watch the gauge update in real-time! 🎉

### 2. Add a Chart Block

1. Click **"Time-Series Chart"** in the Block Palette
2. Click the **settings icon (⋮)** → **"Edit Settings"**
3. Configure:
   - **Device**: Select a simulated device
   - **Chart Type**: Line, Area, or Bar
   - **Show Legend/Grid**: Toggle options
4. The chart will display historical data from the last 50 states

### 3. Add a Live Stream Block

1. Click **"Live Stream"** in the Block Palette
2. Click **settings icon (⋮)** → **"Edit Settings"**
3. Select a **Device** or leave empty for all devices
4. Watch real-time data streaming in!

## Device Profiles

The simulator creates devices with these profiles:

| Profile | Fields | Description |
|---------|--------|-------------|
| **Temperature Sensor** | temperature, humidity | 18-35°C, 40-80% |
| **Pressure Sensor** | pressure, temperature | 980-1020 hPa |
| **Air Quality Sensor** | co2, pm25, voc | CO2, PM2.5, VOC |
| **Energy Meter** | power, voltage, current | Power consumption |
| **Vibration Sensor** | vibration_x/y/z, temperature | 3-axis vibration |

## Tips & Tricks

### Keyboard Shortcuts
- **Delete** - Remove selected block
- **Ctrl+D** - Duplicate selected block
- **Esc** - Close configuration panel

### Best Practices
1. **Start Small**: Begin with 3-5 devices
2. **Save Often**: Click "Save Layout" to persist your dashboard
3. **Use Thresholds**: Set warning/critical thresholds on gauges for alerts
4. **Mix Block Types**: Combine gauges (current value) with charts (trends) and live streams (raw data)

### Troubleshooting

**No devices appearing in dropdown?**
- Ensure the simulator is running
- Check that the API is running on `http://localhost:3001`
- Refresh the page to reload device list

**No data updating?**
- Check browser console for errors
- Verify WebSocket connection (should see socket messages)
- Restart the simulator if devices aren't sending data

**Simulator not starting?**
- Ensure you're in the project root directory
- Run `cd scripts && pnpm install` to install dependencies
- Check that port 3001 is not in use

## Advanced Usage

### Custom Simulator Configuration

```bash
# High-frequency updates with anomalies
pnpm run simulate -- --devices 10 --interval 500ms --anomalies

# Slow updates for testing
pnpm run simulate -- --devices 2 --interval 5s

# Many devices
pnpm run simulate -- --devices 20 --interval 2s
```

### Connecting Multiple Dashboards

- Each dashboard has a unique ID (set in `dashboardId` prop)
- Layouts are saved separately per dashboard ID
- You can create multiple dashboard pages with different configurations

## Example Dashboard Layouts

### **Monitoring Dashboard**
- 3x Gauge blocks for temperature, pressure, humidity
- 1x Time-series chart showing trends over time
- 1x Live stream for raw data inspection

### **Industrial Dashboard**
- 4x Gauges for vibration sensors (x, y, z, temp)
- 2x Charts comparing multiple devices
- 1x Live stream for event monitoring

### **Energy Dashboard**
- 3x Gauges for power, voltage, current
- 1x Area chart showing power consumption over time
- Threshold alerts at 80% and 95% capacity

## Next Steps

1. ✅ Create your first dashboard with real data
2. ✅ Experiment with different block types
3. ✅ Try the keyboard shortcuts
4. ✅ Duplicate blocks to create similar monitors
5. ✅ Save your layout and reload the page to test persistence

Happy monitoring! 📊🚀
