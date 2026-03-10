# Workflow Node Type Reference (ADR-042)

Quick reference for all 27 node types in the visual workflow editor.

---

## Trigger Nodes (5 types)

Start workflow execution.

| Type | Purpose | Trigger Data |
|------|---------|--------------|
| `trigger:deviceStateChange` | Device state update | `{ deviceId, data, timestamp }` |
| `trigger:scheduled` | Cron schedule | `{ triggerTime }` |
| `trigger:manual` | Manual execution | User input |
| `trigger:alarmTriggered` | Alarm state change | `{ alarmId, severity }` |
| `trigger:webhook` | HTTP POST received | Request body |
| `trigger:deviceOffline` | Device offline detection | `{ deviceId, offlineSinceMs }` |

---

## Condition Nodes (5 types) — LEGACY

Branch execution based on boolean result. Use `logic:switch` for new workflows.

| Type | Output | Config |
|------|--------|--------|
| `condition:comparison` | `true`/`false` | `{ field, operator, value }` |
| `condition:threshold` | `true`/`false` | `{ field, min, max }` |
| `condition:ifElse` | `true`/`false` | `{ expression }` |
| `condition:timeBased` | `true`/`false` | `{ startHour, endHour }` |
| `condition:deviceStatus` | `true`/`false` | `{ status }` |

---

## Action Nodes (7 types) — LEGACY

Execute side effects. Can use in new workflows.

| Type | Purpose | Config |
|------|---------|--------|
| `action:sendNotification` | Send notification | `{ title, message, severity }` |
| `action:updateDevice` | Update device attributes | `{ deviceId, updates }` |
| `action:createAlarm` | Create alarm instance | `{ severity, message }` |
| `action:callWebhook` | POST to external endpoint | `{ url, method, headers, body }` |
| `action:logMessage` | Log to console | `{ message, level }` |
| `action:updateVariable` | Store in context | `{ variableName, value }` |
| `action:debug` | Emit real-time debug message | `{ messageTemplate, level }` |
| `action:writeDeviceState` | Write derived state | `{ mappings }` |

---

## Transform Nodes (4 types) — LEGACY

Transform data. Use `logic:mutate` for new workflows.

| Type | Purpose | Config |
|------|---------|--------|
| `transform:mathOperation` | Math: add/subtract/multiply/divide | `{ field, operation, value }` |
| `transform:stringOperation` | String: case/concat/replace | `{ field, operation, value }` |
| `transform:aggregation` | Array: sum/avg/min/max | `{ field, operation }` |
| `transform:dataMapping` | Map fields | `{ mappings }` |

---

## Data Nodes (7 types) — NEW

Read/write external data sources.

### Reading Data

| Type | Purpose | Config |
|------|---------|--------|
| `data:modbusRead` | Read Modbus register | `{ gatewayId, registerName }` |
| `data:queryDeviceStates` | Query historical states | `{ deviceId, startTime, endTime, limit }` |
| `data:storageGet` | Retrieve from WorkflowStorage | `{ key, outputField, defaultValue }` |
| `data:opcuaRead` | Read OPC-UA node | `{ gatewayId, nodeId, outputField }` |

### Writing Data

| Type | Purpose | Config |
|------|---------|--------|
| `data:modbusWrite` | Write Modbus registers | `{ gatewayId, startAddress, values }` |
| `data:storageSet` | Store in WorkflowStorage | `{ key, value, ttlSeconds }` |
| `data:opcuaWrite` | Write OPC-UA node | `{ gatewayId, nodeId, value }` |

---

## Logic Nodes (5 types) — NEW

Control flow and data transformation.

### Branching

| Type | Purpose | Output |
|------|---------|--------|
| `logic:switch` | Route to branch by value | `{ output, switchBranch }` |

**Config:**
```json
{
  "expression": "{{status}}",  // or literal value
  "cases": [
    { "match": "active", "handle": "ongoing" },
    { "match": "inactive", "handle": "stopped" }
  ],
  "defaultHandle": "unknown"
}
```

**Routing:** Outgoing edges use `sourceHandle` matching `switchBranch`.

### Iteration

| Type | Purpose | Output |
|------|---------|--------|
| `logic:loop` | Iterate over array items | `{ output, loopResults }` |

**Config:**
```json
{
  "arrayField": "readings",
  "loopNodeType": "transform:mathOperation",
  "loopNodeConfig": { "operation": "multiply", "value": 1.8 },
  "outputField": "converted"
}
```

**Execution:** Each item becomes `currentData` for loop handler node.

### Timing & Transformation

| Type | Purpose | Config |
|------|---------|--------|
| `logic:delay` | Pause execution | `{ delayMs }` (0-30000) |
| `logic:mutate` | Transform object | `{ operations }` |
| `logic:function` | Execute JavaScript | `{ code, outputField }` |

**Mutate Operations:**
```json
{
  "operations": [
    { "op": "set", "field": "newField", "value": "{{source}}" },
    { "op": "delete", "field": "oldField" },
    { "op": "copy", "from": "src", "to": "dest" },
    { "op": "rename", "from": "old", "to": "new" }
  ]
}
```

