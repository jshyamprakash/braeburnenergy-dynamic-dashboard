# ADR-011: Zod for Schema Validation

## Status
Accepted (2026-02-10)

## Context
- Need runtime validation with TypeScript type inference
- Requirements: type safety, error messages, OpenAPI integration
- Alternative: Joi (no TS inference), Yup (weaker types), class-validator (decorators)

## Decision
Adopt Zod for schema validation with TypeScript inference

**Pattern:**
```typescript
const schema = z.object({ name: z.string().min(1) });
type DTO = z.infer<typeof schema>;
```

**Integration:**
- Validation: `schema.parse(request.body)`
- OpenAPI: `zodToSwagger(schema)`
- 4 schema files: device, device-state, organization, workflow

## Consequences

### Positive
- Type inference (no manual type definitions)
- Runtime validation + compile-time types
- Composable schemas (reuse patterns)
- Field-level error messages
- OpenAPI generation via zodToSwagger

### Negative
- Learning curve (Zod API)
- Error messages need transformation (verbose raw)
- No native JSON Schema (requires conversion)
