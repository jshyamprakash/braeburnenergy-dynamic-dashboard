import { ulid } from 'ulid';
import type { Server as SocketIOServer } from 'socket.io';
import {
  WorkflowExecution,
  type ExecutionTrigger,
  type ExecutionLogEntry,
} from '../models/workflow-execution.model';
import { Workflow, type WorkflowNode, type WorkflowEdge } from '../models/workflow.model';
import { WorkflowService } from './workflow.service';
import { WorkflowNodeHandlers, resolveExpression } from './workflow-node-handlers.service';
import { broadcastWorkflowExecutionStep, broadcastWorkflowExecutionCompleted } from '../websocket/server';
import type { QueryExecutionsDTO } from '../schemas/workflow.schema';

/**
 * WorkflowEngineService
 *
 * Executes workflows with step-by-step logging and error handling.
 * Implements depth-first traversal for node execution.
 */
export class WorkflowEngineService {
  private workflowService: WorkflowService;
  private nodeHandlers: WorkflowNodeHandlers;
  private io?: SocketIOServer;

  constructor(io?: SocketIOServer) {
    this.workflowService = new WorkflowService();
    this.nodeHandlers = new WorkflowNodeHandlers();
    this.io = io;
  }

  /**
   * Start workflow execution (async)
   * Returns executionId immediately and executes in background
   */
  async execute(
    workflowId: string,
    trigger: Omit<ExecutionTrigger, 'timestamp'>,
    userId?: string
  ): Promise<string> {
    // Find workflow
    const workflow = await Workflow.findOne({ workflowId }).lean();
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (!workflow.isEnabled) {
      throw new Error('Workflow is disabled');
    }

    // Create execution record
    const executionId = ulid();
    const execution = new WorkflowExecution({
      executionId,
      workflowId: workflow.workflowId,
      workflowName: workflow.name,
      workflowVersion: workflow.version,
      orgId: workflow.orgId,
      userId,
      trigger: {
        ...trigger,
        timestamp: new Date(),
      },
      status: 'pending',
      progress: 0,
      inputData: trigger.data || {},
      variables: {},
      executionLog: [],
    });

    await execution.save();

    // Execute workflow asynchronously (don't await)
    this.executeWorkflow(execution._id.toString(), workflow).catch(err => {
      console.error(`Workflow execution ${executionId} failed:`, err);
    });

    return executionId;
  }

