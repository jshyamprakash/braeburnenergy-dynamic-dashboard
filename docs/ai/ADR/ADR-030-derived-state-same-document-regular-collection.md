# ADR-030: Derived State as Sub-Document via Regular Collection with TTL

## Status
Accepted

## Context
ADR-028 decided that workflow-derived values should live in a `derived` sub-document
within the same `device_states` document, written via `$set { 'derived.*': value }`.
Execution was blocked: `device_states` is a MongoDB **time series collection**, and
time series collections are append-only — post-insert `$set` on non-metaField keys is
not supported by MongoDB.

ADR-029 worked around this with a separate `device_derived_states` regular collection
keyed by `{ deviceId, stateId }`. This workaround introduced:
- A second DB read in `getLatest()` (parallel query + application-layer merge)
- A second collection to maintain (model, indexes, lifecycle)
- Conceptual fragmentation: one logical device state event split across two collections

## Decision
Convert `device_states` from a MongoDB **time series collection** to a **regular
MongoDB collection with a TTL index** on the `timestamp` field. This unblocks the
original ADR-028 pattern.

**Storage changes:**
- Remove `timeseries: { timeField, metaField, granularity }` from the Mongoose schema
- Add `expireAfterSeconds: 157680000` TTL index on `{ timestamp: 1 }` (5-year EPA retention)
- Add `derived: { type: Schema.Types.Mixed, default: {} }` to DeviceState schema

**Service changes:**
- `DeviceStateService.upsertDerived()`: writes to `DeviceState.updateOne({ _id: stateId },
  { $set: { 'derived.<key>': value } })` — no separate collection
- `DeviceStateService.getLatest()`: single query; `derived` is already on the document
- `device_derived_states` collection and `DeviceDerivedState` model: **deleted**

**Unchanged:**
- `display value = derived[field] ?? data[field]` merge rule (frontend)
- React Query cache strategy and WebSocket broadcast format (`data` + `derived`)
- `RealTimeGaugeBlock` read logic and `Number()` coercion
- All time-bucket aggregations (`$dateTrunc`) work identically on regular collections

## Consequences
- Raw `data` field remains immutable after ingest; `derived` holds all workflow output.
- Single document lookup — no join, no parallel queries, no merge step in application.
- `device_derived_states` collection removed; `DeviceDerivedState` model deleted.
- TTL index replicates time series expiry behaviour; 5-year EPA compliance preserved.
- MongoDB time series storage optimisations (columnar bucketing) are sacrificed.
  Acceptable at current POC scale; can be revisited if write throughput becomes a concern.
- ADR-028: Voided → Intent reinstated here. ADR-029: Superseded by this ADR.
