# ADR-042: Workflow Node Library Expansion — Implementation Summary

**Date:** March 5, 2026
**Status:** Complete
**Implementation:** T01-T07

## Overview

Successfully implemented 8 new node types for the visual workflow editor, expanding the node library from 19 to 27 types. This adds critical workflow capabilities: branching (switch), looping, data persistence, OPC-UA read/write, and data transformation.

---

## Tasks Completed

### T01: Create WorkflowStorage Mongoose Model ✅

**File:** `/home/shyamprakashj/Documents/PROJECTS/DYNAMIC_DASHBOARD/iot-platform/apps/api/src/models/workflow-storage.model.ts`

**Fields:**
- `orgId` (ObjectId, ref 'Organization') — Multi-tenancy
- `key` (String, maxLen 256, required, unique per orgId+key)
- `value` (Mixed type) — Flexible storage
- `workflowId` (String, optional) — Workflow-scoped entries
- `expiresAt` (Date, optional) — TTL support
- `updatedAt` (Date, default Date.now) — Tracking

**Indexes:**
- Compound unique: `{ orgId: 1, key: 1, workflowId: 1 }` (sparse)
- Sparse TTL: `{ expiresAt: 1 }` with `expireAfterSeconds: 0`
- Query index: `{ orgId: 1, workflowId: 1 }`

**Purpose:** Persistent key-value storage for workflow variables, cache, and cross-node data passing.

---

### T02: Extend NodeType Union ✅

**Files Modified:**
- `/iot-platform/apps/api/src/models/workflow.model.ts`
- `/iot-platform/packages/types/src/index.ts`

**New Node Types (8 total):**

**Logic nodes:**
- `logic:switch` — Branching based on expression value
- `logic:loop` — Iterate over arrays with handler node
- `logic:delay` — Pause execution (0-30s)
- `logic:mutate` — Transform data (set/delete/copy/rename operations)

**Data nodes:**
- `data:storageGet` — Retrieve value from WorkflowStorage
- `data:storageSet` — Store value in WorkflowStorage
- `data:opcuaRead` — Read OPC-UA node value
- `data:opcuaWrite` — Write OPC-UA node value

**Type Union Updates:**
- `workflow.model.ts`: Added 8 types to enum and type definition
- `packages/types/src/index.ts`: Added 8 types to NodeType union + WorkflowStorageEntry interface

---

### T03: Implement Logic Handlers (Switch, Delay, Mutate) ✅

**File:** `/iot-platform/apps/api/src/services/workflow-node-handlers.service.ts`

**NodeExecutionResult Interface Update:**
- Added `switchBranch?: string` for switch node routing

#### logic:switch Handler
```typescript
private async executeLogicSwitch(config: any, context: any)
```
- Resolves expression from `context.currentData`
- Supports `{{fieldPath}}` syntax for field extraction
- Falls back to literal value if no template syntax
- Matches value (as string) against `config.cases` array
- Returns `{ output, switchBranch: matchedHandle || 'default' }`

**Config Schema:**
```json
{
  "expression": "string or {{fieldPath}}",
  "cases": [
    { "match": "value1", "handle": "branch1" },
    { "match": "value2", "handle": "branch2" }
  ],
  "defaultHandle": "default"
}
```

#### logic:delay Handler
```typescript
private async executeLogicDelay(config: any, context: any)
```
- Clamps delay to [0, 30000] ms
- Uses `setTimeout` for async wait
- Returns `{ output: {..., delayed: clampedDelay} }`

**Config Schema:**
```json
{ "delayMs": 5000 }
```

#### logic:mutate Handler
```typescript
private async executeLogicMutate(config: any, context: any)
```
- Deep-clones `context.currentData`
- Supports 4 operations:
  - `set`: Resolve value (support `{{fieldPath}}` expressions), set at field path
  - `delete`: Delete field from object
  - `copy`: Copy from `from` to `to`
  - `rename`: Copy from `from` to `to`, delete `from`
- Returns mutated data

**Config Schema:**
```json
{
  "operations": [
    { "op": "set", "field": "newField", "value": "{{trigger.value}}" },
    { "op": "delete", "field": "oldField" },
    { "op": "copy", "from": "source", "to": "destination" },
    { "op": "rename", "from": "oldName", "to": "newName" }
  ]
}
```

---

### T04: Implement Logic Loop Handler ✅

