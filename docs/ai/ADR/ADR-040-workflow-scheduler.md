# ADR-040: Workflow Scheduler Daemon

## Title
Background cron-based execution of trigger:scheduled workflows

## Context
The trigger:scheduled node type and cron configuration UI allow users to configure
cron schedules, but workflows only executed on manual trigger. A daemon is needed to
fire them automatically on schedule.

## Decision
- WorkflowSchedulerService singleton (pattern: modbusGatewayManager)
- node-cron library for in-process cron scheduling
- Cron expression read from triggerNode.data.config.cronExpression (NOT workflow.schedule field)
- Timezone from triggerNode.data.config.timezone (IANA format, default UTC)
- On startup: load all isEnabled=true, triggerType='trigger:scheduled' workflows
- On PATCH workflow: rescheduleWorkflow() re-fetches and re-registers
- On DELETE workflow: unscheduleWorkflow() stops the job
- Graceful shutdown: stop() destroys all tasks before process exit

## Consequences
- Scheduled workflows auto-execute without manual intervention
- Single-process only — no distributed locking (acceptable for POC single-node deployment)
- Scheduler re-syncs from DB on restart (no in-memory persistence needed)
- Invalid cron expressions are skipped with warning (no hard failure at startup)
- timezone field must be valid IANA zone string (node-cron validates at schedule time)
