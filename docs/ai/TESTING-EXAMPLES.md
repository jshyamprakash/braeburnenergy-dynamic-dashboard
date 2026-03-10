# ADR-042: Testing Examples & Quick Start

Quick reference for testing the 8 new node types.

---

## Test 1: logic:switch with Simple Value

**Workflow Structure:**
```
trigger:manual
  ↓
logic:switch (route by string value)
  ├─ "active" → action:sendNotification (Active state)
  ├─ "paused" → action:logMessage (Paused)
  └─ default → action:logMessage (Unknown)
```

**Node Definition:**
```json
{
  "id": "switch1",
  "type": "logic:switch",
  "position": { "x": 100, "y": 100 },
  "data": {
    "label": "Check Status",
    "config": {
      "expression": "{{status}}",
      "cases": [
        { "match": "active", "handle": "activeHandle" },
        { "match": "paused", "handle": "pauseHandle" }
      ],
      "defaultHandle": "unknown"
    }
  }
}
```

**Trigger Data:**
```json
{
  "status": "active",
  "timestamp": "2026-03-05T13:12:00Z"
}
```

**Expected Result:**
- Router to edge with `sourceHandle: "activeHandle"`
- Sends notification (Active state)

---

## Test 2: logic:delay

**Workflow Structure:**
```
trigger:manual
  ↓
logic:delay (wait 2 seconds)
  ↓
action:sendNotification (Delayed notification)
```

**Node Definition:**
```json
{
  "id": "delay1",
  "type": "logic:delay",
  "position": { "x": 100, "y": 200 },
  "data": {
    "label": "Wait 2 seconds",
    "config": {
      "delayMs": 2000
    }
  }
}
```

**Expected Result:**
- Workflow pauses for 2 seconds
- Output: `{ delayed: 2000 }`

---

## Test 3: logic:mutate with Multiple Operations

**Workflow Structure:**
```
trigger:deviceStateChange
  ↓
logic:mutate (transform object)
  ↓
action:debug (show result)
```

**Input Data:**
```json
{
  "temperature": 22.5,
  "humidity": 65,
  "location": "warehouse-1",
  "raw_temp_c": 22.5
}
```

**Node Definition:**
```json
{
  "id": "mutate1",
  "type": "logic:mutate",
  "position": { "x": 100, "y": 300 },
  "data": {
    "label": "Enrich Data",
    "config": {
      "operations": [
        {
          "op": "set",
          "field": "temperature_f",
          "value": 72.5
        },
        {
          "op": "delete",
          "field": "raw_temp_c"
        },
        {
          "op": "copy",
          "from": "location",
          "to": "site"
        },
        {
          "op": "rename",
          "from": "humidity",
          "to": "rh_percent"
        }
      ]
    }
  }
}
```

**Expected Output:**
```json
{
  "temperature": 22.5,
  "temperature_f": 72.5,
  "location": "warehouse-1",
  "site": "warehouse-1",
  "rh_percent": 65
}
```

---

## Test 4: logic:loop

**Workflow Structure:**
```
trigger:manual
  ↓
data:queryDeviceStates (get last 5 readings)
  ↓
logic:loop (convert each to Fahrenheit)
  ↓
action:sendNotification (all converted)
```

**Trigger Data:**
```json
{
  "deviceId": "sensor-001",
  "readings": [
  { "temp_c": 20 },
  { "temp_c": 21 },
  { "temp_c": 22 }
  ]
}
```

**Loop Node Definition:**
```json
{
  "id": "loop1",
  "type": "logic:loop",
  "position": { "x": 100, "y": 400 },
  "data": {
    "label": "Convert Temperatures",
    "config": {
      "arrayField": "readings",
      "loopNodeType": "logic:function",
      "loopNodeConfig": {
        "code": "result = { temp_f: (data.temp_c * 9/5) + 32 }"
      },
      "outputField": "converted"
    }
  }
}
```

**Expected Output:**
```json
{
  "converted": [
    { "temp_f": 68 },
    { "temp_f": 69.8 },
    { "temp_f": 71.6 }
  ]
}
```

---

## Test 5: data:storageGet + data:storageSet

