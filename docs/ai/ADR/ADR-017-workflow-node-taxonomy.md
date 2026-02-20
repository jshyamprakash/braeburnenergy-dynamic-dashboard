# ADR-017: Workflow Node Taxonomy Alignment (Losant)

## Title
Additive 5-Category Node Taxonomy for Workflow Editor

## Context
The workflow editor launched with 20 nodes across 4 legacy categories (trigger, condition, action,
transform). Evaluation against the Losant IoT Platform taxonomy (6 categories, 182 nodes) revealed:
- `condition:deviceStatus` node is a stub (hardcodes `status === 'online'`, no device polling)
- "Actions" conflates output notifications with data read/write operations
- 4 high-value nodes are absent that leverage already-built services (Modbus, DeviceState)

## Decision
Adopt a 5-category taxonomy: **trigger | logic | data | output | debug**

Strategy: **Additive only** — no migration of stored workflows.
- Legacy type prefixes (`condition:`, `action:`, `transform:`) remain valid in Mongoose enum and engine
- New nodes use new prefixes: `data:*`, `logic:*`
- `condition:deviceStatus` removed from NodePalette UI only (backend enum retained)
- 4 Tier 1 nodes added: `data:modbusRead`, `data:modbusWrite`, `data:queryDeviceStates`, `logic:function`

## Consequences
- Zero breaking changes: stored workflows with legacy node types continue to execute
- Palette shows 5 visual categories; engine handles both old and new prefixes
- `condition:deviceStatus` is deprecated (palette-hidden, not deleted from enum)
- Future nodes should use 5-category prefixes; legacy prefixes are frozen
- `logic:function` uses Node.js `vm` module with 3-second sandbox timeout (security boundary)
