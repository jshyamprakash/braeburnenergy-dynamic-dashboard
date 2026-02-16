# Week 3.6 Implementation Decisions

## What Changed

### 1. Export Utility Module (New)
- Created `workflow-export.ts` with `exportWorkflowToJSON()` function
- Blob API for browser file download
- ULID generation via `ulid()` package (already available)
- JSON structure preserves all workflow metadata
- Filename format: `workflow-{name}-{date}.json`

### 2. Import Validation Functions (New)
- `validateImportedWorkflow()`: Validates entire workflow structure
- `validateNodes()`: Checks node array for valid IDs/types/positions
- `validateEdges()`: Ensures all edge refs point to existing nodes
- `formatFileSize()`: Helper for displaying file sizes
- File size limit: 5MB (prevents large uploads)

### 3. ImportWorkflowButton Component (New)
- Hidden file input + styled button
- Accepts `.json` files only
- Uses FileReader API for parsing
- Calls validation before creating workflow
- Creates new workflow via POST `/workflows`
- Redirects to builder on success
- Error toasts with detailed messages
- Loading state with spinner

### 4. Integration Points
- Export handler wired to WorkflowToolbar button
- Import button added to workflows list page (next to "New Workflow")
- Redux state selector expanded to include all workflow metadata
- No architectural changes: uses existing API endpoints

### 5. Validation Strategy
- Frontend: Manual validation (no Zod needed for this component)
- Backend: Existing schemas already enforce rules
- ULID regeneration on import prevents ID collisions
- Edge validation ensures workflow structure integrity
- Comprehensive error messages help users fix issues

## Technical Implications

### Positive
- Users can share workflows as JSON files
- Backup/recovery mechanism built-in
- No new API endpoints needed
- Validation prevents corrupted workflows
- ULID regeneration safe for multi-environment

### Constraints
- File size limited to 5MB (reasonable for workflow JSON)
- Must parse JSON before validation (stream parsing not needed)
- Edge validation references must use exact node IDs
- No migration for old workflow formats

## File Structure

**New Files:**
- `apps/web/lib/utils/workflow-export.ts` (280 lines)
- `apps/web/components/workflow/ImportWorkflowButton.tsx` (156 lines)

**Modified Files:**
- `apps/web/app/workflows/[workflowId]/page.tsx` (import + selector)
- `apps/web/app/workflows/page.tsx` (import button integration)

## Build Status

✓ Production build: 4.9s, zero TypeScript errors
✓ All routes compile successfully
✓ No new dependencies required
✓ Validation tests: 5/5 pass
✓ Round-trip test: PASS
