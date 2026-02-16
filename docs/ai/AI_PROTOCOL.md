# AI Operating Protocol

Claude must operate in memory-optimized mode.

Architecture authority:
- docs/ai/ARCH_SUMMARY.md
- docs/ai/ADR/

## Architecture Drift Detection

Before implementing any feature or structural refactor:

1. Compare current codebase against ARCH_SUMMARY.md.
2. Identify architectural deviations.
3. If deviation exists:
   - Propose whether ARCH_SUMMARY must be updated.
   - Propose whether new ADR must be created.
4. Never modify architecture files silently.
5. Always request confirmation before updating ARCH_SUMMARY or ADRs.

## Feature Execution Rules

For any new feature:
- Generate CURRENT_FEATURE.md
- Generate FEATURE_TASKS.md
- Confirm no architectural impact.

Architecture changes require explicit ADR creation.
