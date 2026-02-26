# ADR-029: Derived State Dashboard Display

## Status
**Superseded by ADR-030.**
The `device_derived_states` separate collection workaround is being removed.
ADR-030 converts `device_states` to a regular collection with TTL, reinstating
the sub-document pattern from ADR-028. Frontend display logic (React Query cache,
`derived ?? data` merge, `RealTimeGaugeBlock`) is retained unchanged.

## Context
ADR-028 defined `derived` as a sub-document on `device_states`. MongoDB time series
collections do not support updates filtered by non-metaField keys, so derived values
are stored in a separate regular collection `device_derived_states` (upserted by
`{ deviceId, stateId }`). Dashboard gauge blocks must display both raw sensor fields
(`temperature`, `humidity`) and workflow-computed derived fields (`temp_fahrenheit`)
from the same device, updating live via WebSocket.

Three failure modes were found and resolved:

1. **`castValue` default was `String(value)`**: workflow-derived numbers (e.g. `94.1`)
   were stored and broadcast as strings. `typeof "94.1" === 'number'` → false → gauge
   showed 0.

2. **`useDeviceRealtime` used `useState` + broken response parsing**: initial fetch typed
   response as `DeviceState[]` but API returns `{ success, data: DeviceState }`.
   `setLatestState` was never called. Each Redux re-render unmounted the component,
   resetting `useState` to `null` → gauge flashed then reverted to 0.

3. **Workflow broadcast sent `data: {}`**: the engine only knows derived values at
   broadcast time. Each workflow execution wiped raw sensor fields from the cached
   state.

## Decision
**Backend** — `castValue()` in `workflow-node-handlers.service.ts` preserves the
native JS type when no explicit attribute type is specified (`return value` instead
of `String(value)`).

**Frontend** — `useDeviceRealtime` rewritten to use React Query:
- Initial fetch: `GET /devices/:id/states/latest` (returns merged `derived` + `data`).
  React Query caches by `['device-latest-state', deviceId]`; remounts return cached
  value instantly, no flash to 0.
- WebSocket `device:state` handler writes directly into the React Query cache via
  `queryClient.setQueryData`. No separate `useState` needed.
- Derived values preserved via `derivedRef` across raw telemetry broadcasts.
- Raw sensor data preserved via prev-cache fallback when broadcast `data` is `{}`.

`RealTimeGaugeBlock` reads `derived[field] ?? data[field]` and coerces with
`Number(raw)` + `!isNaN()` to handle both numeric and string-typed values.

## Consequences
- Dashboard gauges display both raw and derived fields stably with no flash.
- Workflow-derived numbers are stored as native JS numbers in `device_derived_states`.
- React Query is the live-state store for device realtime data; WebSocket pushes into
  it. `useState` is no longer used in `useDeviceRealtime`.
- `ARCH_SUMMARY.md` note "React Query being phased out" no longer applies to device
  realtime — React Query is the correct tool here.
- Two WebSocket broadcast types coexist: raw telemetry (`data` populated, `derived`
  absent) and workflow write-back (`data: {}`, `derived` populated). Frontend merges
  both against the cached prior state.
