import * as cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import type { Logger } from 'pino';
import { Workflow } from '../models/workflow.model';
import type { WorkflowEngineService } from './workflow-engine.service';

/**
 * WorkflowSchedulerService
 *
 * Background daemon for executing trigger:scheduled workflows on cron schedule.
 * Reads cron expression and timezone from triggerNode.data.config.
 * Starts on app startup, re-syncs on workflow updates, stops on graceful shutdown.
 */
export class WorkflowSchedulerService {
  private jobs: Map<string, ScheduledTask> = new Map();
  private engine?: WorkflowEngineService;
  private logger?: Logger;

  /**
   * Start scheduler daemon.
   * Loads all enabled workflows with trigger:scheduled and schedules them.
   */
  async start(engine: WorkflowEngineService, logger: Logger): Promise<void> {
    this.engine = engine;
    this.logger = logger;

    const workflows = await Workflow.find({
      isEnabled: true,
      triggerType: 'trigger:scheduled',
    }).lean();

    let scheduled = 0;
    for (const workflow of workflows) {
      const ok = this.scheduleWorkflow(workflow);
      if (ok) scheduled++;
    }

    this.logger.info({ scheduled, total: workflows.length }, 'Workflow scheduler started');
  }

  /**
   * Schedule a single workflow using its cron expression.
   * Returns true if successfully scheduled, false otherwise.
   */
  scheduleWorkflow(workflow: any): boolean {
    if (!this.engine || !this.logger) return false;

    // Extract cron config from trigger:scheduled node
    const triggerNode = workflow.nodes?.find((n: any) => n.type === 'trigger:scheduled');
    const expression: string | undefined = triggerNode?.data?.config?.cronExpression;
    const timezone: string = triggerNode?.data?.config?.timezone ?? 'UTC';

    if (!expression) {
      this.logger.warn({ workflowId: workflow.workflowId }, 'Scheduled workflow has no cronExpression — skipping');
      return false;
    }

    if (!cron.validate(expression)) {
      this.logger.warn({ workflowId: workflow.workflowId, expression }, 'Invalid cron expression — skipping');
      return false;
    }

    // Stop existing job if any
    this.unscheduleWorkflow(workflow.workflowId);

    const engine = this.engine;
    const logger = this.logger;

    // Create scheduled task
    const task = cron.schedule(
      expression,
      async () => {
        logger.info({ workflowId: workflow.workflowId, expression }, 'Scheduled workflow firing');
        try {
          await engine.execute(
            workflow.workflowId,
            {
              type: 'scheduled',
              source: 'scheduler',
              data: {
                scheduledAt: new Date().toISOString(),
                cronExpression: expression,
              },
            },
            undefined,
            true // bypassEnabled — already confirmed isEnabled at schedule time
          );
        } catch (err) {
          logger.error({ err, workflowId: workflow.workflowId }, 'Scheduled workflow execution failed');
        }
      },
      { timezone }
    );

    this.jobs.set(workflow.workflowId, task);
    this.logger.info({ workflowId: workflow.workflowId, expression, timezone }, 'Workflow scheduled');
    return true;
  }

  /**
   * Unschedule and stop a workflow's cron job.
   */
  unscheduleWorkflow(workflowId: string): void {
    const existing = this.jobs.get(workflowId);
    if (existing) {
      existing.stop();
      this.jobs.delete(workflowId);
      this.logger?.info({ workflowId }, 'Workflow unscheduled');
    }
  }

  /**
   * Reschedule a workflow (called after PATCH updates).
   * Fetches fresh workflow from DB and re-registers if still enabled and scheduled.
   */
  async rescheduleWorkflow(workflowId: string): Promise<void> {
    this.unscheduleWorkflow(workflowId);

    const workflow = await Workflow.findOne({ workflowId, isEnabled: true }).lean();
    if (!workflow || (workflow as any).triggerType !== 'trigger:scheduled') return;

    this.scheduleWorkflow(workflow);
  }

  /**
   * Stop all scheduled jobs (graceful shutdown).
   */
  stop(): void {
    this.jobs.forEach((task) => task.stop());
    this.jobs.clear();
    this.logger?.info('Workflow scheduler stopped');
  }

  /**
   * Get count of currently scheduled workflows.
   */
  get scheduledCount(): number {
    return this.jobs.size;
  }
}

export const workflowSchedulerService = new WorkflowSchedulerService();
