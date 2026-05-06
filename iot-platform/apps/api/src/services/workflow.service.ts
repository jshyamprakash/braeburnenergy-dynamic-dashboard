import { ulid } from 'ulid';
import mongoose from 'mongoose';
import { Workflow, extractTriggerType, type WorkflowNode, type WorkflowEdge } from '../models/workflow.model';
import { Device } from '../models/device.model';
import { NotFoundError, UnprocessableError } from '../lib/errors';
import type {
  CreateWorkflowDTO,
  UpdateWorkflowDTO,
  QueryWorkflowsDTO,
} from '../schemas/workflow.schema';

/**
 * WorkflowService
 *
 * Handles business logic for workflow management:
 * - CRUD operations with ULID generation
 * - Workflow validation (cycles, orphaned nodes, config)
 * - Filtering, pagination, search
 */
export class WorkflowService {
  /**
   * Create a new workflow with validation
   */
  async create(orgId: string, userId: string, data: CreateWorkflowDTO) {
    const workflowId = ulid();

    // Enforce ADR-036: Workflow must belong to an application
    if (!data.applicationId) {
      throw new UnprocessableError('Workflow requires an application — create workflows from the Application Detail page');
    }

    // Enforce ADR-035: Workflow requires at least one device in the application
    const deviceCount = await Device.countDocuments({
      orgId: new mongoose.Types.ObjectId(orgId),
      applicationId: data.applicationId,
    });
    if (deviceCount === 0) {
      throw new UnprocessableError('Workflow requires at least one device in the application');
    }

    // Validate workflow structure (lenient on create — user hasn't connected nodes yet)
    const validationErrors = this.validateWorkflow(data.nodes, (data.edges || []) as any, { strict: false });
    if (validationErrors.length > 0) {
      throw new Error(`Workflow validation failed: ${validationErrors.join(', ')}`);
    }

    const workflow = new Workflow({
      workflowId,
      name: data.name,
      description: data.description,
      tags: data.tags || [],
      orgId: new mongoose.Types.ObjectId(orgId),
      userId,
      nodes: data.nodes,
      edges: data.edges || [],
      isEnabled: data.isEnabled || false,
      priority: data.priority || 'MEDIUM',
      maxConcurrentExecutions: data.maxConcurrentExecutions || 1,
      timeoutSeconds: data.timeoutSeconds || 300,
      schedule: data.schedule,
      triggerType: extractTriggerType(data.nodes),
      applicationId: data.applicationId,
      executionCount: 0,
      version: 1,
    });

    const saved = await workflow.save();
    return saved.toObject();
  }

  /**
   * Get workflow by workflowId within organization
   */
  async getByWorkflowId(orgId: string, workflowId: string) {
    const workflow = await Workflow.findOne({
      orgId: new mongoose.Types.ObjectId(orgId),
      workflowId,
    }).lean();

    return workflow;
  }

