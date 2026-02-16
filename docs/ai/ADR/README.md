# Architectural Decision Records (ADRs)

## Purpose
Document major architectural decisions made during IoT Platform development.
Each ADR captures the context, decision, and consequences of implemented choices.

---

## ADR Index

### Database & Storage (4 ADRs)

**ADR-001: MongoDB Migration**
- Decision: MongoDB 8 + Time Series Collections (replaced PostgreSQL + TimescaleDB)
- Context: Client requirement for MongoDB time-series support
- Impact: Database architecture, query patterns, transaction limitations

**ADR-004: EPA-Compliant 5-Year Data Retention**
- Decision: 5-year TTL for device states (157,680,000 seconds)
- Context: EPA 40 CFR Part 141 compliance requirements
- Impact: Storage costs, query performance, compliance posture

**ADR-007: Organization-Scoped Multi-Tenancy**
- Decision: `orgId` on all resources for data isolation
- Context: B2B SaaS model with multiple customers
- Impact: Query filtering, indexes, RBAC integration

**ADR-013: Hybrid Dashboard Storage**
- Decision: localStorage cache + MongoDB persistence
- Context: Offline capability + cross-device sync
- Impact: Sync complexity, instant load, data backup

---

### Backend Framework & Architecture (3 ADRs)

**ADR-005: Fastify Web Framework**
- Decision: Fastify 4.x for high-performance HTTP
- Context: IoT telemetry ingestion requires throughput
- Impact: 2x faster than Express, schema validation, plugin ecosystem

**ADR-006: Clean Layered Architecture**
- Decision: Controllers → Services → Models pattern
- Context: Separation of concerns for maintainability
- Impact: 14 controllers, 22 services, 18 models (clear boundaries)

**ADR-008: ULID for User-Facing Identifiers**
- Decision: ULID (26 chars) for `deviceId`, `workflowId`
- Context: Need sortable, URL-safe, human-readable IDs
- Impact: Dual ID system (_id: ObjectId, deviceId: ULID)

---

### Authentication & Security (2 ADRs)

**ADR-002: JWT Token Session Tracking**
- Decision: Store JTI in database for token revocation
- Context: Stateless JWT cannot be revoked before expiry
- Impact: +10ms per request, immediate logout capability

**ADR-007: Organization-Scoped Multi-Tenancy** (also security)
- Decision: RBAC with organization boundaries
- Impact: Secure data isolation, query filtering

---

### State Management & Frontend (2 ADRs)

**ADR-003: Redux Toolkit State Management**
- Decision: Redux Toolkit with 5 slices (not Zustand)
- Context: Complex state coordination across features
- Impact: Centralized state, time-travel debugging, middleware

**ADR-013: Hybrid Dashboard Storage** (also frontend)
- Decision: localStorage + MongoDB for dashboards
- Impact: Offline capability, cross-device sync

---

### Real-Time & Communication (1 ADR)

**ADR-009: Socket.io for Real-Time WebSocket**
- Decision: Socket.io over native WebSocket
- Context: Room-based subscriptions, auto-reconnect, fallback
- Impact: Device-specific rooms, polling fallback, scalability

---

### Monorepo & Code Sharing (1 ADR)

**ADR-010: Turborepo Monorepo with Shared Types**
- Decision: Turborepo + pnpm + `@repo/types` package
- Context: Frontend/backend type consistency
- Impact: Zero type drift, build caching, workspace dependencies

---

### Validation & Testing (2 ADRs)

**ADR-011: Zod for Schema Validation**
- Decision: Zod for runtime validation with TypeScript inference
- Context: Type-safe validation + OpenAPI generation
- Impact: `zodToSwagger()` integration, field-level errors

**ADR-012: Vitest + Playwright Test Strategy**
- Decision: Vitest (unit/integration) + Playwright (E2E)
- Context: Fast, TypeScript-native testing
- Impact: 63+ backend tests, 20+ E2E scenarios

---

### IoT Integration (1 ADR)

**ADR-014: Industrial Protocol Gateway Architecture**
- Decision: Modbus TCP/RTU + OPC-UA gateways
- Context: Integration with PLCs, SCADA systems
- Impact: Protocol abstraction, auto device registration

---

## ADR Statistics

**Total ADRs:** 14
**Date Range:** 2026-02-10 to 2026-02-16
**Status:** All accepted and implemented

**By Category:**
- Database & Storage: 4
- Backend Architecture: 3
- Authentication & Security: 2
- State Management: 2
- Real-Time: 1
- Monorepo: 1
- Validation & Testing: 2
- IoT Integration: 1

**By Impact:**
- High impact (system-wide): 8 (MongoDB, JWT, Redux, Fastify, Layered Arch, Multi-tenancy, Socket.io, Monorepo)
- Medium impact (feature-level): 4 (ULID, Zod, Testing, Hybrid Storage)
- Domain-specific: 2 (EPA Retention, Industrial Protocols)

---

## ADR Template

```markdown
# ADR-XXX: Title

## Status
Accepted (YYYY-MM-DD)

## Context
- Problem statement
- Requirements
- Alternatives considered

## Decision
What we decided to do

### Implementation
Key technical details

## Consequences

### Positive
Benefits and advantages

### Negative
Drawbacks and trade-offs

### Technical Impact
How it affects the system
```

---

## Maintenance

**When to create an ADR:**
- Major framework/library choice
- Architectural pattern adoption
- Database schema design decisions
- Security/compliance implementation
- Significant trade-off between alternatives

**When NOT to create an ADR:**
- Minor implementation details
- Tactical code changes
- Bug fixes
- Refactoring without architectural change
- Feature additions using existing patterns

**Review cycle:** ADRs are living documents. Update when:
- Consequences are discovered in production
- Migration/deprecation occurs
- New context invalidates original decision

---

Last updated: 2026-02-16
