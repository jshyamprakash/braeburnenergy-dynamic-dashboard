/**
 * Workflow Template Definitions
 *
 * Pre-built starter templates for common automation workflows
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

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'tmpl-device-alert',
    name: 'Device Alert → Notification',
    description: 'Monitor device state changes and send notifications when thresholds are breached',
    icon: '🚨',
    tags: ['alert', 'notification', 'device-state'],
    nodes: [
      {
        id: ulid(),
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Device State Change',
          description: 'Triggered when device state updates',
          config: { triggerType: 'device-state-change', deviceId: '', metric: '' },
        },
      },
      {
        id: ulid(),
        type: 'condition',
        position: { x: 400, y: 100 },
        data: {
          label: 'Threshold Check',
          description: 'Check if value exceeds threshold',
          config: { conditionType: 'threshold', field: '', operator: '>', value: 0 },
        },
      },
      {
        id: ulid(),
        type: 'action',
        position: { x: 700, y: 100 },
        data: {
          label: 'Send Notification',
          description: 'Send alert notification',
          config: { actionType: 'send-notification', recipients: [], message: 'Alert triggered' },
        },
      },
    ],
    edges: [
      { id: 'e1', source: '', target: '', animated: true },
    ],
  },
  {
    id: 'tmpl-scheduled-export',
    name: 'Scheduled Data Export',
    description: 'Export device data on a schedule to CSV file',
    icon: '📅',
    tags: ['schedule', 'export', 'data'],
    nodes: [
      {
        id: ulid(),
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Schedule Trigger',
          description: 'Run on schedule (daily, weekly, monthly)',
          config: { triggerType: 'schedule', cronExpression: '0 0 * * *', timezone: 'UTC' },
        },
      },
      {
        id: ulid(),
        type: 'action',
        position: { x: 400, y: 100 },
        data: {
          label: 'Query Device States',
          description: 'Fetch device data from time range',
          config: { actionType: 'query-device-states', deviceId: '', timeRange: '24h' },
        },
      },
      {
        id: ulid(),
        type: 'transform',
        position: { x: 700, y: 100 },
        data: {
          label: 'Format Data',
          description: 'Format data for export',
          config: { transformType: 'format-csv', fields: ['timestamp', 'value', 'status'] },
        },
      },
      {
        id: ulid(),
        type: 'action',
        position: { x: 1000, y: 100 },
        data: {
          label: 'Export CSV',
          description: 'Save to file',
          config: { actionType: 'export-csv', filename: 'device_data.csv' },
        },
      },
    ],
    edges: [
      { id: 'e1', source: '', target: '', animated: true },
      { id: 'e2', source: '', target: '', animated: true },
      { id: 'e3', source: '', target: '', animated: true },
    ],
  },
  {
    id: 'tmpl-threshold-alarm',
    name: 'Threshold Breach → Alarm',
    description: 'Create alarms when sensor readings exceed critical thresholds',
    icon: '⚠️',
    tags: ['threshold', 'alarm', 'critical'],
    nodes: [
      {
        id: ulid(),
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Device State Change',
          description: 'Monitor sensor changes',
          config: { triggerType: 'device-state-change', deviceId: '', metric: '' },
        },
      },
      {
        id: ulid(),
        type: 'condition',
        position: { x: 400, y: 100 },
        data: {
          label: 'Critical Threshold',
          description: 'Check if critical level exceeded',
          config: { conditionType: 'threshold', field: '', operator: '>', value: 90 },
        },
      },
      {
        id: ulid(),
        type: 'action',
        position: { x: 700, y: 100 },
        data: {
          label: 'Create Alarm',
          description: 'Create high-priority alarm',
          config: { actionType: 'create-alarm', severity: 'CRITICAL', alarmType: 'THRESHOLD' },
        },
      },
      {
        id: ulid(),
        type: 'action',
        position: { x: 1000, y: 100 },
        data: {
          label: 'Notify Operators',
          description: 'Alert on-call team',
          config: { actionType: 'send-notification', recipients: [], message: 'CRITICAL ALARM' },
        },
      },
    ],
    edges: [
      { id: 'e1', source: '', target: '', animated: true },
      { id: 'e2', source: '', target: '', animated: true },
      { id: 'e3', source: '', target: '', animated: true },
    ],
  },
  {
    id: 'tmpl-multi-sensor-agg',
    name: 'Multi-Sensor Aggregation',
    description: 'Combine readings from multiple sensors and update a summary device',
    icon: '📊',
    tags: ['aggregation', 'multi-device', 'transform'],
    nodes: [
      {
        id: ulid(),
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Device State Change',
          description: 'Any sensor update',
          config: { triggerType: 'device-state-change', deviceId: '', metric: '' },
        },
      },
      {
        id: ulid(),
        type: 'transform',
        position: { x: 400, y: 100 },
        data: {
          label: 'Filter Data',
          description: 'Select relevant fields',
          config: { transformType: 'filter', fields: ['temperature', 'humidity', 'pressure'] },
        },
      },
      {
        id: ulid(),
        type: 'transform',
        position: { x: 700, y: 100 },
        data: {
          label: 'Aggregate',
          description: 'Calculate average/sum',
          config: { transformType: 'aggregate', operation: 'average', fields: [] },
        },
      },
      {
        id: ulid(),
        type: 'action',
        position: { x: 1000, y: 100 },
        data: {
          label: 'Update Summary Device',
          description: 'Store result',
          config: { actionType: 'update-device', deviceId: '', attributes: {} },
        },
      },
    ],
    edges: [
      { id: 'e1', source: '', target: '', animated: true },
      { id: 'e2', source: '', target: '', animated: true },
      { id: 'e3', source: '', target: '', animated: true },
    ],
  },
  {
    id: 'tmpl-quality-check',
    name: 'Quality Check & Alert',
    description: 'Validate data quality and alert if anomalies detected',
    icon: '✓',
    tags: ['quality', 'validation', 'anomaly'],
    nodes: [
      {
        id: ulid(),
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Device State Change',
          description: 'New data arrives',
          config: { triggerType: 'device-state-change', deviceId: '', metric: '' },
        },
      },
      {
        id: ulid(),
        type: 'action',
        position: { x: 400, y: 100 },
        data: {
          label: 'Validate Data',
          description: 'Check quality rules',
          config: { actionType: 'validate-data', rules: ['range-check', 'anomaly-detect'] },
        },
      },
      {
        id: ulid(),
        type: 'condition',
        position: { x: 700, y: 100 },
        data: {
          label: 'Quality Pass?',
          description: 'Check validation result',
          config: { conditionType: 'quality', field: 'quality_score', operator: '<', value: 80 },
        },
      },
      {
        id: ulid(),
        type: 'action',
        position: { x: 1000, y: 100 },
        data: {
          label: 'Alert QA Team',
          description: 'Notify of quality issues',
          config: { actionType: 'send-notification', recipients: [], message: 'Quality alert' },
        },
      },
    ],
    edges: [
      { id: 'e1', source: '', target: '', animated: true },
      { id: 'e2', source: '', target: '', animated: true },
      { id: 'e3', source: '', target: '', animated: true },
    ],
  },
];
