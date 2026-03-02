import { z } from 'zod';

/**
 * Validation schemas for Workflow operations
 * Uses Zod for runtime type validation and TypeScript type inference
 */

// ============================================================================
// Base Schemas
// ============================================================================

/**
 * ULID validation pattern
 */
export const ulidSchema = z
  .string()
  .length(26)
  .regex(/^[0-9A-Z]{26}$/, 'Invalid ULID format')
  .describe('ULID identifier (26 characters, time-sortable)');

/**
 * Node types enum
 */
export const nodeTypeSchema = z.enum([
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
  'action:writeDeviceState',   // ADR-022
  'action:debug',              // Real-time debug output node
  // Transformations
  'transform:mathOperation',
  'transform:stringOperation',
  'transform:aggregation',
  'transform:dataMapping',
  // Data (ADR-017)
  'data:modbusRead',
  'data:modbusWrite',
  'data:queryDeviceStates',
  // Logic (ADR-017)
  'logic:function',
]);

/**
 * Workflow node schema
 */
export const workflowNodeSchema = z.object({
  id: z.string().min(1).describe('Node ID (ULID)'),
  type: nodeTypeSchema,
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.object({
    label: z.string().optional(),
    description: z.string().optional(),
    config: z.record(z.unknown()).default({}),
  }),
});

/**
 * Workflow edge schema
 */
export const workflowEdgeSchema = z.object({
  id: z.string().min(1).describe('Edge ID'),
  source: z.string().min(1).describe('Source node ID'),
  target: z.string().min(1).describe('Target node ID'),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
  type: z.string().optional(), // React Flow can generate various edge types
});

/**
 * Workflow schedule schema
 */
export const workflowScheduleSchema = z.object({
  cronExpression: z.string().optional().describe('Cron expression (e.g., "0 0 * * *")'),
  timezone: z.string().optional().default('UTC'),
  nextRunAt: z.date().optional(),
});

// ============================================================================
// Create Workflow
// ============================================================================

/**
 * Schema for creating a new workflow
 */
export const createWorkflowSchema = z.object({
  name: z
    .string()
    .min(1, 'Workflow name is required')
    .max(100, 'Workflow name must be less than 100 characters')
    .describe('Human-readable workflow name'),

  type: z
    .enum(['Application', 'Experience', 'Embedded', 'Edge'])
    .optional()
    .default('Application')
    .describe('Workflow type'),

  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),

  tags: z
    .array(z.string().min(1).max(100))
    .max(50)
    .optional()
    .default([])
    .describe('Workflow tags for categorization'),

  nodes: z
    .array(workflowNodeSchema)
    .min(1, 'Workflow must have at least one node')
    .describe('Workflow nodes'),

  edges: z
    .array(workflowEdgeSchema)
    .optional()
    .default([])
    .describe('Workflow connections'),

  isEnabled: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable workflow immediately'),

  priority: z
    .enum(['HIGH', 'MEDIUM', 'LOW'])
    .optional()
    .default('MEDIUM'),

  maxConcurrentExecutions: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .default(1),

  timeoutSeconds: z
    .number()
    .min(1)
    .max(3600)
    .optional()
    .default(300),

  schedule: workflowScheduleSchema.optional(),

  applicationId: z
    .string()
    .optional()
    .describe('Application ID (ULID) — FK to Application (ADR-023)'),
});

export type CreateWorkflowDTO = z.infer<typeof createWorkflowSchema>;

// ============================================================================
// Update Workflow
// ============================================================================

/**
 * Schema for updating an existing workflow
 * All fields are optional (partial update)
 */
