# ADR-003: Redux Toolkit State Management Migration

## Status
Accepted (2026-02-14)

## Context
- Initial POC planned: TanStack Query (server state) + Zustand (client state)
- Reality: Redux Toolkit became primary for complex state coordination
- Need centralized, predictable state management across features

## Decision
Adopt Redux Toolkit with 5 domain slices: auth, ui, dashboard, websocket, workflow

**Key Features:**
- Type-safe async thunks with explicit generics
- Hybrid persistence (localStorage + MongoDB for dashboards)
- Automatic online/offline sync
- Middleware support for side effects

## Consequences

### Positive
- Centralized state with single source of truth
- Time-travel debugging (Redux DevTools)
- Type-safe async operations
- Better cross-feature coordination
- TanStack Query still used for device queries

### Negative
- More boilerplate than Zustand
- Learning curve for Redux patterns
- Slightly larger bundle size
- Zustand deprecated (migration needed)