  /**
   * Get workflow by internal ID
   */
  async getById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Workflow.findById(id).lean();
  }

  /**
   * Update workflow within organization
   */
  async update(orgId: string, workflowId: string, data: UpdateWorkflowDTO) {
    // If nodes/edges are being updated, validate the new structure
    if (data.nodes || data.edges) {
      const existing = await this.getByWorkflowId(orgId, workflowId);
      if (!existing) {
        throw new NotFoundError('Workflow');
      }

      const newNodes = data.nodes || existing.nodes;
      const newEdges = data.edges !== undefined ? data.edges : existing.edges;

      // strict=true only when deploying (isEnabled: true); draft saves are lenient so
      // users can add nodes and connect them without auto-save rejecting mid-build.
      const isDeploying = data.isEnabled === true;
      const validationErrors = this.validateWorkflow(newNodes, newEdges as any, { strict: isDeploying });
      if (validationErrors.length > 0) {
        throw new Error(`Workflow validation failed: ${validationErrors.join(', ')}`);
      }
    }

    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.nodes !== undefined) {
      updateData.nodes = data.nodes;
      // Re-derive triggerType when nodes change
      updateData.triggerType = extractTriggerType(data.nodes);
    }
    if (data.edges !== undefined) updateData.edges = data.edges;
    if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.maxConcurrentExecutions !== undefined) updateData.maxConcurrentExecutions = data.maxConcurrentExecutions;
    if (data.timeoutSeconds !== undefined) updateData.timeoutSeconds = data.timeoutSeconds;
    if (data.schedule !== undefined) updateData.schedule = data.schedule;

    // Increment version on structure changes
    if (data.nodes || data.edges) {
      updateData.$inc = { version: 1 };
    }

    const workflow = await Workflow.findOneAndUpdate(
      {
        orgId: new mongoose.Types.ObjectId(orgId),
        workflowId,
      },
      updateData,
      { new: true }
    ).lean();

    return workflow;
  }

  /**
   * Delete workflow within organization
   */
  async delete(orgId: string, workflowId: string) {
    const workflow = await Workflow.findOneAndDelete({
      orgId: new mongoose.Types.ObjectId(orgId),
      workflowId,
    }).lean();

    if (!workflow) {
      throw new NotFoundError('Workflow');
    }

    // TODO: Delete related workflow executions (or keep for history)
    // For now, we'll keep executions as historical records

    // Mark all derived states as stale (ADR-034): the workflow producing derived
    // values is gone; gauges should show last-known value with amber indicator.
    const { deviceDerivedStateService } = await import('./device-derived-state.service');
    await deviceDerivedStateService.markAllStale();

    return workflow;
  }

  /**
   * List workflows with filtering and pagination
   */
  async list(orgId: string, query: QueryWorkflowsDTO) {
    const filter: any = {
      orgId: new mongoose.Types.ObjectId(orgId),
    };

    // Apply filters
    if (query.tags && query.tags.length > 0) {
      filter.tags = { $in: query.tags };
    }

    if (query.isEnabled !== undefined) {
      filter.isEnabled = query.isEnabled;
    }

    if (query.priority) {
      filter.priority = query.priority;
    }

    if (query.search) {
      filter.name = { $regex: query.search, $options: 'i' };
    }

    if (query.applicationId) {
      filter.applicationId = query.applicationId;
    }

    // Count total
    const total = await Workflow.countDocuments(filter);

    // Apply sorting
    const sortField = query.sortBy || 'updatedAt';
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    // Fetch workflows
    const workflows = await Workflow.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(query.offset || 0)
      .limit(query.limit || 100)
      .lean();

    return {
      workflows,
      total,
      limit: query.limit || 100,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + workflows.length < total,
    };
  }

  /**
   * Enable workflow
   */
  async enable(orgId: string, workflowId: string) {
    const workflow = await Workflow.findOneAndUpdate(
      {
        orgId: new mongoose.Types.ObjectId(orgId),
        workflowId,
      },
      { $set: { isEnabled: true } },
      { new: true }
    ).lean();

    if (!workflow) {
      throw new NotFoundError('Workflow');
    }

    return workflow;
  }

  /**
   * Disable workflow
   */
  async disable(orgId: string, workflowId: string) {
    const workflow = await Workflow.findOneAndUpdate(
      {
        orgId: new mongoose.Types.ObjectId(orgId),
        workflowId,
      },
      { $set: { isEnabled: false } },
      { new: true }
    ).lean();

    if (!workflow) {
      throw new NotFoundError('Workflow');
    }

    return workflow;
  }

  /**
   * Check if workflow exists
   */
  async exists(orgId: string, workflowId: string): Promise<boolean> {
    const count = await Workflow.countDocuments({
      orgId: new mongoose.Types.ObjectId(orgId),
      workflowId,
    });
    return count > 0;
  }

  /**
   * Find enabled workflows that match a trigger type with optional filters
   * Used by WorkflowTriggerDispatcher for auto-trigger matching
   *
   * Field matching behavior:
   * - If trigger node has no field configured (empty or missing), it matches ANY field (wildcard)
   * - If trigger node has a field configured, it matches only that specific field
   */
  async findTriggerWorkflows(
    orgId: string,
    triggerType: string,
    filters?: {
      deviceId?: string;
      field?: string;
    }
  ) {
    const filter: any = {
      orgId: new mongoose.Types.ObjectId(orgId),
      isEnabled: true,
      triggerType,
    };

    // Only filter by deviceId in DB query — do field matching in JS to handle "any field" (empty field = wildcard)
    if (filters?.deviceId) {
      filter['nodes.data.config.deviceId'] = filters.deviceId;
    }

    const workflows = await Workflow.find(filter).lean();

    // If no field filter, return all
    if (!filters?.field) return workflows;

    // Filter: a workflow matches if its trigger node has no field (any-field wildcard) OR field matches
    return workflows.filter((w: any) => {
      const triggerNode = w.nodes?.find((n: any) => n.type === triggerType);
      if (!triggerNode) return false;
      const configField = triggerNode.data?.config?.field;
      // Empty/absent field = wildcard (trigger on any field)
      return !configField || configField === filters.field;
    });
  }

  /**
   * Update workflow execution statistics
   */
  async updateExecutionStats(
    workflowId: string,
    status: 'completed' | 'failed' | 'timeout' | 'cancelled',
    duration: number
  ) {
    await Workflow.findOneAndUpdate(
      { workflowId },
      {
        $inc: { executionCount: 1 },
        $set: {
          lastExecutedAt: new Date(),
          lastExecutionStatus: status,
          lastExecutionDuration: duration,
        },
      }
    );
  }

  /**
   * Validate workflow structure
   * Returns array of error messages (empty if valid)
   *
   * strict=false (draft save): only checks trigger presence and dangling edge references.
   * strict=true  (deploy):     also checks for orphaned nodes and cycles.
   */
  validateWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[], options: { strict?: boolean } = {}): string[] {
    const errors: string[] = [];
    const strict = options.strict ?? true;

    // 1. Must have at least one trigger node.
    // Skipped when nodes array is empty — an empty canvas is a valid draft state.
    // Self-streaming nodes (csvStreamPlayer, combustionCsvPlayer) own their execution loop
    // and do not require a separate trigger node.
    const selfStreamingTypes = new Set(['action:csvStreamPlayer', 'action:combustionCsvPlayer']);
    const hasSelfStreaming = nodes.some(n => selfStreamingTypes.has(n.type));
    const triggerNodes = nodes.filter(n => n.type.startsWith('trigger:'));
    if (nodes.length > 0 && triggerNodes.length === 0 && !hasSelfStreaming) {
      errors.push('Workflow must have at least one trigger node');
    }

    // 2. Check for orphaned nodes — deploy-time only
    //    During draft saves users are still connecting nodes; skip this check.
    if (strict && nodes.length > 1) {
      const orphanedNodes = this.findOrphanedNodes(nodes, edges);
      if (orphanedNodes.length > 0) {
        errors.push(`Orphaned nodes found: ${orphanedNodes.map(n => n.id).join(', ')}`);
      }
    }

    // 3. Check for cycles — deploy-time only
    if (strict && this.hasCycle(nodes, edges)) {
      errors.push('Workflow contains cycles');
    }

    // 4. Validate edge connections exist (always — dangling edges are always wrong)
    for (const edge of edges) {
      const sourceExists = nodes.some(n => n.id === edge.source);
      const targetExists = nodes.some(n => n.id === edge.target);

      if (!sourceExists) {
        errors.push(`Edge ${edge.id} references non-existent source node: ${edge.source}`);
      }
      if (!targetExists) {
        errors.push(`Edge ${edge.id} references non-existent target node: ${edge.target}`);
      }
    }

    // Node-specific config validation (e.g. required deviceId, field) is intentionally
    // NOT run here. Workflows can be saved with incomplete configs while being built.
    // Config validation runs at execution time via the node handlers.

    return errors;
  }

  /**
   * Find nodes that are not connected to any other nodes
   * (excluding trigger nodes which can be standalone)
   */
  private findOrphanedNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const orphaned: WorkflowNode[] = [];

    for (const node of nodes) {
      // Trigger nodes can be standalone
      if (node.type.startsWith('trigger:')) continue;

      // Check if node has any incoming or outgoing connections
      const hasConnection = edges.some(
        edge => edge.source === node.id || edge.target === node.id
      );

      if (!hasConnection) {
        orphaned.push(node);
      }
    }

    return orphaned;
  }

  /**
   * Detect cycles in workflow graph using DFS
   */
  private hasCycle(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
    const graph = this.buildAdjacencyList(nodes, edges);
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          // Back edge found (cycle)
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    // Check from each node (handle disconnected components)
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }

  /**
   * Build adjacency list for graph traversal
   */
  private buildAdjacencyList(nodes: WorkflowNode[], edges: WorkflowEdge[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    // Initialize all nodes
    for (const node of nodes) {
      graph.set(node.id, []);
    }

    // Add edges
    for (const edge of edges) {
      const neighbors = graph.get(edge.source) || [];
      neighbors.push(edge.target);
      graph.set(edge.source, neighbors);
    }

    return graph;
  }

  /**
   * Validate node-specific configuration
   * (Currently unused; kept for future extensibility)
   */
  // private validateNodeConfig(node: WorkflowNode): string[] {
  //   const errors: string[] = [];
  //   const config = node.data.config;
  //
  //   // Validate based on node type
  //   switch (node.type) {
  //     case 'trigger:deviceStateChange':
  //       if (!config.deviceId && !config.deviceTags) {
  //         errors.push(`Node ${node.id}: deviceStateChange trigger requires deviceId or deviceTags`);
  //       }
  //       if (!config.field) {
  //         errors.push(`Node ${node.id}: deviceStateChange trigger requires field`);
  //       }
  //       break;
  //
  //     case 'trigger:scheduled':
  //       if (!config.cronExpression) {
  //         errors.push(`Node ${node.id}: scheduled trigger requires cronExpression`);
  //       }
  //       break;
  //
  //     case 'condition:comparison':
  //       if (!config.field) {
  //         errors.push(`Node ${node.id}: comparison condition requires field`);
  //       }
  //       if (!config.operator) {
  //         errors.push(`Node ${node.id}: comparison condition requires operator`);
  //       }
  //       if (config.value === undefined) {
  //         errors.push(`Node ${node.id}: comparison condition requires value`);
  //       }
  //       break;
  //
  //     case 'condition:threshold':
  //       if (!config.field) {
  //         errors.push(`Node ${node.id}: threshold condition requires field`);
  //       }
  //       if (config.min === undefined && config.max === undefined) {
  //         errors.push(`Node ${node.id}: threshold condition requires min or max`);
  //       }
  //       break;
  //
  //     case 'action:sendNotification':
  //       if (!config.message) {
  //         errors.push(`Node ${node.id}: sendNotification action requires message`);
  //       }
  //       if (!config.channels || config.channels.length === 0) {
  //         errors.push(`Node ${node.id}: sendNotification action requires at least one channel`);
  //       }
  //       break;
  //
  //     case 'action:updateDevice':
  //       if (!config.deviceId) {
  //         errors.push(`Node ${node.id}: updateDevice action requires deviceId`);
  //       }
  //       if (!config.updates || Object.keys(config.updates).length === 0) {
  //         errors.push(`Node ${node.id}: updateDevice action requires updates`);
  //       }
  //       break;
  //
  //     case 'action:callWebhook':
  //       if (!config.url) {
  //         errors.push(`Node ${node.id}: callWebhook action requires url`);
  //       }
  //       if (!config.method) {
  //         errors.push(`Node ${node.id}: callWebhook action requires method`);
  //       }
  //       break;
  //
  //     case 'transform:mathOperation':
  //       if (!config.field) {
  //         errors.push(`Node ${node.id}: mathOperation requires field`);
  //       }
  //       if (!config.operation) {
  //         errors.push(`Node ${node.id}: mathOperation requires operation`);
  //       }
  //       if (config.value === undefined) {
  //         errors.push(`Node ${node.id}: mathOperation requires value`);
  //       }
  //       break;
  //
  //     // Add more validations for other node types as needed
  //   }
  //
  //   return errors;
  // }
}
