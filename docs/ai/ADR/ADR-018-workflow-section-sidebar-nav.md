# ADR-018: Workflow Section Sidebar Navigation

## Title
Context-sensitive sidebar navigation for workflow section (Losant pattern)

## Context

Current navigation: flat top navbar (Navigation.tsx in layout.tsx) — no
context-sensitive submenu. Losant reference shows a left sidebar with workflow-
specific sub-navigation when inside a workflow (Canvas, Execution Log, Settings).
Current /workflows/[id] page contains canvas + execution history as inline panels.

## Decision

Add Next.js nested layout for /workflows/[workflowId] that renders a left
sidebar showing workflow-specific submenu items:

- **Canvas** → /workflows/[workflowId] (current React Flow builder)
- **Executions** → /workflows/[workflowId]/executions (dedicated history page)
- **Settings** → /workflows/[workflowId]/settings (dedicated metadata page)

Global top navbar retained unchanged. Sidebar only applies within workflow context.
Execution history panel inside canvas page migrated to /executions sub-route.
Settings modal inside canvas page migrated to /settings sub-route.

## Consequences

New files:
- apps/web/app/workflows/[workflowId]/layout.tsx — sidebar layout wrapper
- apps/web/app/workflows/[workflowId]/executions/page.tsx — execution history
- apps/web/app/workflows/[workflowId]/settings/page.tsx — settings form

Modified:
- apps/web/app/workflows/[workflowId]/page.tsx — remove inline panels/modals
- ARCH_SUMMARY.md — update "Routes: /workflows/:id" to reflect sub-routes