  /**
   * Execute workflow (private async method)
   */
  private async executeWorkflow(executionMongoId: string, workflow: any) {
    const execution = await WorkflowExecution.findById(executionMongoId);
    if (!execution) {
      throw new Error('Execution not found');
    }

    const startTime = Date.now();

    try {
      // Update status to running
      execution.status = 'running';
      execution.startedAt = new Date();
      await execution.save();

      // Emit WebSocket: workflow:execution:started
      this.emitExecutionEvent('workflow:execution:started', {
        executionId: execution.executionId,
        workflowId: execution.workflowId,
        orgId: execution.orgId.toString(),
        status: 'running',
      });

      // Initialize execution context
      const context = {
        variables: {},
        triggerData: execution.inputData,
        currentData: execution.inputData,
      };

      // Find trigger node (starting point)
      const triggerNode = workflow.nodes.find((n: WorkflowNode) => n.type.startsWith('trigger:'));
      if (!triggerNode) {
        throw new Error('No trigger node found');
      }

      // Execute workflow (depth-first traversal)
      await this.executeNode(
        triggerNode,
        workflow.nodes,
        workflow.edges,
        context,
        execution
      );

      // Mark as completed
      const endTime = Date.now();
      const duration = endTime - startTime;

      execution.status = 'completed';
      execution.progress = 100;
      execution.completedAt = new Date();
      execution.duration = duration;
      execution.outputData = context.currentData;
      await execution.save();

      // Update workflow stats
      await this.workflowService.updateExecutionStats(
        workflow.workflowId,
        'completed',
        duration
      );

      // Emit WebSocket: workflow:execution:completed
      this.emitExecutionEvent('workflow:execution:completed', {
        executionId: execution.executionId,
        workflowId: execution.workflowId,
        orgId: execution.orgId.toString(),
        status: 'completed',
        duration,
        outputData: context.currentData,
      });

    } catch (error: any) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.duration = duration;
      execution.error = {
        message: error.message || 'Unknown error',
        nodeId: execution.currentNodeId || 'unknown',
        stack: error.stack,
        timestamp: new Date(),
      };
      await execution.save();

      // Update workflow stats
      await this.workflowService.updateExecutionStats(
        workflow.workflowId,
        'failed',
        duration
      );

      // Emit WebSocket: workflow:execution:failed
      this.emitExecutionEvent('workflow:execution:failed', {
        executionId: execution.executionId,
        workflowId: execution.workflowId,
        orgId: execution.orgId.toString(),
        status: 'failed',
        error: {
          message: error.message,
          nodeId: execution.currentNodeId,
        },
      });
    }
  }

  /**
   * Execute a single node (recursive depth-first traversal)
   */
  private async executeNode(
    node: WorkflowNode,
    allNodes: WorkflowNode[],
    allEdges: WorkflowEdge[],
    context: any,
    execution: any
  ): Promise<void> {
    const nodeStartTime = Date.now();

    // Update current node in execution
    execution.currentNodeId = node.id;
    await execution.save();

    // Emit WebSocket: workflow:execution:step (running)
    this.emitExecutionEvent('workflow:execution:step', {
      executionId: execution.executionId,
      workflowId: execution.workflowId,
      orgId: execution.orgId.toString(),
      nodeId: node.id,
      nodeType: node.type,
      status: 'running',
    });

    try {
      // Resolve expressions in node config before execution
      const resolvedNode = {
        ...node,
        data: {
          ...node.data,
          config: this.resolveNodeConfig(node.data.config, context),
        },
      };

      // Execute node handler with resolved config
      const result = await this.nodeHandlers.execute(resolvedNode, context);

      const nodeEndTime = Date.now();
      const nodeDuration = nodeEndTime - nodeStartTime;

      // Log execution
      const logEntry: ExecutionLogEntry = {
        timestamp: new Date(),
        nodeId: node.id,
        nodeType: node.type,
        status: 'completed',
        input: context.currentData,
        output: result.output,
        duration: nodeDuration,
      };

      execution.executionLog.push(logEntry);
      await execution.save();

      // Update context: store node output under nodeId key for variable binding
      if (result.output !== undefined) {
        context.currentData = result.output;
        context[node.id] = result.output; // Enable {{nodeId.field}} expressions
      }

      // Seed trigger object from input data (for first node)
      if (node.type.startsWith('trigger:')) {
        context.trigger = result.output || context.triggerData;
      }

      // Update variables if provided
      if (result.variables) {
        context.variables = { ...context.variables, ...result.variables };
      }

      // Emit WebSocket: workflow:execution:step (completed)
      this.emitExecutionEvent('workflow:execution:step', {
        executionId: execution.executionId,
        workflowId: execution.workflowId,
        orgId: execution.orgId.toString(),
        nodeId: node.id,
        nodeType: node.type,
        status: 'completed',
        output: result.output,
        duration: nodeDuration,
      });

      // Find next nodes (follow edges)
      const outgoingEdges = allEdges.filter(e => e.source === node.id);

      // For condition nodes, choose branch based on result
      if (node.type.startsWith('condition:')) {
        const branch = result.conditionMet ? 'true' : 'false';
        const nextEdge = outgoingEdges.find(e => e.sourceHandle === branch);

        if (nextEdge) {
          const nextNode = allNodes.find(n => n.id === nextEdge.target);
          if (nextNode) {
            await this.executeNode(nextNode, allNodes, allEdges, context, execution);
          }
        }
      } else {
        // Execute all outgoing nodes (sequential)
        for (const edge of outgoingEdges) {
          const nextNode = allNodes.find(n => n.id === edge.target);
          if (nextNode) {
            await this.executeNode(nextNode, allNodes, allEdges, context, execution);
          }
        }
      }

    } catch (error: any) {
      const nodeEndTime = Date.now();
      const nodeDuration = nodeEndTime - nodeStartTime;

      // Log failed execution
      const logEntry: ExecutionLogEntry = {
        timestamp: new Date(),
        nodeId: node.id,
        nodeType: node.type,
        status: 'failed',
        input: context.currentData,
        error: error.message,
        duration: nodeDuration,
      };

      execution.executionLog.push(logEntry);
      await execution.save();

      // Emit WebSocket: workflow:execution:step (failed)
      this.emitExecutionEvent('workflow:execution:step', {
        executionId: execution.executionId,
        workflowId: execution.workflowId,
        orgId: execution.orgId.toString(),
        nodeId: node.id,
        nodeType: node.type,
        status: 'failed',
        error: error.message,
        duration: nodeDuration,
      });

      // Rethrow to stop workflow execution
      throw error;
    }
  }

  /**
   * Resolve variable expressions in node config
   * Recursively resolves {{expressions}} in all config fields
   */
  private resolveNodeConfig(config: Record<string, any>, context: any): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        resolved[key] = resolveExpression(value, context);
      } else if (Array.isArray(value)) {
        resolved[key] = value.map(item =>
          typeof item === 'string' ? resolveExpression(item, context) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveNodeConfig(value, context);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Get execution by executionId
   */
  async getExecution(executionId: string) {
    const execution = await WorkflowExecution.findOne({ executionId }).lean();
    return execution;
  }

  /**
   * List executions for a workflow
   */
  async listExecutions(workflowId: string, query: QueryExecutionsDTO) {
    const filter: any = { workflowId };

    // Apply filters
    if (query.status) {
      filter.status = query.status;
    }

    if (query.triggerType) {
      filter['trigger.type'] = query.triggerType;
    }

    // Count total
    const total = await WorkflowExecution.countDocuments(filter);

    // Apply sorting
    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    // Fetch executions
    const executions = await WorkflowExecution.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(query.offset || 0)
      .limit(query.limit || 100)
      .lean();

    return {
      executions,
      total,
      limit: query.limit || 100,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + executions.length < total,
    };
  }

  /**
   * Emit WebSocket event for execution updates
   */
  private emitExecutionEvent(eventName: string, data: any) {
    if (!this.io) {
      console.warn(`[WebSocket] Socket.io not initialized, event ${eventName} not broadcast`);
      return;
    }

    // Emit start events (not in broadcast functions, emit directly)
    if (eventName === 'workflow:execution:started') {
      this.io.to(`workflow:${data.workflowId}`).emit(eventName, data);
      this.io.to(`org:${data.orgId}`).emit(eventName, data);
      console.log(`[WS] Workflow started: ${data.workflowId}`);
      return;
    }

    // Emit step events (running, completed, failed)
    if (eventName === 'workflow:execution:step') {
      broadcastWorkflowExecutionStep(this.io, data);
      return;
    }

    // Emit completion events (completed, failed)
    if (eventName === 'workflow:execution:completed' || eventName === 'workflow:execution:failed') {
      broadcastWorkflowExecutionCompleted(this.io, data);
      return;
    }

    console.log(`[WebSocket] ${eventName}:`, data);
  }
}
