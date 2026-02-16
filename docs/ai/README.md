# AI Memory Repository

## Purpose
Memory-optimized documentation for AI-assisted development.
Replaces reliance on chat history with repository-based knowledge.

## Structure

### `ARCH_SUMMARY.md`
- Max 40 lines
- Constraints-only (no explanations)
- Single source of truth for architecture
- Update after architectural discussions

### `ADR/` (Architectural Decision Records)
- Format: `ADR-XXX-short-title.md`
- Document significant architectural changes
- Include: Context, Decision, Consequences

### `CURRENT_FEATURE.md`
- Active feature specification
- Goal, status, scope, dependencies
- Clear when feature completes

### `FEATURE_TASKS.md`
- Task breakdown for current feature
- Generated when implementation starts
- Tracks completion status

### `CURRENT_DECISIONS.md`
- Compressed decisions from completed features
- Updated after each feature completion
- Prevents decision drift

## Usage Rules
1. Never rely on chat history for architecture
2. Always check ARCH_SUMMARY.md first
3. Create ADR for significant changes
4. Keep documents short and factual
5. Clear CURRENT_FEATURE.md after completion
