# ADR-006: Clean Layered Architecture

## Status
Accepted (2026-02-10)

## Context
- Need clear separation of concerns for maintainability
- Requirements: testable business logic, swappable data layer
- Alternative: MVC pattern, feature-based organization

## Decision
Implement clean layered architecture: Controllers → Services → Models

**Layer Responsibilities:**
- Controllers (14): HTTP handling, validation, error formatting
- Services (22): Business logic, transactions, no HTTP concerns
- Models (18): Mongoose schemas, data access, queries

## Consequences

### Positive
- Clear responsibility boundaries
- Business logic independent of HTTP
- Services testable without Fastify
- Swappable persistence layer
- Easier onboarding

### Negative
- More boilerplate (3 files per feature)
- Indirection between layers
- Potential over-engineering for simple CRUD
