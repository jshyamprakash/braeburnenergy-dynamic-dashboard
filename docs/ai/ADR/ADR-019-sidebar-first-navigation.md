# ADR-019: Sidebar-First Navigation Architecture

## Title
Convert top navigation to persistent left sidebar with collapsible menus and canvas-based workflow editing

## Context

Current architecture (ADR-018): Nested sidebar under workflow context (not viable)

Desired: Sidebar-first pattern matching Losant reference (docs/images/menu_example1.png)
- **Main sidebar (250px):** Hamburger (☰) expand / left arrow (←) collapse at top
- **Sub-menus:** Right arrow (▶) expand / left arrow (←) collapse at top
- **All top nav items** → main sidebar (Dashboard, Devices, Workflows, Alarms, Audit Logs, etc.)
- **Canvas layout:** React Flow + right-side settings panel + top toolbar (Save, Deploy, ⋮ menu)
- **Save vs Deploy:** Save = persist to database, Deploy = execute/trigger workflow
- **Workflow types:** Application, Experience, Embedded, Edge (dropdown in create form)

## Decision

**Phase 1: Navigation Refactor (Sidebar Infrastructure)**
- Create Sidebar component (250px, sticky left, collapsible)
  - Hamburger icon (top-left) to expand/collapse main menu
  - Sub-menu items have ▶/← toggle at top
  - Menu items: Dashboard, Devices, Workflows, Alarms, Audit Logs, Settings, etc.
  - User profile menu: Retain in top-right corner (avatar dropdown)
- Refactor root layout.tsx: `flex` with sidebar + main content
- Remove global top Navigation component

**Phase 2: Workflow Section (Modal-Based CRUD + Canvas)**
- `/workflows` page: List table (name, type, created, modified, status)
  - "Add Workflow" button → CreateWorkflowModal
  - Modal fields: name (required), type (Application|Experience|Embedded|Edge), description
  - List actions: Edit (edit modal), Delete, Run/Execute
- `/workflows/:id` page: Full-width canvas + right-side settings panel
  - **Left side:** React Flow canvas (drag-drop nodes)
  - **Right side:** Settings panel with form fields:
    - Name (text)
    - Type (dropdown: Application|Experience|Embedded|Edge)
    - Description (textarea)
    - Priority (optional)
    - Enabled toggle (optional)
    - [Update] button to save settings
  - **Top toolbar:** [Save] [Deploy] [⋮ Menu]
    - Save: Persist canvas + settings to database
    - Deploy: Execute workflow (trigger execution)
    - ⋮ Menu: Export, Execution History (modal), Validation (panel)

**Phase 3: Other Sections (Consistent Pattern)**
- Apply modal-based CRUD pattern to Devices, Alarms, Audit Logs, etc.

## Consequences

**Breaking Changes:**
- Remove `/workflows/[workflowId]/layout.tsx` (nested sidebar from ADR-018)
- Remove `/workflows/[workflowId]/executions/page.tsx` (move to modal in canvas)
- Remove `/workflows/[workflowId]/settings/page.tsx` (move to right-side panel)
- Remove top-level Navigation component
- Routing simplified: Keep only `/workflows` and `/workflows/[id]`

**New Files:**
- `components/navigation/Sidebar.tsx` - Main sidebar with collapsible menu
- `components/workflow/CreateWorkflowModal.tsx` - Workflow creation/edit form
- `components/workflow/SettingsPanel.tsx` - Right-side workflow settings panel
- `components/workflow/ExecutionHistoryModal.tsx` - Execution history viewer (modal)

**Modified Files:**
- `app/layout.tsx` - Add sidebar, remove top nav, flex layout
- `app/workflows/page.tsx` - List + "Add Workflow" button + modal
- `app/workflows/[id]/page.tsx` - Canvas + settings panel + toolbar (no nested layout.tsx)
- `lib/store/slices/workflowSlice.ts` - Add workflowSettings state for right panel

**File Deletions:**
- `app/workflows/[workflowId]/layout.tsx` ✗
- `app/workflows/[workflowId]/executions/page.tsx` ✗
- `app/workflows/[workflowId]/executions/` (directory) ✗
- `app/workflows/[workflowId]/settings/page.tsx` ✗
- `app/workflows/[workflowId]/settings/` (directory) ✗
- `components/workflow/ExecutionPanel.tsx` ✗ (replace with modal)
- `components/workflow/SettingsModal.tsx` ✗ (replace with right-side panel)

## Implementation Order

1. Create Sidebar component with collapsible menu structure
2. Update root layout.tsx (flex + sidebar + main area)
3. Remove top Navigation component
4. Create CreateWorkflowModal component
5. Refactor /workflows page (list + modal integration)
6. Create SettingsPanel component (right-side form)
7. Create ExecutionHistoryModal component (modal for history)
8. Refactor /workflows/[id]/page.tsx (canvas + panels + toolbar)
9. Add toolbar components (Save, Deploy, Menu)
10. Delete deprecated files and sub-directories
11. Verify build and routing
