# Week 3.6: Export/Import Workflow

## Objective
Implement JSON export/download and import/upload for workflows with schema validation.

## Scope
- Export: Download current workflow as JSON file
- Import: Upload JSON file to create new workflow
- Schema validation with Zod on import
- Error handling for invalid workflow structure
- UI integration with existing WorkflowToolbar and list page

## Technical Approach
- Export: Browser file download using Blob API
- Import: File input with FileReader API
- Validation: Reuse existing Zod schemas from backend
- Filename format: `workflow-{name}-{timestamp}.json`
- JSON structure matches Workflow API response format

## Implementation Files
**New:**
- `apps/web/lib/utils/workflow-export.ts` - Export/import utilities
- `apps/web/components/workflow/ImportWorkflowButton.tsx` - Import button component

**Modified:**
- `apps/web/app/workflows/[workflowId]/page.tsx` - Wire export handler
- `apps/web/app/workflows/page.tsx` - Add import button to toolbar
- `apps/web/components/workflow/WorkflowToolbar.tsx` - Already has export button

## Key Constraints
- Preserve all workflow metadata (nodes, edges, config, tags)
- Validate node types and edge connections on import
- Handle missing/extra fields gracefully
- ULIDs regenerated on import (prevent collisions)
- Import creates new workflow (not overwrite existing)

## Success Criteria
- Export downloads valid JSON file
- Import validates and creates workflow
- Validation errors show clear messages
- Round-trip: Export → Import → Export produces identical structure
- Dark mode support for import UI

## Architectural Impact
**No** - Uses existing Workflow model and API endpoints
