# docs/ai/FORMAT_RULES.md
# Communication Format Reference
# For: Shyam (human reader) + all models

---

## The Simple Rule

**If a human reads it → Natural Language**
**If a model reads it → LLAMP-SPEC v1**

---

## Document Format Map

| Document | Reader | Format | Notes |
|---|---|---|---|
| ARCH_SUMMARY.md | You | Natural language | Architecture in plain English for you |
| TASK_HISTORY.md | You + Models | Natural language | Backlog and history you can read |
| ADR/*.llamp | Models | LLAMP-SPEC v1 | Decisions stored in shorthand |
| AI_PROTOCOL.llamp | Models | LLAMP-SPEC v1 | Operating rules for Haiku/Sonnet |
| CURRENT_TASK.md | Models | LLAMP-SPEC v1 | Active task instructions for Haiku |
| FEATURE_TASKS.md | Models | LLAMP-SPEC v1 | Sub-tasks list for Haiku |
| CURRENT_DECISIONS.md | Models | LLAMP-SPEC v1 | Recent decision context for models |
| HAIKU_ANCHOR.md | Haiku | Natural language | Exception: Haiku needs plain English to bootstrap |

---

## When Models Talk to You

All model responses, proposals, questions, confirmations → **Natural language always.**

Examples:
- Task candidate proposals → Natural language
- ADR confirmation ("ADR-003 created") → Natural language
- Drift detection report → Natural language
- Anchor confirmation → Natural language

---

## ADR Confirmation Flow

When Sonnet creates an ADR:
1. Explains to you in natural language what decision was made and why
2. Creates `ADR-XXX.llamp` in LLAMP-SPEC v1 (for models)
3. Updates `ARCH_SUMMARY.md` in natural language (for you) if needed
4. Confirms to you in natural language: "ADR-003 created. ARCH_SUMMARY updated."

---

## Exception: HAIKU_ANCHOR.md

This file is natural language because it is the **bootstrap** — Haiku reads it
before it knows it is in LLAMP-SPEC mode. Once anchored, all subsequent
task files (CURRENT_TASK.md etc.) are LLAMP-SPEC v1.

---

*FORMAT_RULES.md — human readable | do not convert to llamp-spec*
