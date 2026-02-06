# API Testing Guide

Quick reference for testing the IoT Platform API endpoints.

## Start the Server

```bash
# Development mode (auto-reload)
pnpm dev

# Production mode
pnpm build
pnpm start
```

Server will start on:
- HTTP API: http://localhost:3001
- WebSocket: ws://localhost:3001/ws

## Health Check Endpoints

```bash
# Basic health check
curl http://localhost:3001/health

# Readiness check (verifies database)
curl http://localhost:3001/health/ready

# Liveness check
curl http://localhost:3001/health/live
```

## Device Endpoints

### Create Device
```bash
curl -X POST http://localhost:3001/devices \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Temperature Sensor",
    "tags": ["warehouse", "floor-1"],
    "attributes": {
      "location": "Zone A",
      "manufacturer": "Acme Corp"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "deviceId": "01HGW5N8XZ7KQRST9VW2XY3Z4A",
    "name": "Temperature Sensor",
    "tags": ["warehouse", "floor-1"],
    "attributes": { "location": "Zone A" },
    "createdAt": "2026-02-05T10:00:00.000Z",
    "updatedAt": "2026-02-05T10:00:00.000Z"
  }
}
```

### Get Device
```bash
curl http://localhost:3001/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A
```

### List Devices
```bash
# Basic list
curl http://localhost:3001/devices

# With filters
curl "http://localhost:3001/devices?tags=warehouse,floor-1&limit=50&sortBy=createdAt&sortOrder=desc"

# Search by name
curl "http://localhost:3001/devices?search=sensor&limit=20"
```

### Update Device
```bash
curl -X PATCH http://localhost:3001/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Temperature Sensor",
    "tags": ["warehouse", "floor-1", "zone-a"]
  }'
```

### Delete Device
```bash
curl -X DELETE http://localhost:3001/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A
```

### Search by Tags
```bash
curl "http://localhost:3001/devices/search/tags?tags=warehouse,production&limit=100"
```

### Get Device Count
```bash
curl http://localhost:3001/devices/stats/count

# With tag filter
curl "http://localhost:3001/devices/stats/count?tags=warehouse"
```

### Get Recent Devices
```bash
curl "http://localhost:3001/devices/recent?limit=20"
```

## Device State Endpoints

### Create Device State
```bash
curl -X POST http://localhost:3001/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A/states \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "temperature": 23.5,
      "humidity": 45,
      "battery": 87
    },
    "timestamp": "2026-02-05T10:00:00Z"
  }'
```

### Bulk Create States
```bash
curl -X POST http://localhost:3001/states/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "states": [
      {
        "deviceId": "01HGW5N8XZ7KQRST9VW2XY3Z4A",
        "data": { "temperature": 23.5, "humidity": 45 },
        "timestamp": "2026-02-05T10:00:00Z"
      },
      {
        "deviceId": "01HGW5N8XZ7KQRST9VW2XY3Z4A",
        "data": { "temperature": 24.1, "humidity": 46 },
        "timestamp": "2026-02-05T10:05:00Z"
      }
    ]
  }'
```

### Get Device States
```bash
# Basic list
curl http://localhost:3001/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A/states

# With time range
curl "http://localhost:3001/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A/states?startTime=2026-02-01T00:00:00Z&endTime=2026-02-05T23:59:59Z&limit=1000"

# With pagination
curl "http://localhost:3001/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A/states?limit=100&offset=0&sortOrder=desc"
```

### Get Latest State
```bash
curl http://localhost:3001/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A/states/latest
```

### Aggregate States (TimescaleDB)
```bash
curl "http://localhost:3001/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A/states/aggregate?startTime=2026-02-01T00:00:00Z&endTime=2026-02-05T23:59:59Z&bucket=1h&fields=temperature,humidity&functions=avg,min,max"
```

### Get Statistics
```bash
curl "http://localhost:3001/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A/states/statistics?field=temperature&startTime=2026-02-01T00:00:00Z&endTime=2026-02-05T23:59:59Z"
```

### Get State Count
```bash
curl http://localhost:3001/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A/states/count

# With time range
curl "http://localhost:3001/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A/states/count?startTime=2026-02-01T00:00:00Z&endTime=2026-02-05T23:59:59Z"
```

### Delete Old States
```bash
curl -X DELETE "http://localhost:3001/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A/states/old?beforeDate=2026-01-01T00:00:00Z"
```

## WebSocket Connection

### JavaScript/TypeScript Client

```typescript
import { io } from 'socket.io-client';

// Connect to WebSocket server
const socket = io('http://localhost:3001', {
  path: '/ws',
  transports: ['websocket', 'polling'],
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

// Subscribe to a specific device
socket.emit('subscribe:device', '01HGW5N8XZ7KQRST9VW2XY3Z4A');

// Listen for device state updates
socket.on('device:state', (update) => {
  console.log('State update:', update);
  // {
  //   deviceId: "01HGW5N8XZ7KQRST9VW2XY3Z4A",
  //   data: { temperature: 23.5, humidity: 45 },
  //   timestamp: "2026-02-05T10:00:00.000Z"
  // }
});

// Listen for device status updates
socket.on('device:status', (update) => {
  console.log('Status update:', update);
  // {
  //   deviceId: "01HGW5N8XZ7KQRST9VW2XY3Z4A",
  //   status: "online",
  //   timestamp: "2026-02-05T10:00:00.000Z"
  // }
});

// Subscribe to all devices
socket.emit('subscribe:all');

// Unsubscribe from device
socket.emit('unsubscribe:device', '01HGW5N8XZ7KQRST9VW2XY3Z4A');

// Ping/Pong health check
socket.emit('ping');
socket.on('pong', (data) => {
  console.log('Pong received:', data.timestamp);
});
```

### Browser Console

```javascript
// Quick test in browser console
const socket = io('http://localhost:3001', { path: '/ws' });

socket.on('connect', () => console.log('Connected!'));
socket.emit('subscribe:device', '01HGW5N8XZ7KQRST9VW2XY3Z4A');
socket.on('device:state', console.log);
```

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": { /* optional error details */ }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ /* items */ ],
  "pagination": {
    "total": 1000,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

## Environment Variables

Create `.env` file in `apps/api/`:

```env
# Server
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# Database
DATABASE_URL="postgresql://shyamprakashj:root@localhost:5432/iot_platform?schema=public"

# CORS
CORS_ORIGIN=http://localhost:3000
CORS_CREDENTIALS=true

# WebSocket
WS_PORT=3002
WS_CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

## Testing Tools

### Using HTTPie
```bash
# Install HTTPie
sudo apt install httpie

# Create device
http POST localhost:3001/devices name="Sensor 1" tags:='["warehouse"]'

# Get device
http GET localhost:3001/devices/01HGW5N8XZ7KQRST9VW2XY3Z4A
```

### Using Postman

Import collection:
1. Base URL: `http://localhost:3001`
2. Add endpoints from this guide
3. Set headers: `Content-Type: application/json`

## Troubleshooting

### Server won't start
```bash
# Check if port is in use
lsof -i :3001

# Kill process on port
kill -9 $(lsof -t -i:3001)
```

### Database connection errors
```bash
# Test database connection
psql -d iot_platform -c "SELECT version();"

# Check Prisma connection
pnpm prisma studio
```

### TypeScript errors
```bash
# Regenerate Prisma Client
pnpm prisma generate

# Clean and reinstall
pnpm clean
pnpm install
```
