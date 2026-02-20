import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowEngineService } from '../services/workflow-engine.service';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  queryWorkflowsSchema,
  queryExecutionsSchema,
  executeWorkflowSchema,
  workflowIdParamSchema,
  executionIdParamSchema,
  type CreateWorkflowDTO,
  type UpdateWorkflowDTO,
  type QueryWorkflowsDTO,
  type QueryExecutionsDTO,
  type ExecuteWorkflowDTO,
  type WorkflowIdParam,
  type ExecutionIdParam,
} from '../schemas/workflow.schema';

/**
 * Default organization ID for POC
 * TODO: Replace with orgId from JWT token in MVP
 */
const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

/**
 * Default user ID for POC
 * TODO: Replace with userId from JWT token in MVP
 */
const DEFAULT_USER_ID = 'admin-user';

/**
 * WorkflowController
 *
 * HTTP request handlers for workflow management
 * Handles CRUD operations, execution, and execution history
 */
export class WorkflowController {
  private workflowService: WorkflowService;
  private engineService: WorkflowEngineService;

  constructor(io?: SocketIOServer) {
    this.workflowService = new WorkflowService();
    this.engineService = new WorkflowEngineService(io);
  }

  /**
   * POST /workflows
   * Create a new workflow
   */
  async create(
    request: FastifyRequest<{ Body: CreateWorkflowDTO }>,
    reply: FastifyReply
  ) {
    try {
      const validatedData = createWorkflowSchema.parse(request.body);

      const workflow = await this.workflowService.create(
        DEFAULT_ORG_ID,
        DEFAULT_USER_ID,
        validatedData
      );

      return reply.code(201).send({
        success: true,
        data: workflow,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      if (error.message.includes('validation failed')) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }

      request.log.error(error, 'Error creating workflow');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /workflows/:workflowId
   * Get workflow by ID
   */
  async getOne(
    request: FastifyRequest<{ Params: WorkflowIdParam }>,
    reply: FastifyReply
  ) {
    try {
      const { workflowId } = workflowIdParamSchema.parse(request.params);

      const workflow = await this.workflowService.getByWorkflowId(
        DEFAULT_ORG_ID,
        workflowId
      );

      if (!workflow) {
        return reply.code(404).send({
          success: false,
          error: 'Workflow not found',
        });
      }

      return reply.send({
        success: true,
        data: workflow,
      });
    } catch (error: any) {
      request.log.error(error, 'Error fetching workflow');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /workflows
   * List workflows with filtering and pagination
   */
  async list(
    request: FastifyRequest<{ Querystring: QueryWorkflowsDTO }>,
    reply: FastifyReply
  ) {
    try {
      const query = queryWorkflowsSchema.parse(request.query);

      const result = await this.workflowService.list(DEFAULT_ORG_ID, query);

      return reply.send({
        success: true,
        data: result.workflows,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      });
    } catch (error: any) {
      request.log.error(error, 'Error listing workflows');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * PATCH /workflows/:workflowId
   * Update workflow
   */
  async update(
    request: FastifyRequest<{ Params: WorkflowIdParam; Body: UpdateWorkflowDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { workflowId } = workflowIdParamSchema.parse(request.params);
      const validatedData = updateWorkflowSchema.parse(request.body);

      const workflow = await this.workflowService.update(
        DEFAULT_ORG_ID,
        workflowId,
        validatedData
      );

      if (!workflow) {
        return reply.code(404).send({
          success: false,
          error: 'Workflow not found',
        });
      }

      return reply.send({
        success: true,
        data: workflow,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: error.errors,
        });
      }

      if (error.message.includes('validation failed')) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }

      request.log.error(error, 'Error updating workflow');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * DELETE /workflows/:workflowId
   * Delete workflow
   */
  async delete(
    request: FastifyRequest<{ Params: WorkflowIdParam }>,
    reply: FastifyReply
  ) {
    try {
      const { workflowId } = workflowIdParamSchema.parse(request.params);

      const workflow = await this.workflowService.delete(
        DEFAULT_ORG_ID,
        workflowId
      );

      return reply.send({
        success: true,
        data: workflow,
      });
    } catch (error: any) {
      if (error.message === 'Workflow not found') {
        return reply.code(404).send({
          success: false,
          error: error.message,
        });
      }

      request.log.error(error, 'Error deleting workflow');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /workflows/:workflowId/execute
   * Execute workflow manually
   */
  async execute(
    request: FastifyRequest<{ Params: WorkflowIdParam; Body: ExecuteWorkflowDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { workflowId } = workflowIdParamSchema.parse(request.params);
      const { inputData, variables } = executeWorkflowSchema.parse(request.body);

      // Check if workflow exists
      const exists = await this.workflowService.exists(DEFAULT_ORG_ID, workflowId);
      if (!exists) {
        return reply.code(404).send({
          success: false,
          error: 'Workflow not found',
        });
      }

      // Execute workflow (async)
      const executionId = await this.engineService.execute(
        workflowId,
        {
          type: 'manual',
          source: 'api',
          data: inputData || {},
        },
        DEFAULT_USER_ID
      );

      // Return 202 Accepted (execution in progress)
      return reply.code(202).send({
        success: true,
        data: {
          executionId,
          status: 'pending',
          message: 'Workflow execution started',
        },
      });
    } catch (error: any) {
      if (error.message.includes('disabled')) {
        return reply.code(400).send({
          success: false,
          error: error.message,
        });
      }

      request.log.error(error, 'Error executing workflow');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /workflows/:workflowId/enable
   * Enable workflow
   */
  async enable(
    request: FastifyRequest<{ Params: WorkflowIdParam }>,
    reply: FastifyReply
  ) {
    try {
      const { workflowId } = workflowIdParamSchema.parse(request.params);

      const workflow = await this.workflowService.enable(
        DEFAULT_ORG_ID,
        workflowId
      );

      return reply.send({
        success: true,
        data: workflow,
      });
    } catch (error: any) {
      if (error.message === 'Workflow not found') {
        return reply.code(404).send({
          success: false,
          error: error.message,
        });
      }

      request.log.error(error, 'Error enabling workflow');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * POST /workflows/:workflowId/disable
   * Disable workflow
   */
  async disable(
    request: FastifyRequest<{ Params: WorkflowIdParam }>,
    reply: FastifyReply
  ) {
    try {
      const { workflowId } = workflowIdParamSchema.parse(request.params);

      const workflow = await this.workflowService.disable(
        DEFAULT_ORG_ID,
        workflowId
      );

      return reply.send({
        success: true,
        data: workflow,
      });
    } catch (error: any) {
      if (error.message === 'Workflow not found') {
        return reply.code(404).send({
          success: false,
          error: error.message,
        });
      }

      request.log.error(error, 'Error disabling workflow');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /workflows/:workflowId/executions
   * List workflow executions
   */
  async listExecutions(
    request: FastifyRequest<{ Params: WorkflowIdParam; Querystring: QueryExecutionsDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { workflowId } = workflowIdParamSchema.parse(request.params);
      const query = queryExecutionsSchema.parse(request.query);

      const result = await this.engineService.listExecutions(workflowId, query);

      return reply.send({
        success: true,
        data: result.executions,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.hasMore,
        },
      });
    } catch (error: any) {
      request.log.error(error, 'Error listing executions');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /executions/:executionId
   * Get execution details
   */
  async getExecution(
    request: FastifyRequest<{ Params: ExecutionIdParam }>,
    reply: FastifyReply
  ) {
    try {
      const { executionId } = executionIdParamSchema.parse(request.params);

      const execution = await this.engineService.getExecution(executionId);

      if (!execution) {
        return reply.code(404).send({
          success: false,
          error: 'Execution not found',
        });
      }

      return reply.send({
        success: true,
        data: execution,
      });
    } catch (error: any) {
      request.log.error(error, 'Error fetching execution');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
