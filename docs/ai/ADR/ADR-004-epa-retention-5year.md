# ADR-004: EPA-Compliant 5-Year Data Retention

## Status
Accepted (2026-02-13)

## Context
- Initial POC planned: 90-day TTL
- EPA 40 CFR Part 141: Minimum 5-year retention for water quality data
- Client requirement: Full EPA/AWWA compliance from POC stage

## Decision
Implement 5-year TTL for device states via MongoDB Time Series Collections

**Configuration:**
```typescript
expireAfterSeconds: 157680000  // 5 years
```

**Tiered Storage:**
- Hot (0-30d), Warm (31-90d), Cold (91d-5y)
- Audit logs: 10 years (21 CFR Part 11)
- Workflow executions: 90 days

## Consequences

### Positive
- Full EPA/AWWA M36 compliance from day 1
- Historical trend analysis (5 years)
- No future data migration needed
- Time Series Collections optimize storage via compression

### Negative
- Higher storage costs (5 years vs 90 days)
- Slower queries for cold data (>90 days)
- Longer backup/restore times
- Mitigated by tiered storage and proper indexing
