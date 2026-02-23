/**
 * Workflow Template Definitions
 *
 * Pre-built starter templates for common automation workflows.
 * Each template is a factory function so node IDs are pre-computed
 * and edges can reference them correctly.
 *
 * Node shape:
 *   type        - React Flow component type: 'trigger' | 'condition' | 'action' | 'transform' | 'data'
 *   data.nodeType - Engine semantic type: 'trigger:deviceStateChange', 'action:sendNotification', etc.
 *   toBackendNodes() in workflowSlice uses data.nodeType as the Zod-validated type field.
 */

import { ulid } from 'ulid';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  nodes: any[];
  edges: any[];
}

// ────────────────────────────────────────────────────────────────────────────
// Template 1: Device Alert → Notification
// ────────────────────────────────────────────────────────────────────────────
function makeDeviceAlertTemplate(): WorkflowTemplate {
  const triggerId   = ulid();
  const conditionId = ulid();
  const actionId    = ulid();

  return {
    id: 'tmpl-device-alert',
    name: 'Device Alert → Notification',
    description: 'Monitor device state changes and send notifications when thresholds are breached',
    icon: '🚨',
    tags: ['alert', 'notification', 'device-state'],
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: {
          label: 'Device State Change',
          description: 'Triggered when device state updates',
          nodeType: 'trigger:deviceStateChange',
          config: { deviceId: '', field: '' },
        },
      },
      {
        id: conditionId,
        type: 'condition',
        position: { x: 420, y: 200 },
        data: {
          label: 'Threshold Check',
          description: 'Check if value exceeds threshold',
          nodeType: 'condition:threshold',
          config: { field: '', min: undefined, max: undefined },
        },
      },
      {
        id: actionId,
        type: 'action',
        position: { x: 740, y: 200 },
        data: {
          label: 'Send Notification',
          description: 'Send alert notification',
          nodeType: 'action:sendNotification',
          config: { message: 'Alert triggered', channels: ['email'] },
        },
      },
    ],
    edges: [
      { id: ulid(), source: triggerId, target: conditionId, animated: true },
      { id: ulid(), source: conditionId, target: actionId, sourceHandle: 'true', animated: true },
    ],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Template 2: Scheduled Data Export
// ────────────────────────────────────────────────────────────────────────────
function makeScheduledExportTemplate(): WorkflowTemplate {
  const triggerId   = ulid();
  const queryId     = ulid();
  const transformId = ulid();
  const exportId    = ulid();

  return {
    id: 'tmpl-scheduled-export',
    name: 'Scheduled Data Export',
    description: 'Export device data on a schedule by querying states, mapping fields, and calling a webhook',
    icon: '📅',
    tags: ['schedule', 'export', 'data'],
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: {
          label: 'Schedule Trigger',
          description: 'Run on schedule (daily, weekly, monthly)',
          nodeType: 'trigger:scheduled',
          config: { cronExpression: '0 0 * * *', timezone: 'UTC' },
        },
      },
      {
        id: queryId,
        type: 'action',
        position: { x: 400, y: 200 },
        data: {
          label: 'Query Device States',
          description: 'Fetch device data from time range',
          nodeType: 'data:queryDeviceStates',
          config: { deviceId: '', timeRange: '24h' },
        },
      },
      {
        id: transformId,
        type: 'transform',
        position: { x: 700, y: 200 },
        data: {
          label: 'Map Fields',
          description: 'Map and format data for export',
          nodeType: 'transform:dataMapping',
          config: { mappings: [] },
        },
      },
      {
        id: exportId,
        type: 'action',
        position: { x: 1000, y: 200 },
        data: {
          label: 'Export via Webhook',
          description: 'POST formatted data to export endpoint',
          nodeType: 'action:callWebhook',
          config: { url: '', method: 'POST' },
        },
      },
    ],
    edges: [
      { id: ulid(), source: triggerId,   target: queryId,     animated: true },
      { id: ulid(), source: queryId,     target: transformId, animated: true },
      { id: ulid(), source: transformId, target: exportId,    animated: true },
    ],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Template 3: Threshold Breach → Alarm