**File:** `/iot-platform/apps/api/src/services/workflow-node-handlers.service.ts`

**logic:loop Handler:**
```typescript
private async executeLogicLoop(config: any, context: any)
```

**Execution Flow:**
1. Get array at `config.arrayField` from `context.currentData`
2. Validate it's an Array
3. Cap at 100 items (slice)
4. For each item:
   - Create synthetic node with `config.loopNodeType`
   - Create scoped context with item as `currentData`
   - Call `this.execute(syntheticNode, scopedContext)`
   - Collect result
5. Return results array

**Config Schema:**
```json
{
  "arrayField": "items",
  "loopNodeType": "transform:mathOperation",
  "loopNodeConfig": { "operation": "multiply", "value": 2 },
  "outputField": "loopResults"
}
```

**Output:**
```json
{
  "output": {
    "...currentData",
    "loopResults": [...]  // Array of results
  }
}
```

---

### T05: Implement Storage & OPC-UA Data Handlers ✅

**File:** `/iot-platform/apps/api/src/services/workflow-node-handlers.service.ts`

#### data:storageGet Handler
```typescript
private async executeDataStorageGet(config: any, context: any)
```
- Queries `WorkflowStorage.findOne({ orgId, key })`
- Checks if entry exists and `expiresAt` is in future
- Returns value or `config.defaultValue`

**Config Schema:**
```json
{
  "key": "myStorageKey",
  "outputField": "storageValue",
  "defaultValue": null
}
```

#### data:storageSet Handler
```typescript
private async executeDataStorageSet(config: any, context: any)
```
- Resolves value from expression (support `{{fieldPath}}`)
- Upsets entry with `$set: { value, updatedAt, expiresAt? }`
- TTL: `expiresAt = now + ttlSeconds * 1000`

**Config Schema:**
```json
{
  "key": "myStorageKey",
  "value": "{{trigger.value}}",
  "ttlSeconds": 3600
}
```

#### data:opcuaRead Handler
```typescript
private async executeDataOpcuaRead(config: any, context: any)
```
- Calls `opcuaGatewayManager.readNode(gatewayId, nodeId)`
- Writes result to `context.currentData[outputField]`

**Config Schema:**
```json
{
  "gatewayId": "gateway-id",
  "nodeId": "ns=2;i=5",
  "outputField": "opcuaValue"
}
```

#### data:opcuaWrite Handler
```typescript
private async executeDataOpcuaWrite(config: any, context: any)
```
- Resolves value from expression
- Calls `opcuaGatewayManager.writeNode(gatewayId, nodeId, value)`

**Config Schema:**
```json
{
  "gatewayId": "gateway-id",
  "nodeId": "ns=2;i=5",
  "value": "{{computed.setPoint}}"
}
```

---

### T06: Add readNode() & writeNode() to OpcuaGatewayManager ✅

**File 1:** `/iot-platform/apps/api/src/services/opcua-gateway-manager.service.ts`

```typescript
async readNode(gatewayId: string, nodeId: string): Promise<unknown>
async writeNode(gatewayId: string, nodeId: string, value: unknown): Promise<void>
```

**Validation:**
- Gateway must be running (`instance.isRunning`)
- Client must have active session (`getConnectionStatus()`)
- Throws clear error if requirements not met

**File 2:** `/iot-platform/apps/api/src/services/opcua-client.service.ts`

Added two new methods:

```typescript
async readNode(nodeId: string): Promise<any>
// Reads value from a specific node (returns value directly)

async writeNode(nodeId: string, value: any): Promise<void>
// Writes value to a specific node (alias for write() with same behavior)
```

---

### T07: Modify WorkflowEngineService for Switch Routing ✅

**File:** `/iot-platform/apps/api/src/services/workflow-engine.service.ts`

**Edge-Routing Logic (Lines 317-335):**

Changed from simple condition-only branching to multi-type routing:

```typescript
if (node.type === 'logic:switch') {
  const branch = result.switchBranch ?? 'default';
  const nextEdge = outgoingEdges.find(e => e.sourceHandle === branch);
  if (nextEdge) {
    const nextNode = allNodes.find(n => n.id === nextEdge.target);
    if (nextNode) await this.executeNode(nextNode, ...);
  }
} else if (node.type.startsWith('condition:')) {
  // Existing condition branching logic
  const branch = result.conditionMet ? 'true' : 'false';
  // ...
} else {
  // Existing sequential execution for non-branching nodes
  // ...
}
```

