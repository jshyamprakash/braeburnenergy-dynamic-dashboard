# ADR-023: Application → Device → Workflow → Dashboard Hierarchy

## Status
Accepted — 2026-02-23

## Context
The platform lacks a formal hierarchy between its core entities. Devices, Workflows, and
Dashboards currently exist as independent siblings under an Organization. This creates
ambiguity about creation order, schema ownership, and data flow direction.

## Decision
Define a strict four-level hierarchy within an Organization:

```
Organization
  └── Application            ← top-level project container
        ├── Device(s)         ← schema authority (defines keys + types via attributes)
        │     └── DeviceState ← raw + structured telemetry
        ├── Workflow(s)       ← data transformation (maps raw → typed via device.attributes)
        └── Dashboard(s)      ← visualization (keys from device, values from workflow output)
```

**Rules:**
1. **Application first** — must exist before Device, Workflow, or Dashboard can be created
2. **Device is schema authority** — `device.attributes` (field → datatype) is the single source
   of truth for what keys exist. Workflow and Dashboard must not invent keys outside this schema.
3. **Workflow reads schema, writes data** — a Workflow associated with a Device reads
   `device.attributes` to type-cast raw telemetry. Output is patched back to `DeviceState.data`
   via `action:writeDeviceState`.
4. **Dashboard reads schema + data** — Dashboard blocks are built from `device.attributes`
   (for key list / type hints) and `DeviceState.data` (for values, post-workflow enrichment).

## Data Flow
```
POST /devices/:id/states  (raw JSON)
  → DeviceState saved (raw)
  → Workflow fires → reads device.attributes → maps keys → patches DeviceState.data
  → Dashboard polls DeviceState.data → renders typed values per device.attributes schema
```

## Consequences
- New `Application` model needed (name, description, orgId, createdAt)
- Device, Workflow, Dashboard all gain `applicationId` foreign key
- Device creation page becomes the schema design step (attributes = telemetry schema)
- Workflow builder pre-populates available keys from the linked device's `attributes`
- Dashboard builder pre-populates block suggestions from `device.attributes`
- Application creation is the mandatory first step in the UI onboarding flow
