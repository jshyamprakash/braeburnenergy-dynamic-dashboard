import type { FastifyRequest, FastifyReply } from 'fastify';
import { OpcuaGateway } from '../models';
import { opcuaGatewayManager } from '../services/opcua-gateway-manager.service';
import { NotFoundError } from '../lib/errors';
import { sendSuccess, sendCreated, sendDeleted } from '../lib/response';

/**
 * OpcuaGatewayController
 *
 * OPC UA protocol gateway for industrial device monitoring.
 * Zero try/catch — errors propagate to global error handler.
 */
export class OpcuaGatewayController {
  async createGateway(request: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    const gateway = new OpcuaGateway(request.body);
    await gateway.save();
    return sendCreated(reply, gateway.toObject());
  }

  async listGateways(
    request: FastifyRequest<{
      Querystring: { deviceId?: string; isActive?: string; isConnected?: string; monitoringMode?: string; page?: string; limit?: string };
    }>,
    reply: FastifyReply
  ) {
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
      OpcuaGateway.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      OpcuaGateway.countDocuments(filter),
    ]);

    const gatewaysWithStatus = gateways.map((gateway) => ({
      ...gateway,
      runtime: opcuaGatewayManager.getGatewayStatus(gateway._id.toString()) || { isRunning: false, isConnected: false },
    }));

    return reply.send({
      success: true,
      data: gatewaysWithStatus,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  }

  async getRunningGateways(_request: FastifyRequest, reply: FastifyReply) {
    const runningIds = opcuaGatewayManager.getRunningGateways();
    const gateways = await OpcuaGateway.find({ _id: { $in: runningIds } }).lean();

    const gatewaysWithStatus = gateways.map((gateway) => ({
      ...gateway,
      runtime: opcuaGatewayManager.getGatewayStatus(gateway._id.toString()) || { isRunning: false, isConnected: false },
    }));

    return sendSuccess(reply, gatewaysWithStatus);
  }

  async getGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const gateway = await OpcuaGateway.findById(request.params.id).lean();

    if (!gateway) {
      throw new NotFoundError('Gateway');
    }

    const status = opcuaGatewayManager.getGatewayStatus(request.params.id);
    return sendSuccess(reply, { ...gateway, runtime: status || { isRunning: false, isConnected: false } });
  }

  async updateGateway(request: FastifyRequest<{ Params: { id: string }; Body: any }>, reply: FastifyReply) {
    const gateway = await OpcuaGateway.findByIdAndUpdate(
      request.params.id,
      { $set: request.body as Record<string, any> },
      { new: true, runValidators: true }
    );

    if (!gateway) {
      throw new NotFoundError('Gateway');
    }

    const status = opcuaGatewayManager.getGatewayStatus(request.params.id);
    if (status?.isRunning) {
      const criticalFields = ['endpointUrl', 'securityMode', 'securityPolicy', 'monitoringMode', 'nodeMappings'];
      if (criticalFields.some((field) => field in (request.body as Record<string, any>))) {
        await opcuaGatewayManager.restartGateway(request.params.id);
      }
    }

    return sendSuccess(reply, (gateway as any).toObject());
  }

  async deleteGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const status = opcuaGatewayManager.getGatewayStatus(request.params.id);
    if (status?.isRunning) {
      await opcuaGatewayManager.stopGateway(request.params.id);
    }

    const gateway = await OpcuaGateway.findByIdAndDelete(request.params.id);
    if (!gateway) {
      throw new NotFoundError('Gateway');
    }

    return sendDeleted(reply, 'OPC UA gateway deleted successfully');
  }

  async startGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await opcuaGatewayManager.startGateway(request.params.id);
    return sendSuccess(reply, { message: 'OPC UA gateway started successfully' });
  }

  async stopGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await opcuaGatewayManager.stopGateway(request.params.id);
    return sendSuccess(reply, { message: 'OPC UA gateway stopped successfully' });
  }

  async restartGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await opcuaGatewayManager.restartGateway(request.params.id);
    return sendSuccess(reply, { message: 'OPC UA gateway restarted successfully' });
  }

  async testConnection(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const result = await opcuaGatewayManager.testConnection(request.params.id);
    return sendSuccess(reply, { message: result.message });
  }

  async getStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const status = opcuaGatewayManager.getGatewayStatus(request.params.id);
    return sendSuccess(reply, status || { isRunning: false, isConnected: false });
  }

  async browseNodes(request: FastifyRequest<{ Params: { id: string }; Body: { nodeId?: string } }>, reply: FastifyReply) {
    const nodeId = request.body?.nodeId || 'RootFolder';
    const nodes = await opcuaGatewayManager.browseNodes(request.params.id, nodeId);
    return sendSuccess(reply, { nodeId, nodes });
  }

  async getStatistics(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const gateway = await OpcuaGateway.findById(request.params.id).lean();

    if (!gateway) {
      throw new NotFoundError('Gateway');
    }

    const status = opcuaGatewayManager.getGatewayStatus(request.params.id);
    const successRate = gateway.totalReads > 0
      ? Math.round((gateway.successfulReads / gateway.totalReads) * 10000) / 100
      : 0;

    return sendSuccess(reply, {
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
        successRate,
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
    });
  }
}

export const opcuaGatewayController = new OpcuaGatewayController();

// Legacy named function exports
export const createOpcuaGateway = (req: FastifyRequest<any>, reply: FastifyReply) => opcuaGatewayController.createGateway(req, reply);
export const listOpcuaGateways = (req: FastifyRequest<any>, reply: FastifyReply) => opcuaGatewayController.listGateways(req, reply);
export const getRunningGateways = (req: FastifyRequest, reply: FastifyReply) => opcuaGatewayController.getRunningGateways(req, reply);
export const getOpcuaGateway = (req: FastifyRequest<any>, reply: FastifyReply) => opcuaGatewayController.getGateway(req, reply);
export const updateOpcuaGateway = (req: FastifyRequest<any>, reply: FastifyReply) => opcuaGatewayController.updateGateway(req, reply);
export const deleteOpcuaGateway = (req: FastifyRequest<any>, reply: FastifyReply) => opcuaGatewayController.deleteGateway(req, reply);
export const startOpcuaGateway = (req: FastifyRequest<any>, reply: FastifyReply) => opcuaGatewayController.startGateway(req, reply);
export const stopOpcuaGateway = (req: FastifyRequest<any>, reply: FastifyReply) => opcuaGatewayController.stopGateway(req, reply);
export const restartOpcuaGateway = (req: FastifyRequest<any>, reply: FastifyReply) => opcuaGatewayController.restartGateway(req, reply);
export const testConnection = (req: FastifyRequest<any>, reply: FastifyReply) => opcuaGatewayController.testConnection(req, reply);
export const getStatus = (req: FastifyRequest<any>, reply: FastifyReply) => opcuaGatewayController.getStatus(req, reply);
export const browseNodes = (req: FastifyRequest<any>, reply: FastifyReply) => opcuaGatewayController.browseNodes(req, reply);
export const getOpcuaGatewayStatistics = (req: FastifyRequest<any>, reply: FastifyReply) => opcuaGatewayController.getStatistics(req, reply);
