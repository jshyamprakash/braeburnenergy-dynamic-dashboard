# ADR-042 — Workflow Node Library Expansion (Switch/Loop/Delay/Mutate/Storage/OPC-UA)

## Context

Gap analysis against Losant 184-node catalog identified 8 high-value nodes absent from current 24-node set:
- `logic:switch`: N-way routing (current binary conditionMet pattern insufficient)
- `logic:loop`: Array iteration with single-node body
- `logic:delay`: Pause execution (Promise-wrapped setTimeout, capped 30s)
- `logic:mutate`: Payload field manipulation (set/delete/copy/rename)
- `data:storageGet`/`data:storageSet`: Durable cross-execution KV store (requires new WorkflowStorage collection)
- `data:opcuaRead`/`data:opcuaWrite`: OPC-UA reads/writes (reuse existing OpcuaGatewayManager)

## Decision

1. Add 8 NodeType enum values (backend + shared types)
2. Create WorkflowStorage MongoDB collection: `{ orgId ObjectId, key string, value Mixed, workflowId? ObjectId, expiresAt? Date, updatedAt Date }` with compound unique index `{ orgId, key }` and TTL on expiresAt
3. Add `switchBranch?: string` to NodeExecutionResult interface
4. Modify WorkflowEngineService.executeNode(): check `logic:switch` BEFORE condition; match edge.sourceHandle === result.switchBranch, fallback to 'default'
5. Add readNode(gatewayId, nodeId) and writeNode(gatewayId, nodeId, value) to OpcuaGatewayManager (reuse running instance or transient connect)
6. Implement logic:loop as sequential iteration of a single node per array item

## Consequences

- Engine gains third routing branch: conditionMet (binary) / switchBranch (N-way) / default (fan-out)
- WorkflowStorage is new persistent collection; no impact on existing collections
- Frontend requires new SwitchNode React Flow component with dynamic source handles per case
- OpcuaGatewayManager gains 2 additive methods; existing polling behavior unchanged
- logic:loop is POC-grade (sequential, max 100 items, single-node body, no sub-graph support)
- Backwards compatible: existing workflows unaffected; new nodes opt-in via palette
