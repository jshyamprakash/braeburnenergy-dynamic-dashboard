# Week 3.6 Feature Tasks (Max 15)

## Phase 1: Export Functionality
1. Create `workflow-export.ts` utility with `exportWorkflowToJSON()` function
2. Implement file download with Blob API and auto-generated filename
3. Wire `handleExport()` in builder page to call export utility
4. Add toast notification on successful export
5. Test: Export workflow → verify JSON structure matches API format

## Phase 2: Import Validation
6. Create Zod schema for imported workflow JSON (reuse backend schemas)
7. Implement `validateImportedWorkflow()` function with error details
8. Handle ULID regeneration for workflowId to prevent collisions
9. Test: Import invalid JSON → verify clear error messages

## Phase 3: Import UI Component
10. Create `ImportWorkflowButton.tsx` with file input (hidden) + styled button
11. Add FileReader logic to parse uploaded JSON file
12. Show validation errors in modal or toast with specific field errors
13. On success: redirect to builder page with imported workflow

## Phase 4: Integration & Polish
14. Add import button to workflows list page toolbar (next to "Create Workflow")
15. Test round-trip: Export workflow → Import → Verify nodes/edges/config identical
