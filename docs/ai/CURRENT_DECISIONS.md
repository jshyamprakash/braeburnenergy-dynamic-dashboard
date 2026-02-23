# CURRENT_DECISIONS: Workflow Variable Binding (ADR-023 Rule 3)

## What Changed

**Frontend Integration — Device Schema Awareness in Workflow Builder:**
- Updated: `workflowSlice.ts` — added `applicationId: string | null` to WorkflowState + Workflow
- Updated: `workflow-variables.ts` — new `getDeviceAttributeVariables()`, extended `getAvailableVariables()` signature
- Updated: `NodeConfigPanel.tsx` — auto-fetch devices when `applicationId` changes, merge attributes, add 'device-field' type
- Updated: `VariablePicker.tsx` — accept `deviceAttributes` prop, render "Device Schema" section with green highlight
- Updated: `NODE_CONFIG_SCHEMAS` — changed 'field' type to 'device-field' in 3 nodes (trigger:deviceStateChange, condition:comparison/threshold)

## Technical Implications

**No Architecture Impact — Pure Frontend Integration:**
- `applicationId` populated from backend Workflow response (already in DB)
- Device attributes fetched from existing `GET /devices?limit=100` endpoint
- Filtered client-side by `applicationId` (no backend changes needed)
- Device field suggestions render via HTML `<datalist>` (native browser autocomplete)

**Data Flow:**
- Load workflow → Redux receives `applicationId` → NodeConfigPanel fetches devices
- Merge all device `attributes` from application → pass to VariablePicker
- VariablePicker adds `trigger.data.*` entries to variable map
- Trigger fields show "Device Schema" section with autocomplete suggestions

**Constraints:**
- Device attributes only available if workflow has `applicationId`
- Frontend filters by `applicationId` (scalable up to 100 devices per fetch)
- Datalist fallback for non-matching input (users can type custom field names)
- No cascade updates when device schema changes (schema fetched per session)

## Next Steps

Task #2 (Frontend) complete. Remaining ADR-023 frontend tasks:
- Task #3: Dashboard Builder Application Scoping (similar integration)
- Task #4: Onboarding Wizard / Demo Flow (exercises full hierarchy)
