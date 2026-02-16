# ADR-012: Vitest + Playwright Test Strategy

## Status
Accepted (2026-02-11)

## Context
- Need fast, TypeScript-native testing for backend and frontend
- Requirements: unit tests, integration tests, E2E tests
- Alternatives: Jest (slower, config heavy), Mocha (no TS native), Cypress (E2E only)

## Decision
Vitest for unit/integration, Playwright for E2E

**Backend (Vitest):**
- 3 unit tests, 8 integration files (63+ tests)
- 100% critical path coverage
- File parallelism OFF (race condition prevention)
- Test DB: `iot_platform_test` with setup/teardown

**Frontend (Playwright):**
- 4 E2E specs, 3 browsers (Chromium, Firefox, WebKit)
- Auto-start dev server

## Consequences

### Positive
- Fast Vite-powered execution
- TypeScript native (no transpilation config)
- Modern API, parallel execution, watch mode
- Cross-browser E2E coverage

### Negative
- Vitest less mature than Jest
- Migration from Jest requires rewriting
- Playwright heavier than Cypress
