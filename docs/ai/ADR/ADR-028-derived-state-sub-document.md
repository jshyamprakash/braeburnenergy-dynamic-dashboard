# ADR-028: Derived State Sub-Document for Immutable Raw Data Separation

## Status
Accepted

## Context
`action:writeDeviceState` currently patches workflow-derived values into `device_states.data`
using MongoDB `$set { 'data.fieldName': value }`. The `data` field is shared between raw
sensor ingestion and workflow write-back. A field name collision silently overwrites the
original sensor value with no recovery path. There is no way to distinguish sensor-originated
keys from workflow-derived keys at the storage, API, or dashboard level.

## Decision
Add an optional `derived` sub-document (Schema.Types.Mixed) alongside `data` in the
DeviceState schema. `action:writeDeviceState` writes exclusively to `derived.*` via
`$set { 'derived.fieldName': value }`. The `data` field becomes immutable after ingestion.

Dashboard and WebSocket consumers apply a per-field merge rule:
  display value = derived[field] ?? data[field]
Derived value takes precedence when present; raw value is the fallback.

Both `data` and `derived` are included in API GET responses and WebSocket `device:state`
broadcasts. No new collection or query path is introduced. `derived` is absent on documents
that predate this change or have no workflow execution — existing behaviour is unchanged.

## Consequences
- Raw sensor data in `data` is guaranteed immutable after initial ingest.
- Workflow-derived values are isolated in `derived`; field name collisions are impossible.
- Dashboard displays the most-processed available value per field with automatic raw fallback.
- Same document, same stateId, same `device_states` collection — no join or schema migration.
- `derived` keys are surfaced by `useDeviceFields` as `source: 'derived'` (distinct from
  `source: 'state'` raw and `source: 'schema'` attribute-defined fields).
- `action:writeDeviceState` target path changes from `data.*` to `derived.*` (one-line change
  in `DeviceStateService.patchData()`).
- WebSocket `broadcastDeviceState` payload includes `derived` alongside `data`.
