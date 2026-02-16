# ADR-016: Docker Multi-Stage Builds

## Status
Accepted (2026-02-11)

## Context
- Need production-ready containers for API and frontend
- Requirements: small image size, fast builds, security (no dev dependencies)
- Alternative: Single-stage build (larger images, includes dev tools)

## Decision
Implement multi-stage Docker builds with 3 stages: deps → builder → runner

**Stages:**
1. **deps:** Install dependencies (pnpm workspace)
2. **builder:** Build TypeScript/Next.js (with source + node_modules)
3. **runner:** Production runtime (only dist + prod dependencies)

**Optimization:**
- Alpine Linux base (smaller size)
- Layer caching (separate dependency install)
- .dockerignore excludes node_modules, .git, docs

## Consequences

### Positive
- 60-70% smaller images (no dev dependencies, no source)
- Faster CI/CD (layer caching)
- More secure (no build tools in production)
- Separate concerns (build vs runtime)

### Negative
- More complex Dockerfile (3 stages)
- Longer initial build (no cache)
- Debugging harder (source not in production image)