export const updateWorkflowSchema = z.object({
  name: z
    .string()
    .min(1, 'Workflow name cannot be empty')
    .max(100, 'Workflow name must be less than 100 characters')
    .optional(),

  type: z
    .enum(['Application', 'Experience', 'Embedded', 'Edge'])
    .optional()
    .describe('Workflow type'),

  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),

  tags: z
    .array(z.string().min(1).max(100))
    .max(50)
    .optional(),

  nodes: z
    .array(workflowNodeSchema)
    .optional(),

  edges: z
    .array(workflowEdgeSchema)
    .optional(),

  isEnabled: z.boolean().optional(),

  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),

  maxConcurrentExecutions: z.number().min(1).max(10).optional(),

  timeoutSeconds: z.number().min(1).max(3600).optional(),

  schedule: workflowScheduleSchema.optional(),

  applicationId: z
    .string()
    .optional()
    .describe('Application ID (ULID) — FK to Application'),
});

export type UpdateWorkflowDTO = z.infer<typeof updateWorkflowSchema>;

// ============================================================================
// Execute Workflow
// ============================================================================

/**
 * Schema for manually executing a workflow
 */
export const executeWorkflowSchema = z.object({
  inputData: z
    .record(z.unknown())
    .optional()
    .default({})
    .describe('Input data for workflow execution'),

  variables: z
    .record(z.unknown())
    .optional()
    .default({})
    .describe('Initial variables'),
});

export type ExecuteWorkflowDTO = z.infer<typeof executeWorkflowSchema>;

// ============================================================================
// Query Workflows
// ============================================================================

/**
 * Schema for querying/filtering workflows
 */
export const queryWorkflowsSchema = z.object({
  // Pagination
  limit: z
    .coerce.number()
    .min(1)
    .max(1000)
    .optional()
    .default(100)
    .describe('Number of results (1-1000)'),

  offset: z
    .coerce.number()
    .min(0)
    .optional()
    .default(0)
    .describe('Offset for pagination'),

  // Filtering
  tags: z
    .string()
    .transform((val) => val.split(',').map((t) => t.trim()).filter(Boolean))
    .optional()
    .describe('Filter by tags (comma-separated)'),

  isEnabled: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional()
    .describe('Filter by enabled status'),

  priority: z
    .enum(['HIGH', 'MEDIUM', 'LOW'])
    .optional()
    .describe('Filter by priority'),

  search: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe('Search workflow names (case-insensitive)'),

  applicationId: z
    .string()
    .optional()
    .describe('Filter by application ID (ULID)'),

  // Sorting
  sortBy: z
    .enum(['name', 'workflowId', 'createdAt', 'updatedAt', 'lastExecutedAt'])
    .optional()
    .default('updatedAt')
    .describe('Sort field'),

  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc')
    .describe('Sort order'),
});

export type QueryWorkflowsDTO = z.infer<typeof queryWorkflowsSchema>;

// ============================================================================
// Query Executions
// ============================================================================

/**
 * Schema for querying workflow executions
 */
export const queryExecutionsSchema = z.object({
  // Pagination
  limit: z
    .coerce.number()
    .min(1)
    .max(1000)
    .optional()
    .default(100),

  offset: z
    .coerce.number()
    .min(0)
    .optional()
    .default(0),

  // Filtering
  status: z
    .enum(['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'])
    .optional()
    .describe('Filter by execution status'),

  triggerType: z
    .enum(['manual', 'scheduled', 'webhook', 'deviceStateChange', 'alarmTriggered'])
    .optional()
    .describe('Filter by trigger type'),

  // Sorting
  sortBy: z
    .enum(['executionId', 'createdAt', 'startedAt', 'completedAt', 'duration'])
    .optional()
    .default('createdAt')
    .describe('Sort field'),

  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc')
    .describe('Sort order'),
});

export type QueryExecutionsDTO = z.infer<typeof queryExecutionsSchema>;

// ============================================================================
// Path Parameters
// ============================================================================

/**
 * Schema for workflow ID path parameter
 */
export const workflowIdParamSchema = z.object({
  workflowId: ulidSchema,
});

export type WorkflowIdParam = z.infer<typeof workflowIdParamSchema>;

/**
 * Schema for execution ID path parameter
 */
export const executionIdParamSchema = z.object({
  executionId: ulidSchema,
});

export type ExecutionIdParam = z.infer<typeof executionIdParamSchema>;