**Workflow Structure:**
```
trigger:deviceStateChange
  ↓
data:storageGet (check if we've seen this device)
  ↓
logic:switch (cache hit?)
  ├─ Has value → action:logMessage (cached)
  └─ No value → data:storageSet (cache miss, store)
```

**Setup (Pre-populate cache):**
```bash
# Direct MongoDB insert or via API
db.workflow_storage.insertOne({
  orgId: ObjectId("..."),
  key: "device-last-seen:sensor-001",
  value: { lastSeen: "2026-03-05T12:00:00Z", count: 5 },
  workflowId: null,
  updatedAt: new Date()
})
```

**StorageGet Node:**
```json
{
  "id": "storageGet1",
  "type": "data:storageGet",
  "data": {
    "config": {
      "key": "device-last-seen:sensor-001",
      "outputField": "deviceCache",
      "defaultValue": null
    }
  }
}
```

**StorageSet Node:**
```json
{
  "id": "storageSet1",
  "type": "data:storageSet",
  "data": {
    "config": {
      "key": "device-last-seen:sensor-001",
      "value": {
        "lastSeen": "{{trigger.timestamp}}",
        "count": 1
      },
      "ttlSeconds": 86400
    }
  }
}
```

**Expected Result:**
- First execution: `deviceCache = null` (default), stores new entry with 1-day TTL
- Second execution (within 24h): `deviceCache = { lastSeen: ..., count: 1 }`

---

## Test 6: data:opcuaRead

**Prerequisites:**
1. OPC-UA gateway must be running and connected
2. Node ID must exist on the server

**Workflow Structure:**
```
trigger:scheduled (every 5s)
  ↓
data:opcuaRead (read temperature)
  ↓
logic:switch (check value)
  ├─ > 25 → action:createAlarm
  └─ ≤ 25 → action:logMessage
```

**Node Definition:**
```json
{
  "id": "opcuaRead1",
  "type": "data:opcuaRead",
  "data": {
    "config": {
      "gatewayId": "gateway-12345",
      "nodeId": "ns=2;i=5001",
      "outputField": "temperature"
    }
  }
}
```

**Expected Output:**
```json
{
  "temperature": 23.5
}
```

**Error Case:**
```json
{
  "error": "Gateway gateway-12345 is not running or not found"
}
```

---

## Test 7: data:opcuaWrite

**Prerequisites:**
1. OPC-UA gateway must be running
2. Node must support write operations
3. User must have write permissions

**Workflow Structure:**
```
trigger:manual (user input)
  ↓
data:opcuaWrite (set setpoint)
  ↓
action:sendNotification (confirm write)
```

**Node Definition:**
```json
{
  "id": "opcuaWrite1",
  "type": "data:opcuaWrite",
  "data": {
    "config": {
      "gatewayId": "gateway-12345",
      "nodeId": "ns=2;i=5002",
      "value": 24.5
    }
  }
}
```

**With Expression (from trigger):**
```json
{
  "config": {
    "gatewayId": "gateway-12345",
    "nodeId": "ns=2;i=5002",
    "value": "{{trigger.setpoint}}"
  }
}
```

**Trigger Data:**
```json
{
  "setpoint": 24.5
}
```

**Expected Result:**
- Node write succeeds silently
- Output: `{ opcuaWriteResult: { nodeId: "ns=2;i=5002", value: 24.5, success: true } }`

---

## Integration Test: Complex Workflow

**Scenario:** Temperature sensor with caching and OPC-UA control

**Complete Workflow:**
```
trigger:deviceStateChange (temp sensor update)
  ↓
data:storageGet (check cache)
  ↓
logic:switch (cache hit?)
  ├─ CACHE_HIT
  │   ↓
  │   action:logMessage (using cached data)
  │
  └─ CACHE_MISS
      ↓
      data:opcuaRead (read from PLC)
      ↓
      logic:mutate (convert units)
      ├─ set: temp_f = (temp_c * 9/5) + 32
      ├─ set: validated = true
      └─ delete: raw_value
      ↓
      data:storageSet (cache for 1 hour)
      ├─ key: temp-reading:sensor-1
      ├─ value: {{currentData}}
      └─ ttl: 3600
      ↓
      logic:switch (check threshold)
      ├─ > 30°C
      │   ↓
      │   data:opcuaWrite (reduce setpoint)
      │   ↓
      │   action:createAlarm
      │
      └─ ≤ 30°C
          ↓
          action:sendNotification (OK)
```