---

## Expression Syntax

All data nodes support template expressions.

### Basic Syntax
- `{{fieldPath}}` — Extract value from context
- Literal values (strings, numbers) — Use as-is

### Examples
```typescript
// Resolve from context
"value": "{{trigger.temperature}}"    // → context.trigger.temperature
"expression": "{{status}}"             // → context.status
"value": "{{computed.result}}"         // → context.computed.result

// Literal values
"value": 42
"expression": "error"
"key": "my_key"
```

### Supported Context Fields
- `trigger.*` — Original trigger data
- `currentData.*` — Output from previous node
- `variables.*` — User-defined variables
- `workspace.*` — Shared workspace data
- `nodeId.*` — Output from specific node (e.g., `node123.value`)

---

## Output Field Conventions

Each data/transform node writes output to `context.currentData[outputField]`.

| Node Type | Default Output Field |
|-----------|----------------------|
| `data:modbusRead` | `modbusData` |
| `data:storageGet` | `storageValue` |
| `data:opcuaRead` | `opcuaValue` |
| `data:queryDeviceStates` | `deviceStates` |
| `transform:mathOperation` | Same field (in-place) |
| `logic:delay` | `delayed` (delay amount) |
| `logic:loop` | `loopResults` |
| `logic:function` | `computed` |
| `logic:mutate` | Full object (no key) |

---

## Branching Strategy

### Condition Nodes (Legacy)
- Output: `{ output, conditionMet: true|false }`
- Edge handles: `true`, `false`
- Usage: `sourceHandle` matches result

### Switch Nodes (New)
- Output: `{ output, switchBranch: string }`
- Edge handles: Custom (from `cases.handle` or `defaultHandle`)
- Usage: `sourceHandle` matches `switchBranch` value

### Sequential Nodes
- No branching: All outgoing edges execute sequentially
- Default for all other node types

---

## Error Handling

### Graceful Degradation
- Storage key not found → Use `defaultValue`
- OPC-UA gateway offline → Throw error (halt execution)
- Loop array validation fails → Throw error (halt execution)

### Try-Catch Patterns
Wrap nodes in `logic:function` for error handling:
```javascript
try {
  // Your logic
  result.value = context.data.someField / 0;
} catch (e) {
  result.error = e.message;
}
```

---

## Common Patterns

### Pattern 1: Conditional Data Fetch
```
trigger:deviceStateChange
  → logic:switch (check device type)
    ├─ case "modbus" → data:modbusRead
    ├─ case "opcua" → data:opcuaRead
    └─ case "api" → action:callWebhook
  → action:sendNotification
```

### Pattern 2: Cached Computation
```
trigger:deviceStateChange
  → data:storageGet (check cache)
    → logic:switch (cache hit?)
      ├─ true → use cached value
      └─ false → compute
          → data:storageSet (update cache)
          → action:sendNotification
```

### Pattern 3: Batch Processing
```
trigger:manual
  → data:queryDeviceStates (get history)
    → logic:loop (process each state)
      → transform:mathOperation (convert units)
      → data:storageSet (accumulate results)
  → action:sendNotification (summary)
```

### Pattern 4: Conditional Branching
```
trigger:deviceStateChange
  → logic:mutate (enrich data)
    → logic:switch (route by severity)
      ├─ CRITICAL → action:createAlarm → action:callWebhook
      ├─ WARNING → action:sendNotification
      └─ INFO → action:logMessage
```

---

## Performance Tips

1. **Loop Limits:** Max 100 items per loop (auto-capped)
2. **Delay Limits:** Max 30 seconds (prevents workflow jams)
3. **Storage Queries:** Upsert is O(1) by key; no scanning
4. **OPC-UA:** Typical latency 100-500ms; consider batch reads
5. **Expression Parsing:** Lightweight; no regex compilation

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Switch not branching | `sourceHandle` mismatch | Verify edge `sourceHandle` matches case `handle` |
| Loop not iterating | Array field is not Array | Validate field type in previous node |
| Storage value empty | Key not found + no default | Set `defaultValue` in config |
| OPC-UA read fails | Gateway offline | Check gateway status in UI |
| Expression not resolved | Wrong field path | Use `action:debug` to inspect context |

---

## Advanced: Custom Node Type

To add a new node type:

1. **Add to NodeType union:**
   - `apps/api/src/models/workflow.model.ts`
   - `packages/types/src/index.ts`

2. **Implement handler:**
   - Add case in `WorkflowNodeHandlers.execute()`
   - Implement `private async executeMyNode(config, context)`

3. **Add to workflow schema enum:**
   - `workflowSchema.nodeType.enum`

4. **Test:**
   - Unit tests for handler
   - Integration test for workflow execution
   - Frontend UI (NodeConfigPanel)

---

**Last Updated:** March 5, 2026 (ADR-042 Implementation)
