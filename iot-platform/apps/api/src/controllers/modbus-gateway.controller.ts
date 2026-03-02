import type { FastifyRequest, FastifyReply } from 'fastify';
import { ModbusGateway } from '../models/modbus-gateway.model';
import { modbusGatewayManager } from '../services/modbus-gateway-manager.service';
import mongoose from 'mongoose';
import { NotFoundError } from '../lib/errors';
import { sendSuccess, sendCreated, sendDeleted } from '../lib/response';
import { getRequestContext } from '../lib/request-context';

/**
 * ModbusGatewayController
 *
 * Industrial protocol gateway for Modbus TCP/RTU devices.
 * Zero try/catch — errors propagate to global error handler.
 */
export class ModbusGatewayController {
  async createGateway(request: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    const { orgId } = getRequestContext(request);
    const gateway = await ModbusGateway.create({
      orgId: new mongoose.Types.ObjectId(orgId),
      ...(request.body as Record<string, any>),
    });
    return sendCreated(reply, gateway.toObject());
  }

  async listGateways(
    request: FastifyRequest<{ Querystring: { page?: string; limit?: string; protocol?: string; status?: string } }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const page = parseInt(request.query.page || '1');
    const limit = parseInt(request.query.limit || '10');
    const skip = (page - 1) * limit;

    const filter: any = { orgId: new mongoose.Types.ObjectId(orgId) };
    if (request.query.protocol) filter.protocol = request.query.protocol;
    if (request.query.status) filter.status = request.query.status;

    const [gateways, total] = await Promise.all([
      ModbusGateway.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ModbusGateway.countDocuments(filter),
    ]);

    return reply.send({
      success: true,
      data: gateways,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }

  async getGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const gateway = await ModbusGateway.findById(request.params.id);
    if (!gateway) {
      throw new NotFoundError('Gateway');
    }

    const status = modbusGatewayManager.getGatewayStatus(gateway._id.toString());
    return sendSuccess(reply, { ...gateway.toObject(), runtime: status });
  }

  async updateGateway(request: FastifyRequest<{ Params: { id: string }; Body: any }>, reply: FastifyReply) {
    const gateway = await ModbusGateway.findByIdAndUpdate(
      request.params.id, request.body as Record<string, any>, { new: true, runValidators: true }
    );

    if (!gateway) {
      throw new NotFoundError('Gateway');
    }

    const status = modbusGatewayManager.getGatewayStatus(gateway._id.toString());
    if (status.running) {
      await modbusGatewayManager.stopGateway(gateway._id.toString());
      await modbusGatewayManager.startGateway(gateway._id.toString());
    }

    return sendSuccess(reply, (gateway as any).toObject());
  }

  async deleteGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const status = modbusGatewayManager.getGatewayStatus(request.params.id);
    if (status.running) {
      await modbusGatewayManager.stopGateway(request.params.id);
    }

    const gateway = await ModbusGateway.findByIdAndDelete(request.params.id);
    if (!gateway) {
      throw new NotFoundError('Gateway');
    }

    return sendDeleted(reply, 'Gateway deleted');
  }

  async startGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await modbusGatewayManager.startGateway(request.params.id);
    return sendSuccess(reply, { message: 'Gateway started' });
  }

  async stopGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await modbusGatewayManager.stopGateway(request.params.id);
    return sendSuccess(reply, { message: 'Gateway stopped' });
  }

  async testConnection(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const result = await modbusGatewayManager.testConnection(request.params.id);
    return sendSuccess(reply, { message: result.message });
  }

  async getStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const status = modbusGatewayManager.getGatewayStatus(request.params.id);
    return sendSuccess(reply, status);
  }

  async readRegister(
    request: FastifyRequest<{ Params: { id: string }; Body: { registerName: string } }>,
    reply: FastifyReply
  ) {
    const value = await modbusGatewayManager.readRegister(request.params.id, request.body.registerName);
    return sendSuccess(reply, { registerName: request.body.registerName, value, timestamp: new Date() });
  }
}

export const modbusGatewayController = new ModbusGatewayController();

// Legacy named function exports
export const createGateway = (req: FastifyRequest<any>, reply: FastifyReply) => modbusGatewayController.createGateway(req, reply);
export const listGateways = (req: FastifyRequest<any>, reply: FastifyReply) => modbusGatewayController.listGateways(req, reply);
export const getGateway = (req: FastifyRequest<any>, reply: FastifyReply) => modbusGatewayController.getGateway(req, reply);
export const updateGateway = (req: FastifyRequest<any>, reply: FastifyReply) => modbusGatewayController.updateGateway(req, reply);
export const deleteGateway = (req: FastifyRequest<any>, reply: FastifyReply) => modbusGatewayController.deleteGateway(req, reply);
export const startGateway = (req: FastifyRequest<any>, reply: FastifyReply) => modbusGatewayController.startGateway(req, reply);
export const stopGateway = (req: FastifyRequest<any>, reply: FastifyReply) => modbusGatewayController.stopGateway(req, reply);
export const testConnection = (req: FastifyRequest<any>, reply: FastifyReply) => modbusGatewayController.testConnection(req, reply);
export const getStatus = (req: FastifyRequest<any>, reply: FastifyReply) => modbusGatewayController.getStatus(req, reply);
export const readRegister = (req: FastifyRequest<any>, reply: FastifyReply) => modbusGatewayController.readRegister(req, reply);