// ────────────────────────────────────────────────────────────────────────────
function makeThresholdAlarmTemplate(): WorkflowTemplate {
  const triggerId  = ulid();
  const condId     = ulid();
  const alarmId    = ulid();
  const notifyId   = ulid();

  return {
    id: 'tmpl-threshold-alarm',
    name: 'Threshold Breach → Alarm',
    description: 'Create alarms when sensor readings exceed critical thresholds',
    icon: '⚠️',
    tags: ['threshold', 'alarm', 'critical'],
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: {
          label: 'Device State Change',
          description: 'Monitor sensor changes',
          nodeType: 'trigger:deviceStateChange',
          config: { deviceId: '', field: '' },
        },
      },
      {
        id: condId,
        type: 'condition',
        position: { x: 420, y: 200 },
        data: {
          label: 'Critical Threshold',
          description: 'Check if critical level exceeded',
          nodeType: 'condition:comparison',
          config: { field: '', operator: '>', value: 90 },
        },
      },
      {
        id: alarmId,
        type: 'action',
        position: { x: 740, y: 200 },
        data: {
          label: 'Create Alarm',
          description: 'Create high-priority alarm',
          nodeType: 'action:createAlarm',
          config: { severity: 'CRITICAL', alarmType: 'THRESHOLD', message: 'Critical threshold breached' },
        },
      },
      {
        id: notifyId,
        type: 'action',
        position: { x: 1060, y: 200 },
        data: {
          label: 'Notify Operators',
          description: 'Alert on-call team',
          nodeType: 'action:sendNotification',
          config: { message: 'CRITICAL ALARM', channels: ['email', 'sms'] },
        },
      },
    ],
    edges: [
      { id: ulid(), source: triggerId, target: condId,    animated: true },
      { id: ulid(), source: condId,    target: alarmId,   sourceHandle: 'true', animated: true },
      { id: ulid(), source: alarmId,   target: notifyId,  animated: true },
    ],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Template 4: Multi-Sensor Aggregation
// ────────────────────────────────────────────────────────────────────────────
function makeMultiSensorAggTemplate(): WorkflowTemplate {
  const triggerId  = ulid();
  const filterId   = ulid();
  const aggId      = ulid();
  const updateId   = ulid();

  return {
    id: 'tmpl-multi-sensor-agg',
    name: 'Multi-Sensor Aggregation',
    description: 'Combine readings from multiple sensors and update a summary device',
    icon: '📊',
    tags: ['aggregation', 'multi-device', 'transform'],
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: {
          label: 'Device State Change',
          description: 'Any sensor update',
          nodeType: 'trigger:deviceStateChange',
          config: { deviceId: '', field: '' },
        },
      },
      {
        id: filterId,
        type: 'transform',
        position: { x: 420, y: 200 },
        data: {
          label: 'Map Fields',
          description: 'Select and rename relevant fields',
          nodeType: 'transform:dataMapping',
          config: { mappings: [] },
        },
      },
      {
        id: aggId,
        type: 'transform',
        position: { x: 740, y: 200 },
        data: {
          label: 'Aggregate',
          description: 'Calculate average/sum across fields',
          nodeType: 'transform:aggregation',
          config: { operation: 'average', fields: [] },
        },
      },
      {
        id: updateId,
        type: 'action',
        position: { x: 1060, y: 200 },
        data: {
          label: 'Update Summary Device',
          description: 'Store aggregated result on target device',
          nodeType: 'action:updateDevice',
          config: { deviceId: '', updates: {} },
        },
      },
    ],
    edges: [
      { id: ulid(), source: triggerId, target: filterId,  animated: true },
      { id: ulid(), source: filterId,  target: aggId,     animated: true },
      { id: ulid(), source: aggId,     target: updateId,  animated: true },
    ],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Template 5: Quality Check & Alert
