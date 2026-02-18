# IoT Platform User Guide

Welcome to the IoT Platform! This guide will help you get started with managing IoT devices, ingesting telemetry data, and building real-time dashboards.

---

## Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [Device Management](#device-management)
3. [Data Ingestion](#data-ingestion)
4. [Dashboard Builder](#dashboard-builder)
5. [Device Simulator](#device-simulator)
6. [API Documentation](#api-documentation)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start Guide

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20+ ([download](https://nodejs.org/))
- **pnpm** 8+ (`npm install -g pnpm`)
- **MongoDB** 8+ with replica set configured
- **Git** for cloning the repository

### Quick Start (5 minutes)

1. **Clone and Install:**
   ```bash
   cd iot-platform
   pnpm install
   ```

2. **Configure MongoDB:**
   ```bash
   # Verify MongoDB replica set is running
   mongosh --port 27018 --eval "rs.status().ok"
   # Should return: 1

   # If not, see DEPLOYMENT.md for replica set setup
   ```

3. **Start the Platform:**
   ```bash
   # Terminal 1: Start API server
   cd apps/api
   pnpm dev
   # Wait for: ✅ MongoDB connected

   # Terminal 2: Start Web UI
   cd apps/web
   pnpm dev
   # Wait for: ✓ Ready on http://localhost:3000
   ```

4. **Open Your Browser:**
   - Navigate to **http://localhost:3000**
   - You should see the IoT Platform home page

---

## Device Management

### Creating Your First Device

1. **Navigate to Devices:**
   - Click "Devices" in the navigation menu
   - Or go to http://localhost:3000/devices

2. **Click "Create Device":**
   - A modal dialog will appear

3. **Fill in Device Details:**
   - **Name:** `Temperature Sensor 01` (required)
   - **Tags:** `warehouse`, `floor-1` (press Enter after each tag)
   - **Attributes:** Optional JSON metadata
     ```json
     {
       "location": "Zone A",
       "model": "DHT22"
     }
     ```

4. **Submit:**
   - Click "Create Device"
   - A success toast notification will appear
   - Your device now has a unique Device ID (ULID format, 26 characters)

### Viewing Device Details

1. **Click on a device** in the list
2. The device detail page shows:
   - Device metadata (ID, name, tags, attributes)
   - Recent telemetry data (last 10 states)
   - Real-time updates (via WebSocket)

### Updating a Device

1. Click "Edit Device" button on the detail page
2. Modify any fields (name, tags, attributes)
3. Click "Save Changes"

### Deleting a Device

1. Click "Delete Device" button
2. Confirm the deletion
3. All associated telemetry data will be permanently removed

---

## Data Ingestion

### Manual Data Upload (REST API)

Send telemetry data via HTTP POST:

```bash
curl -X POST http://localhost:3001/devices/YOUR_DEVICE_ID/states \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "temperature": 23.5,
      "humidity": 45,
      "pressure": 1013.25
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "deviceId": "YOUR_DEVICE_ID",
    "data": { "temperature": 23.5, "humidity": 45, "pressure": 1013.25 },
    "timestamp": "2026-02-12T10:30:00.000Z"
  }
}
```

### Bulk Data Upload

Send multiple states in a single request:

```bash
curl -X POST http://localhost:3001/states/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "states": [
      {
        "deviceId": "DEVICE_1",
        "data": { "temperature": 23.5 }
      },
      {
        "deviceId": "DEVICE_2",
        "data": { "pressure": 1013 }
      }
    ]
  }'
```

---

## Dashboard Builder

The Dashboard Builder lets you create custom dashboards with drag-and-drop blocks.

### Accessing the Dashboard Builder

- Navigate to http://localhost:3000/dashboard-builder
- Or use the demo at http://localhost:3000/dashboard-demo

### Adding Blocks

1. **Enable Edit Mode:**
   - Click the "Edit" toggle button in the top-right corner

2. **Choose a Block Type:**
   - **Gauge Block:** Circular radial gauge for single values
   - **Time-Series Chart:** Historical data with line/area/bar charts
   - **Live Stream:** Real-time data feed with JSON view

3. **Click "Add to Dashboard":**
   - The block appears in the grid

### Configuring Blocks

#### Gauge Block Configuration

1. Click the block to open the configuration panel
2. Set the following:
   - **Device ID:** Select from dropdown or enter manually
   - **Field:** The data field to visualize (e.g., `temperature`)
   - **Label:** Display name (e.g., `Temperature`)
   - **Unit:** Measurement unit (e.g., `°C`)
   - **Min/Max:** Value range for the gauge scale
   - **Warning/Critical Thresholds:** Color-coded alerts

**Example Configuration:**
```
Device ID: 01KH838SB8PQ8H7XTDJ81KDQ1E
Field: temperature
Label: Temperature
Unit: °C
Min: 0
Max: 50
Warning: 30
Critical: 40
```

#### Time-Series Chart Configuration

1. Click the block to open configuration
2. Set the following:
   - **Device ID:** Source device
   - **Fields:** Comma-separated list (e.g., `temperature,humidity`)
   - **Chart Type:** line, area, or bar
   - **Time Range:** 1h, 6h, 24h, 7d, 30d
   - **Bucket Interval:** 1m, 5m, 15m, 1h, 6h, 1d
   - **Aggregation:** avg, min, max, sum, count

**Example Configuration:**
```
Device ID: 01KH838SB8PQ8H7XTDJ81KDQ1E
Fields: temperature, humidity
Chart Type: line
Time Range: 6h
Bucket: 5m
Aggregation: avg
```

#### Live Stream Block Configuration

1. Click the block to open configuration
2. Set the following:
   - **Device ID:** Source device
   - **Fields:** (Optional) Filter specific fields
   - **Buffer Size:** Number of records to display (default: 50)

**Features:**
- Pause/Resume button to stop real-time updates
- Auto-scroll to latest data
- Collapsible raw JSON view
- Export to CSV button

### Managing Layout

**Resize Blocks:**
- Hover over the bottom-right corner
- Drag to resize

**Reposition Blocks:**
- Drag the block header to move it

**Remove Blocks:**
- Click the "×" button in the block header

### Saving Your Dashboard

1. Click "Save Dashboard" (when in edit mode)
2. The layout is automatically saved to localStorage
3. It will restore when you reload the page

### Exiting Edit Mode

1. Click the "Edit" toggle to disable edit mode
2. The layout is locked and blocks can't be moved
3. This prevents accidental changes during monitoring

---

## Device Simulator

The Device Simulator generates realistic telemetry data for testing.

### Running the Simulator

```bash
# From the project root
pnpm run simulate
```

**Options:**
```bash
# Simulate 5 devices with 1-second interval
pnpm run simulate -- --devices 5 --interval 1s

# Simulate 10 devices with 5-second interval
pnpm run simulate -- --devices 10 --interval 5s

# Stop with Ctrl+C
```

### Device Profiles

The simulator includes 5 realistic device profiles:

1. **Temperature Sensor**
   - Fields: `temperature`, `humidity`
   - Range: 18-30°C, 30-70% humidity
   - Drift: ±2°C over time
   - Anomalies: Occasional spikes

2. **Pressure Sensor**
   - Field: `pressure`
   - Range: 980-1040 hPa
   - Noise: ±5 hPa random variation

3. **Air Quality Sensor**
   - Fields: `pm25`, `pm10`, `co2`, `voc`
   - Ranges: PM2.5 (0-150 μg/m³), CO2 (400-2000 ppm)
   - Anomalies: Pollution events

4. **Energy Meter**
   - Fields: `voltage`, `current`, `power`, `energy`
   - Ranges: 220-240V, 0-10A
   - Calculated power and cumulative energy

5. **Vibration Sensor**
   - Fields: `vibrationX`, `vibrationY`, `vibrationZ`, `frequency`
   - Range: 0-10 mm/s RMS, 0-200 Hz
   - Anomalies: Occasional high-frequency events

### Simulator Behavior

- **Auto-Registration:** Devices are automatically created if they don't exist
- **Continuous Transmission:** Data is sent at the specified interval
- **Realistic Patterns:** Includes drift, noise, and occasional anomalies
- **WebSocket Broadcasting:** Real-time updates to connected dashboards

### Viewing Simulator Data

1. Start the simulator
2. Open the Dashboard Builder
3. Create a Live Stream Block with any device ID from the simulator
4. Watch data appear in real-time

---

## API Documentation

### REST Endpoints

The platform provides a comprehensive REST API for all operations.

**Interactive API Documentation:**
- Swagger UI: http://localhost:3001/docs
- OpenAPI Spec: http://localhost:3001/docs/json

### Key Endpoint Categories

#### Devices
- `POST /devices` - Create device
- `GET /devices` - List devices (paginated)
- `GET /devices/:deviceId` - Get device details
- `PATCH /devices/:deviceId` - Update device
- `DELETE /devices/:deviceId` - Delete device

#### Device States
- `POST /devices/:deviceId/states` - Ingest single state
- `POST /states/bulk` - Bulk ingest
- `GET /devices/:deviceId/states` - List states (with filtering)
- `GET /devices/:deviceId/states/latest` - Get latest state
- `GET /devices/:deviceId/states/aggregate` - Time-series aggregation
- `GET /devices/:deviceId/states/statistics` - Statistical summary

#### Organizations (Multi-Tenancy)
- `POST /organizations` - Create organization
- `GET /organizations` - List organizations
- `GET /organizations/:orgId` - Get organization
- `PATCH /organizations/:orgId` - Update organization
- `DELETE /organizations/:orgId` - Delete organization

### WebSocket Events

**Connection:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

// Listen for device state updates
socket.on('device:state', (data) => {
  console.log('New state:', data);
  // { deviceId, data, timestamp }
});
```

**Event Types:**
- `device:state` - Emitted when new telemetry data is ingested
- `connect` - Socket connection established
- `disconnect` - Socket disconnected

---

## Troubleshooting

### MongoDB Connection Issues

**Error:** `MongoServerError: This node was not started with replication enabled`

**Solution:**
```bash
# Check if replica set is configured
mongosh --port 27018 --eval "rs.status()"

# If not initialized, run:
mongosh --port 27018 --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27018'}]})"
```

### Time Series Collection Errors

**Error:** `Cannot create time series collection without replica set`

**Solution:** MongoDB Time Series Collections require a replica set. See DEPLOYMENT.md for setup instructions.

### Frontend Not Loading

1. **Check API is running:**
   ```bash
   curl http://localhost:3001/health
   # Should return: {"status":"ok",...}
   ```

2. **Check Next.js is running:**
   ```bash
   curl http://localhost:3000
   # Should return HTML
   ```

3. **Clear browser cache** and reload

### Real-Time Updates Not Working

1. **Check WebSocket connection** in browser DevTools:
   - Network tab → WS filter
   - Should see connection to `ws://localhost:3001`

2. **Verify CORS settings** in `apps/api/.env`:
   ```
   WS_CORS_ORIGIN=http://localhost:3000
   ```

3. **Restart both servers** to reload configuration

### Dashboard Not Saving

- Dashboard layouts are saved to **localStorage**
- Check browser settings allow localStorage
- Try in an incognito window to test
- Check browser console for errors

---

## Next Steps

Now that you're familiar with the basics, explore these advanced features:

1. **Multi-Tenancy:** Create multiple organizations and scope devices
2. **Advanced Querying:** Use time-range filtering and aggregation endpoints
3. **Custom Integrations:** Build your own data ingestion pipelines
4. **Production Deployment:** See DEPLOYMENT.md for production setup

---

## Additional Resources

- **Architecture Guide:** `docs/ARCHITECTURE.md`
- **API Reference:** http://localhost:3001/docs
- **Deployment Guide:** `DEPLOYMENT.md`
- **Docker Setup:** `DOCKER.md`
- **GitHub Repository:** https://github.com/[your-org]/iot-platform

---

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review the logs: `apps/api` console output
- Open an issue on GitHub

---

**Happy Monitoring! 📊🚀**
