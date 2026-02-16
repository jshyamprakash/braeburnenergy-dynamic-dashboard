# ADR-001: MongoDB Migration from PostgreSQL

## Status
Accepted (2026-02-12)

## Context
- Initial POC used PostgreSQL 16 + Prisma + TimescaleDB
- Client requested MongoDB time-series support
- Project in early POC stage (low migration cost)

## Decision
Migrate entire backend to MongoDB 8 + Mongoose + Time Series Collections

### Changes
- Database: PostgreSQL 16 → MongoDB 8
- ORM: Prisma 5.x → Mongoose 8.x
- Time-series: TimescaleDB hypertables → MongoDB Time Series Collections
- IDs: UUID (36 chars) → ObjectId (24 hex chars)
- Retention: TimescaleDB jobs → MongoDB TTL indexes
- Connection: Replica set required (even for local dev)

## Consequences

### Positive
- Native time-series support without extension
- Document flexibility for device metadata
- Simpler deployment (no TimescaleDB setup)
- Better horizontal scaling for IoT workloads

### Negative
- No FK constraints (manual validation in controllers)
- Transactions don't support Time Series deletes (use sequential)
- Replica set required even for local dev
- Must use `.lean()` for performance (type casting needed)
- Migration: 8 phases, 63/63 tests passing
