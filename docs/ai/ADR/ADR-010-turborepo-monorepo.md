# ADR-010: Turborepo Monorepo with Shared Types

## Status
Accepted (2026-02-09)

## Context
- Need shared TypeScript types between frontend and backend
- Requirements: type safety, build caching, independent deployments
- Alternative: Separate repos (type drift), Nx (complex), Lerna (unmaintained)

## Decision
Implement Turborepo 1.13.4 monorepo with `@repo/types` shared package

**Structure:**
```
iot-platform/
├── apps/api/          # Fastify backend
├── apps/web/          # Next.js frontend
└── packages/types/    # Shared types
```

**Build:** pnpm workspaces + Turborepo caching + parallel execution

## Consequences

### Positive
- Zero type drift (single source of truth)
- Build caching (only rebuild changed packages)
- Parallel builds (faster CI/CD)
- Workspace dependencies (no npm publish)
- Single `pnpm install` for all packages

### Negative
- Monorepo complexity (workspace understanding needed)
- Single lock file (larger size)
- Harder to extract packages later
