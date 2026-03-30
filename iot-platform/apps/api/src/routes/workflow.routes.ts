import type { FastifyInstance } from 'fastify';
import { WorkflowController } from '../controllers/workflow.controller';
import { workflowSchedulerService } from '../services/workflow-scheduler.service';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  queryWorkflowsSchema,
  queryExecutionsSchema,
  executeWorkflowSchema,
  workflowIdParamSchema,
  executionIdParamSchema,
  evaluateExpressionSchema,
} from '../schemas/workflow.schema';
import { zodToSwagger, successResponse, paginatedResponse, errorResponse } from '../utils/swagger';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { zodBodyValidator, zodQueryValidator } from '../middleware/validate.middleware';
import { WORKFLOW_TEMPLATES } from '../data/workflow-templates';

/**
 * Workflow Routes
 *
 * Registers all workflow-related HTTP endpoints with OpenAPI documentation
 */
export async function workflowRoutes(fastify: FastifyInstance) {
  // Lazy-init controller via onReady so that fastify.decorate('io', io) in index.ts
  // has already run by the time we capture the Socket.IO instance.
  // Route handlers are arrow-function wrappers so workflowController is only
  // dereferenced at request time (after onReady), not at registration time.
  let workflowController: WorkflowController;
  fastify.addHook('onReady', async () => {
    workflowController = new WorkflowController((fastify as any).io);
  });

  // Get workflow templates
  fastify.get('/workflow-templates', {
    schema: {
      tags: ['Workflows'],
      summary: 'List workflow templates',
      description: 'Get all available starter workflow templates',
      response: {
        200: successResponse(
          {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                icon: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                nodes: { type: 'array', items: { type: 'object' } },
                edges: { type: 'array', items: { type: 'object' } },
              },
            },
          },
          'Templates retrieved successfully'
        ),
      },
    },
    handler: async (_request, reply) => {
      return reply.send({ success: true, data: WORKFLOW_TEMPLATES });
    },
  });

  // Create workflow
  fastify.post('/workflows', {
    schema: {
      tags: ['Workflows'],
      summary: 'Create a new workflow',
      description: 'Creates a new visual workflow with nodes and edges. Validates workflow structure (no cycles, no orphaned nodes).',
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createWorkflowSchema),
      response: {
        201: successResponse(
          {
            type: 'object',
            properties: {
              workflowId: { type: 'string', example: '01KGPQZ53TRMAG5Y1H2S2SHPVG' },
              name: { type: 'string', example: 'Temperature Alert Workflow' },
              description: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              nodes: { type: 'array', items: { type: 'object' } },
              edges: { type: 'array', items: { type: 'object' } },
              isEnabled: { type: 'boolean' },
              priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
              version: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          'Workflow created successfully'
        ),
        400: errorResponse('Validation error or workflow structure invalid'),
      },
    },
    preHandler: [requireAuth, requirePermission('workflow:create'), zodBodyValidator(createWorkflowSchema)],
  }, (req: any, reply: any) => workflowController.create(req, reply));

  // Get workflow by ID
  fastify.get('/workflows/:workflowId', {
    schema: {
      tags: ['Workflows'],
      summary: 'Get workflow by ID',
      description: 'Retrieves a single workflow by its ULID identifier',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(workflowIdParamSchema),
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              workflowId: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              nodes: { type: 'array', items: { type: 'object', additionalProperties: true } },
              edges: { type: 'array', items: { type: 'object', additionalProperties: true } },
              isEnabled: { type: 'boolean' },
              priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
              executionCount: { type: 'number' },
              lastExecutedAt: { type: 'string', format: 'date-time' },
              lastExecutionStatus: { type: 'string', enum: ['completed', 'failed', 'timeout', 'cancelled'] },
              version: { type: 'number' },
              applicationId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          'Workflow retrieved successfully'
        ),
        404: errorResponse('Workflow not found'),
      },
    },
    preHandler: [requireAuth, requirePermission('workflow:read')],
  }, (req: any, reply: any) => workflowController.getOne(req, reply));

  // List workflows
  fastify.get('/workflows', {
    schema: {
      tags: ['Workflows'],
      summary: 'List workflows',
      description: 'Lists workflows with pagination, filtering by tags/status, and search capabilities',
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(queryWorkflowsSchema),
      response: {
        200: paginatedResponse(
          {
            type: 'object',
            properties: {
              workflowId: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              isEnabled: { type: 'boolean' },
              priority: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
              executionCount: { type: 'number' },
              lastExecutedAt: { type: 'string', format: 'date-time' },
              lastExecutionStatus: { type: 'string' },
              version: { type: 'number' },
              applicationId: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          'Workflows retrieved successfully'
        ),
      },
    },
    preHandler: [requireAuth, requirePermission('workflow:read'), zodQueryValidator(queryWorkflowsSchema)],
  }, (req: any, reply: any) => workflowController.list(req, reply));

  // Update workflow
  fastify.patch('/workflows/:workflowId', {
    schema: {
      tags: ['Workflows'],
      summary: 'Update workflow',
      description: 'Updates an existing workflow. All fields are optional (partial update). Increments version on structure changes.',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(workflowIdParamSchema),
      body: zodToSwagger(updateWorkflowSchema),
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              workflowId: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              nodes: { type: 'array', items: { type: 'object' } },
              edges: { type: 'array', items: { type: 'object' } },
              isEnabled: { type: 'boolean' },
              version: { type: 'number' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          'Workflow updated successfully'
        ),
        404: errorResponse('Workflow not found'),
        400: errorResponse('Validation error'),
      },
    },
    preHandler: [requireAuth, requirePermission('workflow:update'), zodBodyValidator(updateWorkflowSchema)],
  }, async (req: any, reply: any) => {
    const result = await workflowController.update(req, reply);
    // Fire-and-forget reschedule if this workflow has a scheduled trigger
    workflowSchedulerService.rescheduleWorkflow(req.params.workflowId)
      .catch(err => fastify.log.warn({ err }, 'Scheduler reschedule failed'));
    return result;
  });

  // Delete workflow
  fastify.delete('/workflows/:workflowId', {
    schema: {
      tags: ['Workflows'],
      summary: 'Delete workflow',
      description: 'Deletes a workflow. Execution history is preserved.',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(workflowIdParamSchema),
      response: {
        200: successResponse(
          { type: 'object', properties: { workflowId: { type: 'string' } } },
          'Workflow deleted successfully'
        ),
        404: errorResponse('Workflow not found'),
      },
    },
    preHandler: [requireAuth, requirePermission('workflow:delete')],
  }, async (req: any, reply: any) => {
    const result = await workflowController.delete(req, reply);
    // Unschedule the workflow after deletion
    workflowSchedulerService.unscheduleWorkflow(req.params.workflowId);
    return result;
  });

  // Execute workflow
  fastify.post('/workflows/:workflowId/execute', {
    schema: {
      tags: ['Workflows'],
      summary: 'Execute workflow manually',
      description: 'Triggers manual execution of a workflow. Returns executionId immediately (202 Accepted). Execution runs asynchronously.',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(workflowIdParamSchema),
      body: zodToSwagger(executeWorkflowSchema),
      response: {
        202: successResponse(
          {
            type: 'object',
            properties: {
              executionId: { type: 'string', example: '01KGPQZ53TRMAG5Y1H2S2SHPVG' },
              status: { type: 'string', example: 'pending' },
              message: { type: 'string', example: 'Workflow execution started' },
            },
          },
          'Workflow execution started'
        ),
        404: errorResponse('Workflow not found'),
        400: errorResponse('Workflow is disabled'),
      },
    },
    preHandler: [requireAuth, requirePermission('workflow:execute'), zodBodyValidator(executeWorkflowSchema)],
  }, (req: any, reply: any) => workflowController.execute(req, reply));

  // Enable workflow
  fastify.post('/workflows/:workflowId/enable', {
    schema: {
      tags: ['Workflows'],
      summary: 'Enable workflow',
      description: 'Enables a workflow for automatic execution (triggers)',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(workflowIdParamSchema),
      response: {
        200: successResponse(
          { type: 'object', properties: { workflowId: { type: 'string' }, isEnabled: { type: 'boolean', example: true } } },
          'Workflow enabled successfully'
        ),
        404: errorResponse('Workflow not found'),
      },
    },
    preHandler: [requireAuth, requirePermission('workflow:update')],
  }, (req: any, reply: any) => workflowController.enable(req, reply));

  // Disable workflow
  fastify.post('/workflows/:workflowId/disable', {
    schema: {
      tags: ['Workflows'],
      summary: 'Disable workflow',
      description: 'Disables a workflow (no automatic execution)',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(workflowIdParamSchema),
      response: {
        200: successResponse(
          { type: 'object', properties: { workflowId: { type: 'string' }, isEnabled: { type: 'boolean', example: false } } },
          'Workflow disabled successfully'
        ),
        404: errorResponse('Workflow not found'),
      },
    },
    preHandler: [requireAuth, requirePermission('workflow:update')],
  }, (req: any, reply: any) => workflowController.disable(req, reply));

  // Cancel workflow execution
  fastify.post('/workflows/:workflowId/executions/:executionId/cancel', {
    schema: {
      tags: ['Workflows'],
      summary: 'Cancel a running workflow execution',
      description: 'Stops a currently running workflow execution',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['workflowId', 'executionId'],
        properties: {
          workflowId: { type: 'string' },
          executionId: { type: 'string' },
        },
      },
      response: {
        200: successResponse(
          { type: 'object', properties: { workflowId: { type: 'string' }, executionId: { type: 'string' }, status: { type: 'string', example: 'cancelled' } } },
          'Workflow execution cancelled'
        ),
        404: errorResponse('Execution not found or already completed'),
      },
    },
    preHandler: [requireAuth, requirePermission('workflow:execute')],
  }, (req: any, reply: any) => workflowController.cancelExecution(req, reply));

  // List workflow executions
  fastify.get('/workflows/:workflowId/executions', {
    schema: {
      tags: ['Workflows'],
      summary: 'List workflow executions',
      description: 'Lists execution history for a specific workflow',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(workflowIdParamSchema),
      querystring: zodToSwagger(queryExecutionsSchema),
      response: {
        200: paginatedResponse(
          {
            type: 'object',
            properties: {
              executionId: { type: 'string' },
              workflowId: { type: 'string' },
              workflowName: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'] },
              progress: { type: 'number', minimum: 0, maximum: 100 },
              trigger: { type: 'object', additionalProperties: true },
              startedAt: { type: 'string', format: 'date-time' },
              completedAt: { type: 'string', format: 'date-time' },
              duration: { type: 'number', description: 'Execution time in milliseconds' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          'Executions retrieved successfully'
        ),
      },
    },
    preHandler: [requireAuth, requirePermission('workflow:read')],
  }, (req: any, reply: any) => workflowController.listExecutions(req, reply));

  // Get execution details
  fastify.get('/executions/:executionId', {
    schema: {
      tags: ['Workflows'],
      summary: 'Get execution details',
      description: 'Retrieves detailed execution information including step-by-step log',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(executionIdParamSchema),
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              executionId: { type: 'string' },
              workflowId: { type: 'string' },
              workflowName: { type: 'string' },
              workflowVersion: { type: 'number' },
              status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'timeout'] },
              progress: { type: 'number' },
              trigger: { type: 'object', additionalProperties: true },
              inputData: { type: 'object', additionalProperties: true },
              outputData: { type: 'object', additionalProperties: true },
              variables: { type: 'object', additionalProperties: true },
              executionLog: { type: 'array', items: { type: 'object', additionalProperties: true } },
              error: { type: 'object', additionalProperties: true },
              startedAt: { type: 'string', format: 'date-time' },
              completedAt: { type: 'string', format: 'date-time' },
              duration: { type: 'number' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          'Execution retrieved successfully'
        ),
        404: errorResponse('Execution not found'),
      },
    },
    preHandler: [requireAuth, requirePermission('workflow:read')],
  }, (req: any, reply: any) => workflowController.getExecution(req, reply));

  // Evaluate expression against execution context
  fastify.post('/workflows/:workflowId/evaluate-expression', {
    schema: {
      tags: ['Workflows'],
      summary: 'Evaluate expression against execution context',
      description: 'Resolves a {{expression}} using variables and workspace from the last (or specified) workflow execution',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(workflowIdParamSchema),
      body: zodToSwagger(evaluateExpressionSchema),
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              expression: { type: 'string', example: '{{trigger.temperature}}' },
              result: { type: 'number', example: 25.5 },
              context: { type: 'object', additionalProperties: true },
            },
          },
          'Expression evaluated successfully'
        ),
        404: errorResponse('Execution not found'),
      },
    },
    preHandler: [requireAuth, requirePermission('workflow:read'), zodBodyValidator(evaluateExpressionSchema)],
  }, (req: any, reply: any) => workflowController.evaluateExpression(req, reply));
}
