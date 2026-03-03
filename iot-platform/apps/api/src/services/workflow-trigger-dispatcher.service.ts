import type { Logger } from 'pino';
import type { WorkflowService } from './workflow.service';
import type { WorkflowEngineService } from './workflow-engine.service';
import type { IAlarmInstance } from '../models';
import type { IDeviceState } from '../models/device-state.model';

/**
 * WorkflowTriggerDispatcher
 *
 * Sits above DeviceStateService and AlarmService to automatically execute
 * matching enabled workflows when device states are saved or alarms fire.
 *
 * Pattern: Dependency injection of WorkflowService and WorkflowEngineService only.
 * No circular dependencies. Fire-and-forget execution.
 */
export class WorkflowTriggerDispatcher {
  constructor(
    private workflowService: WorkflowService,
    private workflowEngineService: WorkflowEngineService,
    private logger: Logger
  ) {}

  /**
   * Dispatch device state change event to matching workflows (batch mode)
   * Fires each matching workflow ONCE per device state change, regardless of field count.
   * Uses trigger node's config.field as a filter hint only.
   * Called after successful device state save (fire-and-forget)
   */
  async dispatchDeviceStateBatch(
    orgId: string,
    deviceId: string,
    data: Record<string, any>,
    stateData: IDeviceState
  ): Promise<void> {
    try {
      // Query workflows that match this trigger (device filter only, no field)
      const workflows = await this.workflowService.findTriggerWorkflows(
        orgId,
        'trigger:deviceStateChange',
        { deviceId }
      );

      // Fire each matching workflow (fire-and-forget)
      for (const workflow of workflows) {
        // Check if this workflow's trigger node has a field filter
        const triggerNode = workflow.nodes?.find((n: any) => n.type === 'trigger:deviceStateChange');
        const fieldFilter = triggerNode?.data?.config?.field;

        // If field filter is set, only match if that field exists in data
        if (fieldFilter && !(fieldFilter in data)) {
          continue;
        }

        this.workflowEngineService
          .execute(workflow.workflowId, {
            type: 'deviceStateChange',
            source: deviceId,
            data: {
              deviceId,
              stateId: (stateData as any)._id?.toString(),
              // ADR-037: workspace = device_states.data (raw telemetry snapshot)
              // Supports nested paths: {{workspace.meter_Params.frequence}}
              workspace: data,
              timestamp: stateData.timestamp,
            },
          })
          .catch(err => {
            this.logger.error(
              {
                err,
                workflowId: workflow.workflowId,
                deviceId,
              },
              'Workflow execution failed in dispatcher'
            );
          });
      }
    } catch (err) {
      this.logger.error(
        { err, orgId, deviceId },
        'Error dispatching device state batch'
      );
    }
  }

  /**
   * Dispatch device state change event to matching workflows
   * Called after successful device state save (fire-and-forget)
   *
   * @deprecated Use dispatchDeviceStateBatch instead.
   * Kept for backwards compatibility but not called from any callers.
   */
  async dispatchDeviceStateChange(
    orgId: string,
    deviceId: string,
    field: string,
    value: any,
    stateData: IDeviceState
  ): Promise<void> {
    try {
      // Query workflows that match this trigger
      const workflows = await this.workflowService.findTriggerWorkflows(
        orgId,
        'trigger:deviceStateChange',
        { deviceId, field }
      );

      // Fire each matching workflow (fire-and-forget)
      for (const workflow of workflows) {
        this.workflowEngineService
          .execute(workflow.workflowId, {
            type: 'deviceStateChange',
            source: deviceId,
            data: {
              deviceId,
              field,
              value,
              stateId: (stateData as any)._id?.toString(),
              // ADR-037: workspace = device_states.data (raw telemetry snapshot)
              // Supports nested paths: {{workspace.meter_Params.frequence}}
              workspace: (stateData as any).data ?? {},
              timestamp: stateData.timestamp,
            },
          })
          .catch(err => {
            this.logger.error(
              {
                err,
                workflowId: workflow.workflowId,
                deviceId,
                field,
              },
              'Workflow execution failed in dispatcher'
            );
          });
      }
    } catch (err) {
      this.logger.error(
        { err, orgId, deviceId, field },
        'Error dispatching device state change'
      );
    }
  }

  /**
   * Dispatch alarm triggered event to matching workflows
   * Called after alarm transitions to ACTIVE_UNACKED (fire-and-forget)
   */
  async dispatchAlarmTriggered(orgId: string, alarmData: IAlarmInstance): Promise<void> {
    try {
      // Query workflows with trigger:alarmTriggered
      const workflows = await this.workflowService.findTriggerWorkflows(
        orgId,
        'trigger:alarmTriggered'
      );

      // Fire each matching workflow (fire-and-forget)
      for (const workflow of workflows) {
        this.workflowEngineService
          .execute(workflow.workflowId, {
            type: 'alarmTriggered',
            source: alarmData.deviceId,
            data: {
              alarmId: alarmData._id,
              alarmRuleId: alarmData.alarmRuleId,
              priority: alarmData.priority,
              tagName: alarmData.tagName,
              alarmData,
            },
          })
          .catch(err => {
            this.logger.error(
              {
                err,
                workflowId: workflow.workflowId,
                alarmId: alarmData._id,
              },
              'Workflow execution failed in dispatcher'
            );
          });
      }
    } catch (err) {
      this.logger.error(
        { err, orgId, alarmId: alarmData._id },
        'Error dispatching alarm triggered event'
      );
    }
  }
}
