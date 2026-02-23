# ADR-026: Dashboard Field Discovery from Device State

## Title
Dashboard block field picker discovers fields from latest device state (schema + runtime)

## Context
Dashboard blocks (Gauge, Chart) need a field picker populated with available data keys.
`useDeviceFields` had a bug: `device.attributes` is `Record<string, string>` (keys = field names),
not an object with `.sensors[]`. Additionally, workflows can write derived fields back to
device state via `action:writeDeviceState`. The field picker must surface all fields —
both schema-defined and workflow-derived — without requiring schema changes.

## Decision
`useDeviceFields` returns `DeviceFieldEntry[]` instead of `string[]`.
- Schema fields: `Object.keys(device.attributes)` → `source: 'schema'`
- State fields: `Object.keys(states[0].data)` → `source: 'state'`
- State-discovered fields are prefixed with `~ ` in the UI (tilde = runtime/derived)
- Both sources are deduplicated; schema fields take precedence over state fields

## Consequences
- Field picker shows all runtime-derived fields without manual schema registration
- Tilde prefix (`~ fieldName`) signals to users that a field is workflow-derived
- `RealTimeChartBlock.chartSeries` uses `entry.key` from `DeviceFieldEntry[]`
- `BlockConfigPanel` field `<option>` uses `entry.key` as value, prefixes state fields
- No backend changes required; discovery is purely client-side
