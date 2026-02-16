# ADR-005: Fastify Web Framework

## Status
Accepted (2026-02-10)

## Context
- Need high-performance HTTP for IoT telemetry ingestion (10k+ req/sec)
- Requirements: async/await native, schema validation, plugin ecosystem
- Alternative: Express (popular but slower, callback-based)

## Decision
Adopt Fastify 4.25.2 as backend HTTP framework

**Key Features:**
- Plugins: @fastify/cors, @fastify/swagger, @fastify/swagger-ui
- Pino logging (built-in, structured JSON)
- Schema-based validation (JSON Schema + Zod)
- Request ID tracking

## Consequences

### Positive
- 2x faster than Express (native async/await, low overhead)
- Built-in schema validation and OpenAPI generation
- TypeScript-friendly with strong typing
- High throughput for device ingestion
- Decorators for extending instance (e.g., Socket.io)

### Negative
- Smaller ecosystem than Express
- Different plugin architecture (learning curve)
- Less community content for troubleshooting
