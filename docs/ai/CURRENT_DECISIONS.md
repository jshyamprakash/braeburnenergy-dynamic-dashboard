---
title: ADR-059 Implementation Complete
date: 2026-04-17
---

# ADR-059 Alarm Notification Channels + Escalation Policies — COMPLETE

## What Changed

Implemented full alarm notification + escalation system (backend T01-T10, frontend T11-T15).

**Backend (Sonnet):**
- NotificationChannel model: email/webhook/in-app with org-scoped config
- EscalationPolicy model: org-wide or rule-specific with dynamic tiers
- AlarmNotificationService: Fire-and-forget dispatch, 3 channel types
- AlarmEscalationService: 60s cron poll, idempotent tier escalation
- Admin+ RBAC gates on all CRUD endpoints

**Frontend (Haiku):**
- useAlarmNotifications hook: React Query mutations for channels/policies
- NotificationChannelModal: Type-specific config (email to, webhook url/headers, in-app empty)
- EscalationPolicyModal: Dynamic tier builder with delay/severity/channels
- /alarm-management page: Tabbed interface, tables, CRUD actions, Admin+ gate
- Sidebar nav: Bell icon + Admin-only filtering

## Constraints Introduced

1. **Async notification dispatch:** Notifications sent fire-and-forget to prevent ingest blocking
2. **Idempotent escalation:** escalatedTiers[] array prevents duplicate dispatch on poll races
3. **Admin+ gate:** Both frontend (hidden sidebar link) and backend (403 if not admin) enforce access
4. **Optional alarmRuleId:** Org-wide policies default; rule-specific requires alarmRuleId
5. **SMTP stub mode:** Email disabled if SMTP_HOST unset (test/dev environments)

## Technical Implications

- **Database:** 2 new collections (NotificationChannel, EscalationPolicy), 1 field added (escalatedTiers)
- **API:** 10 new endpoints (5 per resource), follow pattern of devices/dashboards
- **Frontend state:** React Query caching, refetchInterval 30s for list queries
- **Services:** Singleton pattern with lifecycle (start/stop) for cron service
- **Notifications:** 3 independent channels; failures isolated (not cascade)

## No Architecture Changes

ADR-059 follows existing fire-and-forget + cron service patterns (ADR-041, ADR-020).
ARCH_SUMMARY.md unchanged. All code within scope constraints.

Task complete. Ready for next capability.