// ────────────────────────────────────────────────────────────────────────────
function makeQualityCheckTemplate(): WorkflowTemplate {
  const triggerId  = ulid();
  const logId      = ulid();
  const condId     = ulid();
  const alertId    = ulid();

  return {
    id: 'tmpl-quality-check',
    name: 'Quality Check & Alert',
    description: 'Validate data quality and alert if anomalies detected',
    icon: '✓',
    tags: ['quality', 'validation', 'anomaly'],
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: {
          label: 'Device State Change',
          description: 'New data arrives',
          nodeType: 'trigger:deviceStateChange',
          config: { deviceId: '', field: '' },
        },
      },
      {
        id: logId,
        type: 'action',
        position: { x: 420, y: 200 },
        data: {
          label: 'Log Incoming Data',
          description: 'Record data for quality audit trail',
          nodeType: 'action:logMessage',
          config: { message: 'Quality check: {{trigger.field}} = {{trigger.value}}', level: 'info' },
        },
      },
      {
        id: condId,
        type: 'condition',
        position: { x: 740, y: 200 },
        data: {
          label: 'Quality Fail?',
          description: 'Check if quality score is below threshold',
          nodeType: 'condition:comparison',
          config: { field: 'quality_score', operator: '<', value: 80 },
        },
      },
      {
        id: alertId,
        type: 'action',
        position: { x: 1060, y: 200 },
        data: {
          label: 'Alert QA Team',
          description: 'Notify of quality issues',
          nodeType: 'action:sendNotification',
          config: { message: 'Quality alert: score below threshold', channels: ['email'] },
        },
      },
    ],
    edges: [
      { id: ulid(), source: triggerId, target: logId,   animated: true },
      { id: ulid(), source: logId,     target: condId,  animated: true },
      { id: ulid(), source: condId,    target: alertId, sourceHandle: 'true', animated: true },
    ],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Template 6: Device State → Process → Write Back
// ────────────────────────────────────────────────────────────────────────────

/**
 * Build the Device State Processor template.
 * Uses a factory so node IDs are pre-computed and edges can reference them.
 * data.nodeType stores the engine-semantic type (e.g. 'trigger:deviceStateChange');
 * the visual 'type' field is the React Flow component type ('trigger' | 'action' | etc.).
 */
function makeDeviceStateProcessorTemplate(): WorkflowTemplate {
  const triggerId   = ulid();
  const conditionId = ulid();
  const actionId    = ulid();

  return {
    id: 'tmpl-device-state-processor',
    name: 'Device State → Process → Write Back',
    description:
      'Receive telemetry (trigger:deviceStateChange), validate the value, then write enriched data back to the same DeviceState record via action:writeDeviceState.',
    icon: '⚙️',
    tags: ['device-state', 'processor', 'write-back', 'pipeline'],
    nodes: [
      {
        id: triggerId,
        type: 'trigger',
        position: { x: 100, y: 200 },
        data: {
          label: 'Device State Change',
          description: 'Fires when new telemetry POSTed to /devices/:id/states',
          nodeType: 'trigger:deviceStateChange',
          config: { deviceId: '', field: '' },
        },
      },
      {
        id: conditionId,
        type: 'condition',
        position: { x: 420, y: 200 },
        data: {
          label: 'Value Check',
          description: 'Ensure incoming value is a valid non-negative number',
          nodeType: 'condition:comparison',
          config: { field: '{{trigger.value}}', operator: '>=', value: 0 },
        },
      },
      {
        id: actionId,
        type: 'action',
        position: { x: 740, y: 200 },
        data: {
          label: 'Write Device State',
          description: 'Write processed fields back to the triggering DeviceState',
          nodeType: 'action:writeDeviceState',
          config: {
            mappings: [
              { key: 'processed_value', value: '{{trigger.value}}', type: 'number' },
              { key: 'processed_field', value: '{{trigger.field}}', type: 'string' },
            ],
          },
        },
      },
    ],
    edges: [
      {
        id: ulid(),
        source: triggerId,
        target: conditionId,
        animated: true,
      },
      {
        id: ulid(),
        source: conditionId,
        target: actionId,
        sourceHandle: 'true',
        animated: true,
      },
    ],
  };
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  makeDeviceAlertTemplate(),
  makeScheduledExportTemplate(),
  makeThresholdAlarmTemplate(),
  makeMultiSensorAggTemplate(),
  makeQualityCheckTemplate(),
  makeDeviceStateProcessorTemplate(),
];
