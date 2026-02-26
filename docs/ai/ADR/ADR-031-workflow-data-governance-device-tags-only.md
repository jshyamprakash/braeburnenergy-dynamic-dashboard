# ADR-031: Workflow Data Governance — Two-Collection Storage Split

## Status
Accepted (supersedes ADR-030)

## Context
ADR-030 collapsed raw telemetry and derived values into a single `device_states` regular collection.
This caused write amplification on time-series data and mixed mutability concerns.
Clean separation is required: raw telemetry is immutable; workflow outputs are mutable per-device.

## Decision
Restore `device_states` as an append-only time series collection.
Introduce `device_derived_states` as a regular collection (one doc per device) for workflow outputs.

**Two-Collection Pattern:**
- `device_states` → time series, append-only, TTL 5yr (raw sensor telemetry)
- `device_derived_states` → regular collection, unique index on deviceId (workflow outputs only)
  `{ deviceId, derived: { key: value, ... }, lastSeen: Date, sourceEventId: ObjectId }`

**Namespace semantics:**
- `{{workspace.*}}` → read-only, resolves from `device_states.data.*` (triggering doc)
- `{{derived.*}}` → workflow writes to `device_derived_states.derived.*`

**Data Flow:**
Raw sensor → `device_states` (time series) → workflow trigger → validate against `device.attributes`
→ `action:writeDeviceState` → `device_derived_states.derived.*` → Dashboard

**Rules:**
1. `writeDeviceState` validates each key against `device.attributes` (reject if undefined)
2. Dashboard reads ONLY from `device_derived_states`
3. No ad-hoc field creation: undefined attribute keys rejected at runtime
4. `device_derived_states` upserted via `findOneAndUpdate` with per-key `$set` on `derived.*`

## Consequences
- `device_states` reverts to time series (no `derived` field, immutable after ingest)
- `device_derived_states` is the single source of truth for dashboard display values
- `device.attributes` bounds all workflow output keys
- ADR-030 is superseded; `device_derived_states` collection and model are restored

## Related ADRs
- ADR-021: Device Tags/Attributes Semantic Distinction
- ADR-022: Workflow Device State Structuring
- ADR-028: Derived State Sub-Document (voided)
- ADR-030: Derived State Same-Document Regular Collection (superseded by this ADR)