**Key Change:**
- Switch nodes route to specific branch via `sourceHandle` matching
- Falls back to `'default'` handle if no match found
- Condition and switch nodes are now independent branching mechanisms

---

## Implementation Notes

### Helper Methods Added
- `deleteNestedValue(obj, path)` — Safely delete nested fields using dot notation

### Expression Resolution
All data nodes support `{{fieldPath}}` template syntax:
- Example: `{{trigger.deviceId}}` extracts `trigger.deviceId` from context
- Falls back to literal value if no template syntax detected
- Works in: switch expressions, storage values, OPC-UA values, mutation operations

### Workflow Storage Design
- Org-scoped by default (`key` unique per org)
- Optional workflow-scoping via `workflowId` field
- TTL-enabled entries auto-expire after `ttlSeconds`
- No retention policy needed (handled by MongoDB TTL index)

### OPC-UA Node Operations
- Requires gateway to be running and connected
- Throws descriptive errors if gateway not available
- Client session state checked before each operation
- Uses existing node-opcua library for protocol operations

### Loop Node Considerations
- Synthetic nodes created with `id: 'loop-body'`
- Scoped context isolates item from parent execution
- Max 100 iterations (prevents runaway loops)
- Results collected sequentially (not parallel)

---

## Build Status

✅ **All TypeScript compiles successfully**

- API: Zero errors
- Types package: Zero errors
- Web: No new errors (pre-existing e2e test warning unrelated to our changes)

**Build Command:**
```bash
cd iot-platform && pnpm build --filter api
# Task succeeded with 0 errors
```

---

## Files Modified/Created

### Created (1):
- `apps/api/src/models/workflow-storage.model.ts`

### Modified (7):
- `apps/api/src/models/workflow.model.ts` — Added 8 node types to enum
- `apps/api/src/services/workflow-node-handlers.service.ts` — Added 8 handlers + helper
- `apps/api/src/services/workflow-engine.service.ts` — Added switch routing logic
- `apps/api/src/services/opcua-gateway-manager.service.ts` — Added readNode/writeNode
- `apps/api/src/services/opcua-client.service.ts` — Added readNode/writeNode
- `packages/types/src/index.ts` — Added 8 node types + WorkflowStorageEntry interface

### Unmodified (docs only, pre-generated state files):
- `docs/ai/ARCH_SUMMARY.llamp`
- `docs/ai/CURRENT_DECISIONS.llamp`
- `docs/ai/TASK_HISTORY.md`

---

## Next Steps (Not Part of T01-T07)

1. **Frontend Node UI** — Create UI components for new node types in NodeConfigPanel
2. **Integration Tests** — Add 20+ tests for switch, loop, storage, OPC-UA handlers
3. **Documentation** — Workflow node guide with examples for each node type
4. **Validation Schemas** — Zod schemas for each node's config validation
5. **Error Handling** — Graceful degradation for storage key not found, OPC-UA timeout

---

## Architecture Impact

✅ **No architectural changes** — ADR-017 (logic/data taxonomy) fully honored

- All new nodes follow existing patterns
- Storage model integrates with existing multi-tenancy
- OPC-UA handlers reuse existing gateway infrastructure
- Engine routing extends (not replaces) condition branching

---

## Performance Considerations

- **Storage Operations:** Single-document upsert (O(1) for key lookup)
- **Loop Operations:** Sequential execution (N iterations = N node executions)
- **OPC-UA Operations:** Dependent on gateway latency (typically 100-500ms per read/write)
- **Expression Parsing:** Lightweight string matching for `{{...}}` syntax

---

## Testing Recommendations

```typescript
// Example: Test switch routing
const switchNode = {
  type: 'logic:switch',
  data: { config: { expression: '{{status}}', cases: [...], defaultHandle: 'unknown' } }
};

// Example: Test storage with TTL
const storageSetNode = {
  type: 'data:storageSet',
  data: { config: { key: 'temp_cache', value: '{{reading}}', ttlSeconds: 300 } }
};

// Example: Test loop iteration
const loopNode = {
  type: 'logic:loop',
  data: { config: { arrayField: 'items', loopNodeType: 'transform:mathOperation', ... } }
};
```

---

**Implementation Date:** March 5, 2026
**Implemented By:** Senior Full-Stack Developer
**Status:** Ready for Integration Testing
