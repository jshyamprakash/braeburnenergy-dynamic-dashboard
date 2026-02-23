# ADR-022: Workflow-Driven Device State Structuring

## Status
Accepted — 2026-02-23

## Context
Raw device telemetry is stored as arbitrary JSON in DeviceState. There is no mechanism to
normalize or type-cast that data. Workflows should be able to re-structure raw input into
typed key-value output written back to the same DeviceState document.

## Decision
Add a new workflow node type `action:writeDeviceState` that:
1. Receives `stateId` from the trigger input (injected by the dispatcher)
2. Evaluates user-defined `mappings` (key → expression) against the execution context
3. Casts each value to the type defined in `device.attributes`
4. Patches `DeviceState.data` via `$set` using a new `patchData()` service method

Flow:
```
Device JSON → POST /devices/:id/states
  → DeviceState saved (raw)
  → Dispatcher fires with { deviceId, field, value, stateId }
    → Workflow executes
      → action:writeDeviceState patches DeviceState.data with typed values
```

New backend additions:
- `stateId` added to dispatcher trigger input
- `PATCH /devices/:deviceId/states/:stateId` endpoint
- `DeviceStateService.patchData(deviceId, stateId, data)` method
- `action:writeDeviceState` handler in WorkflowNodeHandlers

## Consequences
- DeviceState documents gain a structured overlay alongside the raw data
- Requires `stateId` (MongoDB ObjectId) to be available in workflow context at trigger time
- `attributes` field in Device model (ADR-021) drives type casting in the handler
