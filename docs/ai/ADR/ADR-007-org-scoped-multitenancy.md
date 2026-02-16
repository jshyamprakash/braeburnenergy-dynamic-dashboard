# ADR-007: Organization-Scoped Multi-Tenancy

## Status
Accepted (2026-02-12)

## Context
- B2B SaaS model requires data isolation between customers
- Requirements: secure separation, RBAC integration, shared infrastructure
- Alternative: Database-per-tenant (more isolation, higher cost)

## Decision
Implement organization-scoped multi-tenancy with `orgId: ObjectId` on all resources

**Implementation:**
- 8 models scoped: Devices, Users, Workflows, Dashboards, Alarms, etc.
- Compound indexes: `(orgId, deviceId)`, `(orgId, isEnabled, updatedAt)`
- Middleware: `requireSameOrganization()` enforces scope
- SuperAdmin can access all organizations

## Consequences

### Positive
- Cost-effective shared infrastructure
- Simple deployment (single database)
- Cross-org analytics possible (SuperAdmin)
- Easy onboarding

### Negative
- Requires diligent query filtering (security risk if missed)
- Index bloat (orgId in every compound index)
- No hard isolation (application-level only)
- Integration tests verify orgId filtering
