# ADR-027: Losant-Style Mapping UI for action:writeDeviceState

## Status
Accepted

## Context
The `action:writeDeviceState` node config panel rendered a raw JSON textarea for its
`mappings` field. Users had to hand-write `[{"key":"...","expression":"..."}]` JSON —
error-prone and inconsistent with Losant's individual-fields pattern (the reference UX).
The backend handler already expects `config.mappings: [{key: string, expression: string}]`.

## Decision
Replace the `textarea` with a new `mapping-list` field type that renders a dynamic
Attribute/Expression row grid:
- Column headers: Attribute | Expression
- Per-row inputs with remove (✕) button
- "+ Add Mapping" dashed-border button at bottom
- Attribute column wired to `deviceAttributes` datalist for autocomplete suggestions
- State: `mappingRows: MappingRow[]` local to `NodeConfigPanel`; synced to
  `formData.config.mappings` via `handleFieldChange('config', { ...formData.config, mappings: rows })`
- Reset effect keyed on `selectedNode?.id` to handle node switching

## Consequences
- Better UX: no raw JSON required; inline validation possible per row
- Consistent with backend shape — no backend changes needed
- `deviceAttributes` datalist reused (already computed for `device-field` type)
- Adds `'mapping-list'` to `FieldConfig.type` union; other node schemas unaffected
