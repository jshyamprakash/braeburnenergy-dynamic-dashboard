# ADR-002: JWT Token Session Tracking

## Status
Accepted (2026-02-14)

## Context
- Initial JWT implementation: stateless tokens with expiry
- Problem: Tokens couldn't be revoked before expiry (security risk)
- Use case: Immediate logout, "logout all devices", compromised token invalidation

## Decision
Store JWT sessions in database with JTI (JWT ID) validation

### Implementation
- TokenSession model tracks all issued tokens
- JTI generated and stored on login/refresh
- Every token verification checks database for revocation
- Logout revokes specific token by JTI
- Logout-all revokes all user tokens by userId

## Consequences

### Positive
- Tokens revocable immediately (no "zombie tokens")
- Session management UI (view/revoke sessions)
- Compromised tokens invalidated instantly
- Track active sessions (IP, user agent, timestamps)
- Audit trail for login/logout events

### Negative
- +10ms per request (database JTI lookup, acceptable for security)
- Database dependency for verification
- TokenSession collection grows (TTL index auto-cleanup)
- JTI must be unique, stored on issue, validated on every request
