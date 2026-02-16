# ADR-015: Next.js App Router

## Status
Accepted (2026-02-09)

## Context
- Next.js 13+ offers two routing systems: Pages Router (legacy) and App Router (new)
- Requirements: React Server Components, streaming, nested layouts, better DX
- Alternative: Pages Router (stable, more examples, easier migration from v12)

## Decision
Adopt Next.js 16 App Router with React Server Components

**Key Features:**
- `app/` directory structure (not `pages/`)
- Server Components by default (opt-in to Client Components with 'use client')
- Nested layouts with `layout.tsx`
- Streaming with Suspense boundaries
- Turbopack dev server (faster than Webpack)

## Consequences

### Positive
- React Server Components reduce client bundle size
- Nested layouts eliminate prop drilling
- Streaming improves perceived performance
- Better TypeScript support
- Turbopack faster dev server (2x faster HMR)

### Negative
- Learning curve (Server vs Client Components)
- Less community content (newer feature)
- Some libraries incompatible with RSC
- Migration complexity if reverting to Pages Router
