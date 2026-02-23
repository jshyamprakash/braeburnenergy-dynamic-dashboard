# ADR-021: Device Tags vs Attributes Semantic Separation

## Status
Accepted — 2026-02-23

## Context
The Device model used `tags: string[]` (a list of labels) and `attributes: Record<string,any>`
(arbitrary JSON). Neither field had a clear semantic contract, making them ambiguous at both
the API boundary and the workflow engine level.

## Decision
Redefine both fields with explicit semantics:

| Field | Old type | New type | Meaning |
|-------|----------|----------|---------|
| `tags` | `string[]` | `Record<string,string>` | Static metadata key-value pairs (e.g. `{ model: "X1", mfg: "Acme" }`) |
| `attributes` | `Record<string,any>` | `Record<string,string>` | Device data schema — field name → data type string (e.g. `{ temperature: "number" }`) |

`attributes` now acts as a schema descriptor: keys are the expected telemetry fields, values
are their data types (`"number"`, `"string"`, `"boolean"`, `"timestamp"`).

## Consequences
- Workflow `action:writeDeviceState` can use `attributes` to cast telemetry values to correct types
- Device create/update API accepts `tags` as an object and `attributes` as a string-value map
- Existing `tags: string[]` data must be migrated (wrap each string as `{ [tag]: "" }`)
- Frontend device form gains key-value editors for both fields
