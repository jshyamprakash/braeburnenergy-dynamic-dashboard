import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Server as SocketIOServer } from 'socket.io';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowEngineService } from '../services/workflow-engine.service';
import { resolveExpression } from '../services/workflow-node-handlers.service';
import { NotFoundError } from '../lib/errors';
import { sendSuccess, sendCreated, sendAccepted, sendPaginated } from '../lib/response';
import { getRequestContext } from '../lib/request-context';
import type {
  CreateWorkflowDTO,
  UpdateWorkflowDTO,
  QueryWorkflowsDTO,
  QueryExecutionsDTO,
  ExecuteWorkflowDTO,
  WorkflowIdParam,
  ExecutionIdParam,
  EvaluateExpressionDTO,
} from '../schemas/workflow.schema';

/**
 * WorkflowController
 *
 * HTTP request handlers for workflow management.
 * Zero try/catch — errors propagate to global error handler.
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
   */
  async create(
    request: FastifyRequest<{ Body: CreateWorkflowDTO }>,
    reply: FastifyReply
  ) {
    const { orgId, userId } = getRequestContext(request);
    const workflow = await this.workflowService.create(orgId, userId, request.body);
    return sendCreated(reply, workflow);
  }

  /**
   * GET /workflows/:workflowId
   */
  async getOne(
    request: FastifyRequest<{ Params: WorkflowIdParam }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { workflowId } = request.params;
    const workflow = await this.workflowService.getByWorkflowId(orgId, workflowId);

    if (!workflow) {
      throw new NotFoundError('Workflow');
    }

    return sendSuccess(reply, workflow);
  }

  /**
   * GET /workflows
   */
  async list(
    request: FastifyRequest<{ Querystring: QueryWorkflowsDTO }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const result = await this.workflowService.list(orgId, request.query);
    return sendPaginated(reply, result.workflows, {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }

  /**
   * PATCH /workflows/:workflowId
   */
  async update(
    request: FastifyRequest<{ Params: WorkflowIdParam; Body: UpdateWorkflowDTO }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { workflowId } = request.params;
    const workflow = await this.workflowService.update(orgId, workflowId, request.body);

    if (!workflow) {
      throw new NotFoundError('Workflow');
    }

    return sendSuccess(reply, workflow);
  }

  /**
   * DELETE /workflows/:workflowId
   */
  async delete(
    request: FastifyRequest<{ Params: WorkflowIdParam }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { workflowId } = request.params;
    // workflowService.delete throws NotFoundError if not found
    const workflow = await this.workflowService.delete(orgId, workflowId);
    return sendSuccess(reply, workflow);
  }

  /**
   * POST /workflows/:workflowId/execute
   */
  async execute(
    request: FastifyRequest<{ Params: WorkflowIdParam; Body: ExecuteWorkflowDTO }>,
    reply: FastifyReply
  ) {
    const { userId } = getRequestContext(request);
    const { workflowId } = request.params;
    const { inputData, startNodeId } = request.body as ExecuteWorkflowDTO;

    // workflowService.exists check omitted — engineService.execute throws NotFoundError
    const executionId = await this.engineService.execute(
      workflowId,
      {
        type: 'manual',
        source: 'api',
        data: inputData || {},
      },
      userId,
      true, // bypassEnabled: manual test runs always work
      startNodeId
    );

    return sendAccepted(reply, {
      executionId,
      status: 'pending',
      message: 'Workflow execution started',
    });
  }

  /**
   * POST /workflows/:workflowId/enable
   */
  async enable(
    request: FastifyRequest<{ Params: WorkflowIdParam }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { workflowId } = request.params;
    // workflowService.enable throws NotFoundError if not found
    const workflow = await this.workflowService.enable(orgId, workflowId);
    return sendSuccess(reply, workflow);
  }

  /**
   * POST /workflows/:workflowId/disable
   */
  async disable(
    request: FastifyRequest<{ Params: WorkflowIdParam }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { workflowId } = request.params;
    const workflow = await this.workflowService.disable(orgId, workflowId);
    return sendSuccess(reply, workflow);
  }

  /**
   * POST /workflows/:workflowId/executions/:executionId/cancel
   */
  async cancelExecution(
    request: FastifyRequest<{ Params: { workflowId: string; executionId: string } }>,
    reply: FastifyReply
  ) {
    const { workflowId, executionId } = request.params;
    const result = await this.engineService.cancelExecution(executionId);

    if (!result) {
      throw new NotFoundError('Execution');
    }

    return sendSuccess(reply, { workflowId, executionId, status: 'cancelled' });
  }

  /**
   * GET /workflows/:workflowId/executions
   */
  async listExecutions(
    request: FastifyRequest<{ Params: WorkflowIdParam; Querystring: QueryExecutionsDTO }>,
    reply: FastifyReply
  ) {
    const { workflowId } = request.params;
    const result = await this.engineService.listExecutions(workflowId, request.query);
    return sendPaginated(reply, result.executions, {
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      hasMore: result.hasMore,
    });
  }

  /**
   * GET /executions/:executionId
   */
  async getExecution(
    request: FastifyRequest<{ Params: ExecutionIdParam }>,
    reply: FastifyReply
  ) {
    const { executionId } = request.params;
    const execution = await this.engineService.getExecution(executionId);

    if (!execution) {
      throw new NotFoundError('Execution');
    }

    return sendSuccess(reply, execution);
  }

  /**
   * POST /workflows/:workflowId/evaluate-expression
   * Evaluates a {{expression}} against the context of the last execution
   */
  async evaluateExpression(
    request: FastifyRequest<{ Params: WorkflowIdParam; Body: EvaluateExpressionDTO }>,
    reply: FastifyReply
  ) {
    const { workflowId } = request.params;
    const { expression, executionId } = request.body;

    // Get execution (use provided ID or find latest)
    let execution;
    if (executionId) {
      execution = await this.engineService.getExecution(executionId);
    } else {
      // Get the latest execution for this workflow
      const result = await this.engineService.listExecutions(workflowId, {
        limit: 1,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      execution = result.executions[0] || null;
    }

    if (!execution) {
      throw new NotFoundError('Execution');
    }

    // Build context from the last execution log entry
    let context: any = {
      variables: execution.variables || {},
      trigger: execution.trigger?.data || {},
      workspace: {},
    };

    // If execution log has entries, use the last one's context snapshot
    if (execution.executionLog && execution.executionLog.length > 0) {
      const lastStep = execution.executionLog[execution.executionLog.length - 1];
      if (lastStep.contextSnapshot) {
        context = lastStep.contextSnapshot;
      }
    }

    // Resolve the expression using the context
    const result = resolveExpression(expression, context);

    return sendSuccess(reply, {
      expression,
      result,
      context,
    });
  }
}
