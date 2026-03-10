import { Schema, model, Document, Types } from 'mongoose';

/**
 * WorkflowExecution Model
 *
 * Tracks execution history of workflows with step-by-step logs.
 * Provides audit trail and debugging information.
 */

export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';

export type TriggerType =
  | 'manual'
  | 'scheduled'
  | 'webhook'
  | 'deviceStateChange'
  | 'alarmTriggered'
  | 'deviceOffline'; // ADR-041

export interface ExecutionTrigger {
  type: TriggerType;
  source?: string;                 // Device ID, alarm ID, webhook URL, etc.
  data?: any;                      // Trigger context data
  timestamp: Date;
}

export interface ExecutionLogEntry {
  timestamp: Date;
  nodeId: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input?: any;
  output?: any;
  error?: string;
  duration?: number;               // Execution time in milliseconds
  notes?: string;                  // Human-readable info (e.g. log message text)
}

export interface ExecutionError {
  message: string;
  nodeId: string;
  nodeType?: string;
  stack?: string;
  timestamp: Date;
}

export interface IWorkflowExecution extends Document {
  // Identification
  executionId: string;             // ULID
  workflowId: string;
  workflowName: string;            // Snapshot at execution time
  workflowVersion: number;

  // Multi-tenancy
  orgId: Types.ObjectId;
  userId?: string;                 // Who triggered (if manual)

  // Trigger context
  trigger: ExecutionTrigger;

  // Execution state
  status: ExecutionStatus;
  progress: number;                // 0-100
  currentNodeId?: string;          // Currently executing node

  // Data
  inputData: Record<string, any>;
  outputData?: Record<string, any>;
  variables: Record<string, any>;  // Runtime variables

  // Execution log (step-by-step)
  executionLog: ExecutionLogEntry[];

  // Error handling
  error?: ExecutionError;

  // Timing
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;               // Total execution time in milliseconds

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const executionTriggerSchema = new Schema<ExecutionTrigger>({
  type: {
    type: String,
    required: true,
    enum: ['manual', 'scheduled', 'webhook', 'deviceStateChange', 'alarmTriggered'],
  },
  source: String,
  data: Schema.Types.Mixed,
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { _id: false });

const executionLogEntrySchema = new Schema<ExecutionLogEntry>({
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  nodeId: {
    type: String,
    required: true,
  },
  nodeType: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
  },
  input: Schema.Types.Mixed,
  output: Schema.Types.Mixed,
  error: String,
  duration: Number,
  notes: String,
}, { _id: false });

const executionErrorSchema = new Schema<ExecutionError>({
  message: {
    type: String,
    required: true,
  },
  nodeId: {
    type: String,
    required: true,
  },
  nodeType: String,
  stack: String,
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
}, { _id: false });

const workflowExecutionSchema = new Schema<IWorkflowExecution>({
  executionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  workflowId: {
    type: String,
    required: true,
    index: true,
  },
  workflowName: {
    type: String,
    required: true,
  },
  workflowVersion: {
    type: Number,
    required: true,
  },
  orgId: {
    type: Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true,
  },
  userId: String,
  trigger: {
    type: executionTriggerSchema,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'],
    default: 'pending',
    index: true,
  },
  progress: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100,
  },
  currentNodeId: String,
  inputData: {
    type: Schema.Types.Mixed,
    required: true,
    default: {},
  },
  outputData: Schema.Types.Mixed,
  variables: {
    type: Schema.Types.Mixed,
    required: true,
    default: {},
  },
  executionLog: {
    type: [executionLogEntrySchema],
    required: true,
    default: [],
  },
  error: executionErrorSchema,
  startedAt: Date,
  completedAt: Date,
  duration: Number,
}, {
  timestamps: true,
  collection: 'workflow_executions',
});

// Compound indexes for common queries
workflowExecutionSchema.index({ workflowId: 1, createdAt: -1 });
workflowExecutionSchema.index({ orgId: 1, status: 1, createdAt: -1 });
workflowExecutionSchema.index({ userId: 1, createdAt: -1 });

// TTL index: Auto-delete executions after 90 days
workflowExecutionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export const WorkflowExecution = model<IWorkflowExecution>('WorkflowExecution', workflowExecutionSchema);
