# ADR-009: Socket.io for Real-Time Communication

## Status
Accepted (2026-02-11)

## Context
- Need real-time device state updates for dashboards
- Requirements: room-based subscriptions, auto-reconnect, fallback transports
- Alternative: Native WebSocket (less features), Server-Sent Events (one-way)

## Decision
Adopt Socket.io 4.6.0 for bidirectional real-time communication

**Implementation:**
- Transports: WebSocket (primary), Polling (fallback)
- Room architecture: `device:${deviceId}` (per-device), `all-devices` (global)
- Events: `device:state:update`, `device:status`, `alarm:triggered`
- Subscription model: `subscribe:device`, `unsubscribe:device`

## Consequences

### Positive
- Automatic reconnection (exponential backoff)
- Room-based pub/sub (efficient filtering)
- Polling fallback (works through firewalls)
- Binary data support (future protocol buffers)
- Middleware support (auth, logging)

### Negative
- Larger bundle size than native WebSocket
- Sticky sessions needed for horizontal scaling
- Debugging harder than HTTP
- Future: Redis adapter for multi-server
