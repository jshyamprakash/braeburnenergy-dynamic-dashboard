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
import { broadcastWorkflowExecutionStep, broadcastWorkflowExecutionCompleted, broadcastWorkflowDebugMessage, broadcastDeviceState } from '../websocket/server';
import type { QueryExecutionsDTO } from '../schemas/workflow.schema';
import { NotFoundError, UnprocessableError } from '../lib/errors';

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
    this.nodeHandlers = new WorkflowNodeHandlers(io);
    this.io = io;
  }

  /**
   * Start workflow execution (async)
   * Returns executionId immediately and executes in background
   */
  async execute(
    workflowId: string,
    trigger: Omit<ExecutionTrigger, 'timestamp'>,
    userId?: string,
    bypassEnabled = false,
    startNodeId?: string
  ): Promise<string> {
    // Find workflow
    const workflow = await Workflow.findOne({ workflowId }).lean();
    if (!workflow) {
      throw new NotFoundError('Workflow');
    }

    if (!workflow.isEnabled && !bypassEnabled) {
      throw new UnprocessableError('Workflow is disabled');
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
    this.executeWorkflow(execution._id.toString(), workflow, startNodeId).catch(err => {
      console.error(`Workflow execution ${executionId} failed:`, err);
    });

    return executionId;
  }

  /**
   * Execute workflow (private async method)
   */
  private async executeWorkflow(executionMongoId: string, workflow: any, startNodeId?: string) {
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
        // ADR-037: workspace = device_states.data snapshot (raw telemetry)
        workspace: execution.inputData.workspace ?? {},
        workflowId: execution.workflowId,
      };

      // Find start node — use explicit startNodeId if provided, otherwise find trigger node
      const startNode = startNodeId
        ? workflow.nodes.find((n: WorkflowNode) => n.id === startNodeId)
        : workflow.nodes.find((n: WorkflowNode) => n.type.startsWith('trigger:'));
      if (!startNode) {
        throw new Error(startNodeId ? `Start node ${startNodeId} not found` : 'No trigger node found');
      }

      // Execute workflow (depth-first traversal)
      await this.executeNode(
        startNode,
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
    // Check if execution was cancelled externally
    if (execution.status === 'cancelled') {
      return; // Stop execution silently
    }

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
      // Add workflowId to context for streaming nodes
      context.workflowId = execution.workflowId?.toString() ?? '';

      // Self-streaming nodes (csvStreamPlayer) run an internal loop and call downstream
      // nodes on each tick via _tickExecutor, so the engine must not re-traverse afterwards.
      if (node.type === 'action:csvStreamPlayer' || node.type === 'action:combustionCsvPlayer') {
        context._tickExecutor = async (tickPayload: Record<string, unknown>) => {
          const tickContext = { ...context, currentData: tickPayload };
          const outgoing = allEdges.filter((e: any) => e.source === node.id);
          for (const edge of outgoing) {
            const nextNode = allNodes.find((n: any) => n.id === edge.target);
            if (nextNode) {
              await this.executeNode(nextNode, allNodes, allEdges, tickContext, execution).catch(() => {});
            }
          }
        };
      }

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

      // Update context: store node output under nodeId key for variable binding
      if (result.output !== undefined) {
        context.currentData = result.output;
        context[node.id] = result.output; // Enable {{nodeId.field}} expressions
      }

      // Seed trigger object from input data (for first node)
      if (node.type.startsWith('trigger:')) {
        context.trigger = result.output || context.triggerData;
        // ADR-037: keep workspace at root context after trigger fires
        context.workspace = context.trigger.workspace ?? context.workspace ?? {};
      }

      // Update variables if provided
      if (result.variables) {
        context.variables = { ...context.variables, ...result.variables };
      }

      // Snapshot taken AFTER context mutations so it reflects post-execution state
      const contextSnapshot = {
        variables: context.variables,
        workspace: context.workspace,
        trigger: context.trigger,
      };

      // Log execution
      const logEntry: ExecutionLogEntry = {
        timestamp: new Date(),
        nodeId: node.id,
        nodeType: node.type,
        status: 'completed',
        input: context.currentData,
        output: result.output,
        duration: nodeDuration,
        notes: result.notes,
        contextSnapshot,
      };

      execution.executionLog.push(logEntry);
      await execution.save();

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
        notes: result.notes,
        contextSnapshot,
      });

      // Emit real-time debug message if node produced one (action:debug)
      if (result.debugMessage && this.io) {
        broadcastWorkflowDebugMessage(this.io, {
          workflowId: execution.workflowId,
          executionId: execution.executionId,
          orgId: execution.orgId.toString(),
          nodeId: node.id,
          nodeLabel: result.debugMessage.nodeLabel,
          level: result.debugMessage.level,
          message: result.debugMessage.message,
          rawData: result.debugMessage.data,
          timestamp: new Date().toISOString(),
        });
      }

      // Broadcast device state update via WebSocket (writeDeviceState sets this after DB write)
      if (result.broadcastState && this.io) {
        broadcastDeviceState(this.io, {
          deviceId: result.broadcastState.deviceId,
          data: result.broadcastState.data,
          derived: result.broadcastState.derived,
          timestamp: new Date(result.broadcastState.timestamp),
        });
      }

      // Self-streaming nodes handle downstream execution per-tick via _tickExecutor
      if (result.skipDownstream) return;

      // Find next nodes (follow edges)
      const outgoingEdges = allEdges.filter(e => e.source === node.id);

      // For switch nodes, route to specific branch
      if (node.type === 'logic:switch') {
        const branch = result.switchBranch ?? 'default';
        const nextEdge = outgoingEdges.find(e => e.sourceHandle === branch);

        if (nextEdge) {
          const nextNode = allNodes.find(n => n.id === nextEdge.target);
          if (nextNode) {
            await this.executeNode(nextNode, allNodes, allEdges, context, execution);
          }
        }
      } else if (node.type.startsWith('condition:')) {
        // For condition nodes, choose branch based on result
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
    if (!config) return {};
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
   * Cancel a running workflow execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = await WorkflowExecution.findOne({ executionId });

    if (!execution || !['pending', 'running'].includes(execution.status)) {
      return false;
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    await execution.save();

    // Emit WebSocket: workflow:execution:completed (cancelled)
    this.emitExecutionEvent('workflow:execution:completed', {
      executionId: execution.executionId,
      workflowId: execution.workflowId,
      orgId: execution.orgId.toString(),
      status: 'cancelled',
    });

    return true;
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
