# CURRENT_TASK

## Task: Workflow Node Taxonomy Alignment (Losant) + Tier 1 Priority Nodes

**Goal:** Align node taxonomy with Losant 5-category model. Remove stub node. Add 4 high-value nodes.

**Architectural Impact:** Yes — new node type prefixes (data:*, logic:*). Documented in ADR-017.

**Additive strategy:** Legacy type prefixes retained for backwards compatibility.

**Files Changed:**
1. `docs/ai/ADR/ADR-017-workflow-node-taxonomy.md` — CREATE
2. `packages/types/src/index.ts` — ADD NodeType union export
3. `apps/api/src/models/workflow.model.ts` — ADD 4 enum values + update NodeType union
4. `apps/api/src/services/workflow-node-handlers.service.ts` — ADD 4 switch cases + implementations
5. `apps/web/components/workflow/NodePalette.tsx` — REMOVE condition:deviceStatus, ADD 4 nodes in 2 new sections
6. `apps/web/lib/store/slices/workflowSlice.ts` — ADD defaultNodeConfig export

**Status:** COMPLETE — build verified, no new TypeScript errors introduced
