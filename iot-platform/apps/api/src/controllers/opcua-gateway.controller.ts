import { FastifyRequest, FastifyReply } from 'fastify';
import { OpcuaGateway } from '../models';
import { opcuaGatewayManager } from '../services/opcua-gateway-manager.service';

/**
 * OPC UA Gateway Controller
 *
 * HTTP handlers for OPC UA gateway configuration and control.
 */

// ============================================================================
// Gateway Configuration Management
// ============================================================================

/**
 * POST /opcua-gateways
 * Create OPC UA gateway
 */
export async function createOpcuaGateway(
  request: FastifyRequest<{
    Body: {
      name: string;
      description?: string;
      deviceId: string;
      endpointUrl: string;
      securityMode?: string;
      securityPolicy?: string;
      username?: string;
      password?: string;
      certificatePath?: string;
      privateKeyPath?: string;
      connectionStrategy?: {
        maxRetry?: number;
        initialDelay?: number;
        maxDelay?: number;
      };
      requestedSessionTimeout?: number;
      keepSessionAlive?: boolean;
      monitoringMode?: string;
      pollingInterval?: number;
      subscriptionSettings?: {
        publishingInterval?: number;
        maxNotificationsPerPublish?: number;
        priority?: number;
        samplingInterval?: number;
        queueSize?: number;
      };
      nodeMappings: Array<{
        field: string;
        nodeId: string;
        dataType?: string;
        scale?: number;
        offset?: number;
        unit?: string;
        description?: string;
      }>;
      tags?: string[];
    };
  }>,
  reply: FastifyReply
) {
  try {
    const gateway = new OpcuaGateway(request.body);
    await gateway.save();

    return reply.code(201).send({
      success: true,
      data: gateway,
      message: 'OPC UA gateway created successfully',
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(400).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * GET /opcua-gateways
 * List OPC UA gateways
 */
export async function listOpcuaGateways(
  request: FastifyRequest<{
    Querystring: {
      deviceId?: string;
      isActive?: string;
      isConnected?: string;
      monitoringMode?: string;
      page?: string;
      limit?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const { deviceId, isActive, isConnected, monitoringMode, page = '1', limit = '20' } = request.query;

    const filter: any = {};
    if (deviceId) filter.deviceId = deviceId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (isConnected !== undefined) filter.isConnected = isConnected === 'true';
    if (monitoringMode) filter.monitoringMode = monitoringMode;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [gateways, total] = await Promise.all([
      OpcuaGateway.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      OpcuaGateway.countDocuments(filter),
    ]);

    // Add runtime status
    const gatewaysWithStatus = gateways.map((gateway) => {
      const status = opcuaGatewayManager.getGatewayStatus(gateway._id.toString());
      return {
        ...gateway,
        runtime: status || { isRunning: false, isConnected: false },
      };
    });

    return reply.send({
      success: true,
      data: gatewaysWithStatus,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * GET /opcua-gateways/running
 * Get all running gateways
 */
export async function getRunningGateways(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const runningIds = opcuaGatewayManager.getRunningGateways();
    const gateways = await OpcuaGateway.find({
      _id: { $in: runningIds },
    }).lean();

    const gatewaysWithStatus = gateways.map((gateway) => {
      const status = opcuaGatewayManager.getGatewayStatus(gateway._id.toString());
      return {
        ...gateway,
        runtime: status || { isRunning: false, isConnected: false },
      };
    });

    return reply.send({
      success: true,
      data: gatewaysWithStatus,
      count: gatewaysWithStatus.length,
    });
  } catch (error: any) {
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * GET /opcua-gateways/:id
 * Get OPC UA gateway by ID
 */
export async function getOpcuaGateway(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const gateway = await OpcuaGateway.findById(request.params.id).lean();

    if (!gateway) {
      return reply.code(404).send({
        success: false,
        error: 'Gateway not found',
      });
    }

    // Add runtime status
    const status = opcuaGatewayManager.getGatewayStatus(request.params.id);

    return reply.send({
      success: true,
      data: {
        ...gateway,
        runtime: status || { isRunning: false, isConnected: false },
      },
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * PATCH /opcua-gateways/:id
 * Update OPC UA gateway
 */
export async function updateOpcuaGateway(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
    Body: Partial<{
      name: string;
      description: string;
      endpointUrl: string;
      securityMode: string;
      securityPolicy: string;
      username: string;
      password: string;
      certificatePath: string;
      privateKeyPath: string;
      connectionStrategy: any;
      requestedSessionTimeout: number;
      keepSessionAlive: boolean;
      monitoringMode: string;
      pollingInterval: number;
      subscriptionSettings: any;
      nodeMappings: any[];
      isActive: boolean;
      tags: string[];
    }>;
  }>,
  reply: FastifyReply
) {
  try {
    const gateway = await OpcuaGateway.findByIdAndUpdate(
      request.params.id,
      { $set: request.body },
      { new: true, runValidators: true }
    );

    if (!gateway) {
      return reply.code(404).send({
        success: false,
        error: 'Gateway not found',
      });
    }

    // Restart if running and critical settings changed
    const status = opcuaGatewayManager.getGatewayStatus(request.params.id);
    if (status?.isRunning) {
      const criticalFields = ['endpointUrl', 'securityMode', 'securityPolicy', 'monitoringMode', 'nodeMappings'];
      const hasCriticalChanges = criticalFields.some((field) => field in request.body);

      if (hasCriticalChanges) {
        await opcuaGatewayManager.restartGateway(request.params.id);
      }
    }

    return reply.send({
      success: true,
      data: gateway,
      message: 'OPC UA gateway updated successfully',
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(400).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * DELETE /opcua-gateways/:id
 * Delete OPC UA gateway
 */
export async function deleteOpcuaGateway(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    // Stop gateway if running
    const status = opcuaGatewayManager.getGatewayStatus(request.params.id);
    if (status?.isRunning) {
      await opcuaGatewayManager.stopGateway(request.params.id);
    }

    const gateway = await OpcuaGateway.findByIdAndDelete(request.params.id);

    if (!gateway) {
      return reply.code(404).send({
        success: false,
        error: 'Gateway not found',
      });
    }

    return reply.send({
      success: true,
      message: 'OPC UA gateway deleted successfully',
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
}

// ============================================================================
// Gateway Control
// ============================================================================

/**
 * POST /opcua-gateways/:id/start
 * Start OPC UA gateway
 */
export async function startOpcuaGateway(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    await opcuaGatewayManager.startGateway(request.params.id);

    return reply.send({
      success: true,
      message: 'OPC UA gateway started successfully',
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(400).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * POST /opcua-gateways/:id/stop
 * Stop OPC UA gateway
 */
export async function stopOpcuaGateway(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    await opcuaGatewayManager.stopGateway(request.params.id);

    return reply.send({
      success: true,
      message: 'OPC UA gateway stopped successfully',
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(400).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * POST /opcua-gateways/:id/restart
 * Restart OPC UA gateway
 */
export async function restartOpcuaGateway(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    await opcuaGatewayManager.restartGateway(request.params.id);

    return reply.send({
      success: true,
      message: 'OPC UA gateway restarted successfully',
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(400).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * POST /opcua-gateways/:id/test
 * Test OPC UA connection
 */
export async function testConnection(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const result = await opcuaGatewayManager.testConnection(request.params.id);

    return reply.send({
      success: result.success,
      message: result.message,
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * GET /opcua-gateways/:id/status
 * Get gateway runtime status
 */
export async function getStatus(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const status = opcuaGatewayManager.getGatewayStatus(request.params.id);

    return reply.send({
      success: true,
      data: status || { isRunning: false, isConnected: false },
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
}

/**
 * POST /opcua-gateways/:id/browse
 * Browse OPC UA server nodes
 */
export async function browseNodes(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
    Body: {
      nodeId?: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const nodeId = request.body.nodeId || 'RootFolder';
    const nodes = await opcuaGatewayManager.browseNodes(request.params.id, nodeId);

    return reply.send({
      success: true,
      data: {
        nodeId,
        nodes,
      },
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
}

// ============================================================================
// Gateway Statistics
// ============================================================================

/**
 * GET /opcua-gateways/:id/statistics
 * Get OPC UA gateway statistics
 */
export async function getOpcuaGatewayStatistics(
  request: FastifyRequest<{
    Params: {
      id: string;
    };
  }>,
  reply: FastifyReply
) {
  try {
    const gateway = await OpcuaGateway.findById(request.params.id).lean();

    if (!gateway) {
      return reply.code(404).send({
        success: false,
        error: 'Gateway not found',
      });
    }

    const status = opcuaGatewayManager.getGatewayStatus(request.params.id);
    const successRate = gateway.totalReads > 0
      ? (gateway.successfulReads / gateway.totalReads) * 100
      : 0;

    return reply.send({
      success: true,
      data: {
        gatewayId: gateway._id,
        name: gateway.name,
        deviceId: gateway.deviceId,
        monitoringMode: gateway.monitoringMode,
        isActive: gateway.isActive,
        isConnected: gateway.isConnected,
        runtime: status || { isRunning: false, isConnected: false },
        statistics: {
          totalReads: gateway.totalReads,
          successfulReads: gateway.successfulReads,
          failedReads: gateway.failedReads,
          successRate: Math.round(successRate * 100) / 100,
          averageResponseTime: gateway.averageResponseTime
            ? Math.round(gateway.averageResponseTime * 100) / 100
            : null,
          consecutiveFailures: gateway.consecutiveFailures,
        },
        timestamps: {
          lastPoll: gateway.lastPollTimestamp,
          lastSuccess: gateway.lastSuccessTimestamp,
          lastError: gateway.lastErrorTimestamp,
        },
        lastError: gateway.lastError,
      },
    });
  } catch (error: any) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  }
}
