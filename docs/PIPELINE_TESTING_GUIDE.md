# Full Data Pipeline Testing Guide

This guide walks through testing the complete IoT platform data pipeline end-to-end:

**Combustion MQTT Sim → MQTT Broker → Gateway → NATS → Processing Engine → WebSocket → Kosmos Dashboard**

---

## Prerequisites

Ensure all infrastructure services are running before starting:

| Service | Default Port | Start Command |
|---------|-------------|---------------|
| MongoDB (replica set) | 27018 | `scripts/ensure-mongodb.sh` or `pnpm dev` auto-starts |
| NATS JetStream | 4222 | Started by `pnpm dev` |
| Redis | 6379 | Started by `pnpm dev` |
| MQTT Broker | — | Public HiveMQ broker (`broker.hivemq.com:1883`) — no local setup needed |

Start the platform:
```bash
cd iot-platform
pnpm dev
```

---

## Step 1: Seed the Database (One-Time Setup)

Run in this exact order from `scripts/`:

```bash
cd /home/shyamprakashj/Documents/PROJECTS/DYNAMIC_DASHBOARD/scripts

# 1. Create default org + users (superadmin + admin / Admin@12345)
pnpm seed:admin

# 2. Create POC Demo application + combustion_ml_engine + be_sense_edge devices + MQTT gateways
pnpm seed:module-devices

# 3. Create Kosmos overview dashboard + alarm rules
pnpm seed:kosmos-dashboard
```

**What gets created:**

| Script | Creates |
|--------|---------|
| `seed:admin` | Default org (`aaaaaaaaaaaaaaaaaaaaaaaa`), SuperAdmin (`superadmin`), Admin (`admin / Admin@12345`) |
| `seed:module-devices` | POC Demo application, `combustion_ml_engine` device, `be_sense_edge` device, Combustion ML Engine Gateway (MQTT), BE Sense Edge Gateway (MQTT) |
| `seed:kosmos-dashboard` | 3 alarm rules (BE-HEALTH-CRITICAL, CD-ANOMALY-HIGH, CD-PRECURSOR-CRITICAL), Kosmos Overview Dashboard (7 widgets) |

All scripts are idempotent — safe to re-run.

---

## Step 2: Activate MQTT Gateways (UI Step)

The MQTT gateways are seeded in `disconnected` state. You must start them manually.

1. Open http://localhost:3000 and log in as `admin` / `Admin@12345`
2. Navigate to **Applications → POC Demo**
3. Click the **MQTT** tab
4. Click **Start** on "Combustion ML Engine Gateway"
   - Subscribes to topic: `combustion/ml/data`
   - Target device: `combustion_ml_engine`
5. Click **Start** on "BE Sense Edge Gateway"
   - Subscribes to topic: `be-sense/inference`
   - Target device: `be_sense_edge`

Both gateways should show status `connected`.

---

## Step 3: Run Simulators

Open two terminals — one for each scenario.

```bash
cd /home/shyamprakashj/Documents/PROJECTS/DYNAMIC_DASHBOARD/scripts

# Terminal 1: Normal operation
pnpm combustion-sim -- --mode normal --interval 1000

# Terminal 2: Anomaly simulation (triggers CD-ANOMALY-HIGH alarm)
pnpm combustion-sim -- --mode lean_blowout --interval 1000
```

**Simulator modes:**

| Mode | `anomaly_score` | `precursor_class` | Triggers Alarm? |
|------|----------------|-------------------|-----------------|
| `normal` | 0.05–0.13 | NORMAL OPERATION | No |
| `lean_blowout` | 0.55–0.80 | LEAN BLOWOUT PRECURSOR | CD-ANOMALY-HIGH |
| `flashback` | 0.60–0.90 | FLASHBACK PRECURSOR | CD-ANOMALY-HIGH + CD-PRECURSOR-CRITICAL |
| `thermo_acoustic` | 0.50–0.85 | THERMO-ACOUSTIC INSTABILITY | CD-ANOMALY-HIGH |

---

## Step 4: Internal Data Flow

Once the simulator is running, this is what happens inside the platform:

```
combustion-mqtt-sim
  │
  └─ [MQTT] → combustion/ml/data
               MqttGatewayManager.handleMessage()
                 • Topic match + JSON parse + field extraction
                 • Group by deviceId
                 │
                 NATS: sensor.raw.{deviceId}
                   │
       ┌───────────┴─────────────────────┐
       │                                 │
  StorageWorker                  ProcessingEngine
  BullMQ → insertMany()          EMA noise + delta filter
  MongoDB device_states                  │
  (raw telemetry, TTL)       ┌───────────┴───────────┐
                             │                       │
                       Redis cache            NATS: sensor.processed.{deviceId}
                  sensor:latest:{deviceId}           │
                  (GET /devices/{id}/live)    WebSocketBridge
                                             broadcastDeviceState()
                                             Socket.io: device:state
                                                       │
                                             Kosmos widget re-renders
                                             useDeviceSnapshot() polls every 5s
```

**Key services involved:**

