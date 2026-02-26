# CURRENT_DECISIONS: ADR-031 Two-Collection Storage Split

## What Changed

**ADR-031 — Two-Collection Storage Split (supersedes ADR-030):**
- `device_states` reverted to MongoDB time series collection (TTL 5yr, append-only).
- `device_derived_states` restored as regular collection (unique index on deviceId).
- `device_derived_states` schema: `{ deviceId, derived: {}, lastSeen: Date, sourceEventId? }`.
- `DeviceDerivedStateService` re-created with `upsert()`, `getLatest()`, `getAllForOrg()`.
- `DeviceStateService`: removed `upsertDerived()`, `patchData()`, `getDerived()`.
- `workflow-node-handlers`: `writeDeviceState` validates keys against `device.attributes`, writes to `device_derived_states`.
- ADR-030 superseded. Dashboard reads ONLY from `device_derived_states`.

## Technical Implications
- Raw sensor data (`device_states`) is immutable after ingest; no `derived` field.
- Workflow outputs go to `device_derived_states.derived.*` via `findOneAndUpdate` with per-key `$set`.
- `writeDeviceState` validates each mapping key against `device.attributes` before writing.
- WebSocket broadcast emits derived values from `device_derived_states` after write.
- Dashboard field picker resolves from `device.attributes`; display reads `device_derived_states`.

## Constraints
1. Seed script must be re-run after this change (time series collection recreated).
2. MongoDB does NOT support updateOne/updateMany on time series collections — use insertOne.
3. `device_derived_states` upserted via per-key `$set` — never replace whole `derived` object.
4. `writeDeviceState` rejects unknown keys (not in `device.attributes`) at runtime.
5. MongoDB replica set required (time series, compliance, oplog).
6. `stateData` in logic:function context is the full IDeviceState doc.
