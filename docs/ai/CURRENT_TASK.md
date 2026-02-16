# Week 3.7: Settings Modal

## Objective
Create modal component for editing workflow metadata (name, description, tags, priority, enabled status).

## Scope
- Modal dialog triggered by toolbar Settings button
- Form with controlled inputs for all editable workflow properties
- Client-side validation with inline error messages
- Update via PATCH `/workflows/:id` endpoint (existing)
- Redux state sync on successful update
- Toast notifications for success/error
- Dark mode support

## Technical Approach
- Modal component with overlay (similar to ExecutionInputModal pattern)
- React controlled form with useState for form state
- Validation: name required, description max 500 chars, tags max 50 items
- Priority dropdown: HIGH/MEDIUM/LOW
- Enabled status toggle switch
- Tags input with add/remove UI (comma-separated or chip-based)
- API call via apiClient.patch() on submit
- Dispatch Redux action to sync state after successful update

## Implementation Files
**New:**
- `apps/web/components/workflow/SettingsModal.tsx` - Modal component

**Modified:**
- `apps/web/app/workflows/[workflowId]/page.tsx` - Wire handleSettings, add modal state
- `apps/web/lib/store/slices/workflowSlice.ts` - Add updateMetadata action (optional, may use loadWorkflow)

## Key Constraints
- Name: 1-100 characters (required)
- Description: 0-500 characters (optional)
- Tags: max 50 tags, each 1-100 characters
- Priority: enum HIGH/MEDIUM/LOW
- Enabled: boolean toggle
- Form resets on close without saving
- Unsaved changes warning if user closes modal

## Success Criteria
- Settings button opens modal with current workflow values
- Form validation prevents invalid submissions
- Successful update refreshes Redux state
- Toast notifications for success/error
- Modal closes on successful save or cancel
- Dark mode styling consistent with app

## Architectural Impact
**No** - Uses existing PATCH endpoint and Redux patterns
