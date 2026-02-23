# ADR-020: Workflow Real-Time Auto-Trigger

## Context

Workflow trigger nodes (`trigger:deviceStateChange`, `trigger:alarmTriggered`,
`trigger:scheduled`) exist in the engine but only fire via manual API invocation.
The IoT platform must automatically execute workflows when device states or alarms
occur — otherwise the core automation value proposition does not exist.

## Decision

Introduce a `WorkflowTriggerDispatcher` service that sits above both
`DeviceStateService` and `WorkflowEngineService`. This dispatcher:

1. Exposes `dispatchDeviceStateChange(orgId, deviceId, field, value, stateData)`
2. Exposes `dispatchAlarmTriggered(orgId, alarmData)`
3. Queries `WorkflowService.findTriggerWorkflows(triggerType, filters)` to get
   matching enabled workflows
4. Calls `WorkflowEngineService.execute()` for each match (fire-and-forget)

Dispatcher is instantiated once in `server.ts` and passed to route handlers via
Fastify's dependency injection (`fastify.decorate`).

## Consequences

- **Avoids circular deps:** Dispatcher depends on WorkflowService +
  WorkflowEngineService but NOT on DeviceStateService (one-way dependency)
- **Fire-and-forget:** Workflow execution is async; device state save is not blocked
- **Filter logic:** deviceStateChange filters match on `deviceId` and/or `field`
  stored in trigger node `config.deviceId` and `config.field`
- **Performance:** DB query per device state write (index on trigger type + orgId)
- **Existing engine unchanged:** WorkflowEngineService.execute() called as before