| Stage | File | Key Function |
|-------|------|-------------|
| MQTT ingestion | `mqtt-gateway-manager.service.ts` | `handleMessage()` |
| Raw storage | `storage-worker.ts` | `flushBatch()` → `DeviceState.insertMany()` |
| Noise filtering + Redis | `processing-engine.ts` | `applyFilters()` → `redis.setex()` |
| WebSocket broadcast | `websocket-bridge.ts` | `broadcastDeviceState()` |
| Dashboard polling | `useDeviceSnapshot.ts` | polls `/live` every 5s |

---

## Step 5: Verification Checklist

Work through these checkpoints after simulators have been running for ~30 seconds.

### A. Gateway Connected
- **UI:** MQTT Gateways page → both show `connected` status + `totalMessagesReceived > 0`
- **API:** `GET /api/v1/mqtt-gateways` → check `status` field and `lastMessageAt` timestamp

### B. Raw Device States Ingested
- **API:** `GET /api/v1/devices/{deviceId}/states?limit=5`
- Records should appear with recent timestamps

### C. Alarms Triggered
- **API:** `GET /api/v1/alarms/events`
- `CD-ANOMALY-HIGH` fires when `anomaly_score > 0.85` (use `--mode lean_blowout`)
- `CD-PRECURSOR-CRITICAL` fires when `anomaly_score > 0.95` (use `--mode flashback`)
- **UI:** Alarm bell icon in TopBar shows unread badge count

### D. Redis Live Snapshot
- **API:** `GET /api/v1/devices/{deviceId}/live`
- Returns latest raw sensor fields from Redis cache
- Returns `404` if no data yet (Processing Engine filtered it out), `503` if Redis unavailable

### E. Kosmos Dashboard Live
- **URL:** http://localhost:3000/dashboards/kosmos-overview-dashboard
- Check these widgets update in real time:

  | Widget | Device | Field | Update Path |
  |--------|--------|-------|-------------|
  | overviewAnomalyMetric | combustion_ml_engine | `anomaly_score` | Redis → /live |
  | overviewBeSense (8 sensors) | combustion_ml_engine | various fields | Redis → /live |
  | overviewRealtimeChart | combustion_ml_engine | `anomaly_score` | Redis → /live + WebSocket |
  | overviewBeAgentStatus | be_sense_edge | `health_score` | Redis → /live |

### F. System Health
- **URL:** http://localhost:3000/system-health (Admin+ only)
- **API:** `GET /api/v1/health/system`
- All 5 subsystems should be green:

  | Subsystem | What it checks |
  |-----------|---------------|
  | NATS | JetStream stream stats + consumer lag |
  | Redis | PING latency + memory usage |
  | BullMQ | Queue counts (waiting/active/failed) |
  | MongoDB | isMaster + replica set status |
  | Gateways | Connected count per gateway type |

---

## Timing Expectations

| Pipeline Stage | Expected Latency |
|---------------|-----------------|
| MQTT message → NATS publish | < 100 ms |
| Storage Worker batch flush | 100–500 ms |
| Processing Engine filter + Redis write | < 50 ms |
| WebSocket broadcast to client | < 10 ms |
| Dashboard poll interval (fallback) | 5 seconds |
| **Total MQTT → Dashboard (WebSocket path)** | ~200–500 ms |
| **Total MQTT → Dashboard (polling path)** | up to 5 seconds |

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Gateway stays `disconnected` | Mosquitto not running or wrong port | `sudo systemctl start mosquitto` or run Docker Mosquitto (see Prerequisites) |
| Gateway connects but no messages | Wrong topic in seed vs simulator | Verify `--topic` matches gateway topic mapping (`combustion/ml/data`) |
| `/live` returns 404 | Processing Engine EMA filter blocking constant values | Use `--mode lean_blowout` to vary the signal; or lower `processingOverrides.deltaPercent` on topic mapping |
| Alarms not firing | Alarm rule threshold not matching | `lean_blowout` triggers CD-ANOMALY-HIGH (>0.85); use `--mode flashback` for CD-PRECURSOR-CRITICAL (>0.95) |
| `WorkflowTriggerDispatcher` not firing | Dispatcher not wired in index.ts | Check server boot log for `WorkflowTriggerDispatcher initialized` |
| HeartbeatService not marking devices offline | Service not started | Check server log for `HeartbeatService started` on boot |

---

## Device IDs

`combustion_ml_engine` and `be_sense_edge` device IDs are assigned at seed time (ULID). To find them:
- **UI:** Applications → POC Demo → Devices tab → copy ID from device detail
- **API:** `GET /api/v1/devices?applicationId={appId}`

---

## Login Credentials

| Role | Username | Password | Use For |
|------|----------|----------|---------|
| Admin | `admin` | `Admin@12345` | Platform operations — devices, workflows, dashboards, system health |
| SuperAdmin | `superadmin` | `SuperAdmin123!` | System ops only — module toggle, key rotation, user management |

> For regular testing and dashboard access use **admin / Admin@12345**. SuperAdmin uses key-file login in production (ADR-053); password login is for dev convenience only.
