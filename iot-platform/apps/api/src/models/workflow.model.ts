import { Schema, model, Document, Types } from 'mongoose';

/**
 * Workflow Model
 *
 * Visual workflow definitions for IoT automation.
 * Supports node-based workflows with triggers, conditions, actions, and transformations.
 */

export type WorkflowPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type NodeType =
  // Triggers
  | 'trigger:deviceStateChange'
  | 'trigger:scheduled'
  | 'trigger:manual'
  | 'trigger:alarmTriggered'
  | 'trigger:webhook'
  // Conditions
  | 'condition:comparison'
  | 'condition:threshold'
  | 'condition:ifElse'
  | 'condition:timeBased'
  | 'condition:deviceStatus'
  // Actions
  | 'action:sendNotification'
  | 'action:updateDevice'
  | 'action:createAlarm'
  | 'action:callWebhook'
  | 'action:logMessage'
  | 'action:updateVariable'
  // Transformations
  | 'transform:mathOperation'
  | 'transform:stringOperation'
  | 'transform:aggregation'
  | 'transform:dataMapping';

export interface WorkflowNode {
  id: string;                      // ULID
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label?: string;
    description?: string;
    config: Record<string, any>;   // Node-specific configuration
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;                  // Source node ID
  target: string;                  // Target node ID
  sourceHandle?: string;           // For branching (e.g., 'true'/'false')
  targetHandle?: string;
  label?: string;
  type?: 'default' | 'smoothstep' | 'step';
}

export interface WorkflowSchedule {
  cronExpression?: string;         // Cron expression for scheduled triggers
  timezone?: string;               // Timezone for cron (default: UTC)
  nextRunAt?: Date;                // Next scheduled execution time
}

export interface IWorkflow extends Document {
  // Identification
  workflowId: string;              // ULID (user-facing)
  name: string;
  description?: string;
  tags: string[];

  // Multi-tenancy
  orgId: Types.ObjectId;
  userId: string;                  // Creator user ID

  // Workflow Definition (React Flow format)
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];

  // Execution Settings
  isEnabled: boolean;
  priority: WorkflowPriority;
  maxConcurrentExecutions: number; // Default: 1
  timeoutSeconds: number;          // Default: 300 (5 minutes)

  // Scheduling (for scheduled triggers)
  schedule?: WorkflowSchedule;

  // Statistics
  executionCount: number;
  lastExecutedAt?: Date;
  lastExecutionStatus?: 'completed' | 'failed' | 'timeout' | 'cancelled';
  lastExecutionDuration?: number;  // ms

  // Versioning
  version: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const workflowNodeSchema = new Schema<WorkflowNode>({
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      // Triggers
      'trigger:deviceStateChange',
      'trigger:scheduled',
      'trigger:manual',
      'trigger:alarmTriggered',
      'trigger:webhook',
      // Conditions
      'condition:comparison',
      'condition:threshold',
      'condition:ifElse',
      'condition:timeBased',
      'condition:deviceStatus',
      // Actions
      'action:sendNotification',
      'action:updateDevice',
      'action:createAlarm',
      'action:callWebhook',
      'action:logMessage',
      'action:updateVariable',
      // Transformations
      'transform:mathOperation',
      'transform:stringOperation',
      'transform:aggregation',
      'transform:dataMapping',
    ],
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
  },
  data: {
    label: String,
    description: String,
    config: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
  },
}, { _id: false });

const workflowEdgeSchema = new Schema<WorkflowEdge>({
  id: {
    type: String,
    required: true,
  },
  source: {
    type: String,
    required: true,
  },
  target: {
    type: String,
    required: true,
  },
  sourceHandle: String,
  targetHandle: String,
  label: String,
  type: {
    type: String,
    enum: ['default', 'smoothstep', 'step'],
    default: 'default',
  },
}, { _id: false });

const workflowScheduleSchema = new Schema<WorkflowSchedule>({
  cronExpression: String,
  timezone: {
    type: String,
    default: 'UTC',
  },
  nextRunAt: Date,
}, { _id: false });

const workflowSchema = new Schema<IWorkflow>({
  workflowId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  tags: {
    type: [String],
    default: [],
    index: true,
  },
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  nodes: {
    type: [workflowNodeSchema],
    required: true,
    default: [],
  },
  edges: {
    type: [workflowEdgeSchema],
    required: true,
    default: [],
  },
  isEnabled: {
    type: Boolean,
    required: true,
    default: false,
    index: true,
  },
  priority: {
    type: String,
    required: true,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM',
  },
  maxConcurrentExecutions: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
    max: 10,
  },
  timeoutSeconds: {
    type: Number,
    required: true,
    default: 300,
    min: 1,
    max: 3600,
  },
  schedule: workflowScheduleSchema,
  executionCount: {
    type: Number,
    required: true,
    default: 0,
  },
  lastExecutedAt: Date,
  lastExecutionStatus: {
    type: String,
    enum: ['completed', 'failed', 'timeout', 'cancelled'],
  },
  lastExecutionDuration: Number,
  version: {
    type: Number,
    required: true,
    default: 1,
  },
}, {
  timestamps: true,
  collection: 'workflows',
});

// Compound indexes for common queries
workflowSchema.index({ orgId: 1, isEnabled: 1, updatedAt: -1 });
workflowSchema.index({ userId: 1, updatedAt: -1 });
workflowSchema.index({ tags: 1, isEnabled: 1 });
workflowSchema.index({ orgId: 1, 'nodes.type': 1, isEnabled: 1 }); // For trigger-based queries

export const Workflow = model<IWorkflow>('Workflow', workflowSchema);
