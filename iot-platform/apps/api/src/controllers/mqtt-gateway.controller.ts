import type { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { MqttGateway } from '../models/mqtt-gateway.model';
import { mqttGatewayManager } from '../services/mqtt-gateway-manager.service';
import { NotFoundError } from '../lib/errors';
import { sendSuccess, sendCreated, sendDeleted } from '../lib/response';
import { getRequestContext } from '../lib/request-context';

/**
 * MqttGatewayController
 *
 * CRUD + lifecycle handlers for MQTT broker gateways.
 * Zero try/catch — errors propagate to global error handler.
 */
export class MqttGatewayController {
  async createGateway(request: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    const { orgId } = getRequestContext(request);
    const gateway = await MqttGateway.create({
      orgId: new mongoose.Types.ObjectId(orgId),
      ...(request.body as Record<string, any>),
    });
    return sendCreated(reply, gateway.toObject());
  }

  async listGateways(
    request: FastifyRequest<{ Querystring: { page?: string; limit?: string; status?: string; applicationId?: string } }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const page = parseInt(request.query.page || '1');
    const limit = parseInt(request.query.limit || '10');
    const skip = (page - 1) * limit;

    const filter: any = { orgId: new mongoose.Types.ObjectId(orgId) };
    if (request.query.status) filter.status = request.query.status;
    if (request.query.applicationId) filter.applicationId = request.query.applicationId;

    const [gateways, total] = await Promise.all([
      MqttGateway.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MqttGateway.countDocuments(filter),
    ]);

    return reply.send({
      success: true,
      data: gateways,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }

  async getGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const gateway = await MqttGateway.findById(request.params.id);
    if (!gateway) throw new NotFoundError('MQTT Gateway');

    const status = mqttGatewayManager.getGatewayStatus(gateway._id.toString());
    return sendSuccess(reply, { ...gateway.toObject(), runtime: status });
  }

  async updateGateway(
    request: FastifyRequest<{ Params: { id: string }; Body: any }>,
    reply: FastifyReply
  ) {
    const gateway = await MqttGateway.findByIdAndUpdate(
      request.params.id,
      request.body as Record<string, any>,
      { new: true, runValidators: true }
    );
    if (!gateway) throw new NotFoundError('MQTT Gateway');

    // Restart if currently running so new config takes effect
    const status = mqttGatewayManager.getGatewayStatus(gateway._id.toString());
    if (status.running) {
      await mqttGatewayManager.stopGateway(gateway._id.toString());
      await mqttGatewayManager.startGateway(gateway._id.toString());
    }

    return sendSuccess(reply, gateway.toObject());
  }

  async deleteGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const status = mqttGatewayManager.getGatewayStatus(request.params.id);
    if (status.running) {
      await mqttGatewayManager.stopGateway(request.params.id);
    }

    const gateway = await MqttGateway.findByIdAndDelete(request.params.id);
    if (!gateway) throw new NotFoundError('MQTT Gateway');

    return sendDeleted(reply, 'MQTT Gateway deleted');
  }

  async startGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await mqttGatewayManager.startGateway(request.params.id);
    return sendSuccess(reply, { message: 'MQTT Gateway started' });
  }

  async stopGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await mqttGatewayManager.stopGateway(request.params.id);
    return sendSuccess(reply, { message: 'MQTT Gateway stopped' });
  }

  async testConnection(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const result = await mqttGatewayManager.testConnection(request.params.id);
    return sendSuccess(reply, { success: result.success, message: result.message });
  }

  async getStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const status = mqttGatewayManager.getGatewayStatus(request.params.id);
    return sendSuccess(reply, status);
  }
}

export const mqttGatewayController = new MqttGatewayController();

// Named function exports (consistent with Modbus pattern)
export const createGateway  = (req: FastifyRequest<any>, reply: FastifyReply) => mqttGatewayController.createGateway(req, reply);
export const listGateways   = (req: FastifyRequest<any>, reply: FastifyReply) => mqttGatewayController.listGateways(req, reply);
export const getGateway     = (req: FastifyRequest<any>, reply: FastifyReply) => mqttGatewayController.getGateway(req, reply);
export const updateGateway  = (req: FastifyRequest<any>, reply: FastifyReply) => mqttGatewayController.updateGateway(req, reply);
export const deleteGateway  = (req: FastifyRequest<any>, reply: FastifyReply) => mqttGatewayController.deleteGateway(req, reply);
export const startGateway   = (req: FastifyRequest<any>, reply: FastifyReply) => mqttGatewayController.startGateway(req, reply);
export const stopGateway    = (req: FastifyRequest<any>, reply: FastifyReply) => mqttGatewayController.stopGateway(req, reply);
export const testConnection = (req: FastifyRequest<any>, reply: FastifyReply) => mqttGatewayController.testConnection(req, reply);
export const getStatus      = (req: FastifyRequest<any>, reply: FastifyReply) => mqttGatewayController.getStatus(req, reply);
