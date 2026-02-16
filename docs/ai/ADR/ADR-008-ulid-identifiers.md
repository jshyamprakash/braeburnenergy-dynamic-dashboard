# ADR-008: ULID for User-Facing Identifiers

## Status
Accepted (2026-02-10)

## Context
- Need user-facing IDs that are sortable, URL-safe, and human-readable
- Requirements: time-ordered, short, collision-resistant
- Alternatives: UUID (36 chars, not sortable), ObjectId (not URL-friendly)

## Decision
Use ULID for user-facing identifiers: `deviceId`, `workflowId`

**Characteristics:**
- 26 chars (vs UUID 36), time-sortable, URL-safe, case-insensitive
- Example: `01HGW5N8XZ7KQRST9VW2XY3Z4A`

**Dual ID System:**
- `_id: ObjectId` (internal MongoDB), `deviceId: ULID` (user-facing)
- Both indexed for fast lookups

## Consequences

### Positive
- Shorter URLs than UUID
- Time-ordered without extra timestamp field
- Copy-paste friendly (no dashes)
- Collision-resistant (128-bit randomness)

### Negative
- Dual ID complexity
- Application-layer generation (not database)
- Reveals creation time (minor info leak)