**Test Data:**
```json
{
  "deviceId": "sensor-001",
  "data": { "temperature": 32 },
  "timestamp": "2026-03-05T13:12:00Z"
}
```

**Expected Execution:**
1. Get cache → miss (first run)
2. Read from OPC-UA → value: 32
3. Mutate → add temp_f (89.6), set validated: true
4. Store in cache with 1h TTL
5. Check > 30 → true
6. Write new setpoint to PLC (lower temperature)
7. Create alarm

---

## Unit Test Template (Jest)

```typescript
import { WorkflowNodeHandlers } from '../workflow-node-handlers.service';

describe('LogicSwitchHandler', () => {
  let handlers: WorkflowNodeHandlers;

  beforeEach(() => {
    handlers = new WorkflowNodeHandlers();
  });

  it('should route to correct branch by value', async () => {
    const context = {
      currentData: { status: 'active' },
    };

    const result = await handlers.execute(
      {
        id: 'switch1',
        type: 'logic:switch',
        position: { x: 0, y: 0 },
        data: {
          config: {
            expression: '{{status}}',
            cases: [
              { match: 'active', handle: 'active_branch' },
              { match: 'inactive', handle: 'inactive_branch' },
            ],
            defaultHandle: 'unknown',
          },
        },
      },
      context
    );

    expect(result.switchBranch).toBe('active_branch');
    expect(result.output).toEqual(context.currentData);
  });

  it('should fallback to defaultHandle on no match', async () => {
    const context = {
      currentData: { status: 'unknown' },
    };

    const result = await handlers.execute(
      {
        id: 'switch1',
        type: 'logic:switch',
        position: { x: 0, y: 0 },
        data: {
          config: {
            expression: '{{status}}',
            cases: [
              { match: 'active', handle: 'active_branch' },
            ],
            defaultHandle: 'unknown',
          },
        },
      },
      context
    );

    expect(result.switchBranch).toBe('unknown');
  });
});

describe('LogicLoopHandler', () => {
  it('should iterate over array and execute handler', async () => {
    const context = {
      currentData: {
        items: [10, 20, 30],
      },
    };

    const result = await handlers.execute(
      {
        id: 'loop1',
        type: 'logic:loop',
        position: { x: 0, y: 0 },
        data: {
          config: {
            arrayField: 'items',
            loopNodeType: 'transform:mathOperation',
            loopNodeConfig: {
              operation: 'multiply',
              value: 2,
              outputField: 'doubled',
            },
            outputField: 'loopResults',
          },
        },
      },
      context
    );

    expect(result.output.loopResults).toHaveLength(3);
    expect(result.output.loopResults[0]).toHaveProperty('doubled', 20);
  });
});
```

---

## Curl Tests

### Create Storage Entry
```bash
curl -X POST http://localhost:3001/api/workflow-storage \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "key": "my-config",
    "value": { "setting": "value" },
    "ttlSeconds": 3600
  }'
```

### Read Storage Entry
```bash
curl -X GET "http://localhost:3001/api/workflow-storage/my-config" \
  -H "Authorization: Bearer $TOKEN"
```

### Execute Workflow with Switch
```bash
curl -X POST http://localhost:3001/api/workflows/wf-123/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "trigger": {
      "type": "manual",
      "data": { "status": "active" }
    }
  }'
```

---

## Debugging Checklist

**If switch not routing:**
- Verify expression resolves to expected value (use action:debug)
- Check edge `sourceHandle` matches case `handle`
- Ensure cases are case-sensitive

**If loop not iterating:**
- Verify `arrayField` points to array (not object/string)
- Check array is < 100 items
- Use action:debug in loop node config to inspect each item

**If storage returns null:**
- Check key exists (query MongoDB directly)
- Verify TTL hasn't expired: `expiresAt > now`
- Check `orgId` matches (multi-tenancy)

**If OPC-UA read fails:**
- Check gateway status in UI (must be "running")
- Verify node ID exists on OPC-UA server (use browse)
- Check network connectivity to server
- Ensure credentials are correct

---

**Test Data Collection:** March 5, 2026
