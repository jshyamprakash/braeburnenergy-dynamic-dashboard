import type { FastifyRequest, FastifyReply } from 'fastify';
import { BacnetGateway } from '../models/bacnet-gateway.model';
import { bacnetGatewayManager } from '../services/bacnet-gateway-manager.service';
import mongoose from 'mongoose';
import { NotFoundError } from '../lib/errors';
import { sendSuccess, sendCreated, sendDeleted } from '../lib/response';
import { getRequestContext } from '../lib/request-context';

export class BacnetGatewayController {
  async createGateway(request: FastifyRequest<{ Body: any }>, reply: FastifyReply) {
    const { orgId } = getRequestContext(request);
    const gateway = await BacnetGateway.create({
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
      BacnetGateway.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      BacnetGateway.countDocuments(filter),
    ]);

    return reply.send({
      success: true,
      data: gateways,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }

  async getGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const gateway = await BacnetGateway.findById(request.params.id);
    if (!gateway) throw new NotFoundError('BACnet Gateway');
    const status = bacnetGatewayManager.getGatewayStatus(gateway._id.toString());
    return sendSuccess(reply, { ...gateway.toObject(), runtime: status });
  }

  async updateGateway(request: FastifyRequest<{ Params: { id: string }; Body: any }>, reply: FastifyReply) {
    const gateway = await BacnetGateway.findByIdAndUpdate(
      request.params.id, request.body as Record<string, any>, { new: true, runValidators: true }
    );
    if (!gateway) throw new NotFoundError('BACnet Gateway');

    const status = bacnetGatewayManager.getGatewayStatus(gateway._id.toString());
    if (status.running) {
      await bacnetGatewayManager.stopGateway(gateway._id.toString());
      await bacnetGatewayManager.startGateway(gateway._id.toString());
    }

    return sendSuccess(reply, (gateway as any).toObject());
  }

  async deleteGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const status = bacnetGatewayManager.getGatewayStatus(request.params.id);
    if (status.running) {
      await bacnetGatewayManager.stopGateway(request.params.id);
    }

    const gateway = await BacnetGateway.findByIdAndDelete(request.params.id);
    if (!gateway) throw new NotFoundError('BACnet Gateway');

    return sendDeleted(reply, 'BACnet Gateway deleted');
  }

  async startGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await bacnetGatewayManager.startGateway(request.params.id);
    return sendSuccess(reply, { message: 'Gateway started' });
  }

  async stopGateway(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    await bacnetGatewayManager.stopGateway(request.params.id);
    return sendSuccess(reply, { message: 'Gateway stopped' });
  }

  async testConnection(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const result = await bacnetGatewayManager.testConnection(request.params.id);
    return sendSuccess(reply, { message: result.message });
  }

  async getStatus(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const status = bacnetGatewayManager.getGatewayStatus(request.params.id);
    return sendSuccess(reply, status);
  }

  async readObject(
    request: FastifyRequest<{ Params: { id: string }; Body: { fieldName: string } }>,
    reply: FastifyReply
  ) {
    const value = await bacnetGatewayManager.readObject(request.params.id, request.body.fieldName);
    return sendSuccess(reply, { fieldName: request.body.fieldName, value, timestamp: new Date() });
  }
}

export const bacnetGatewayController = new BacnetGatewayController();

export const createGateway = (req: FastifyRequest<any>, reply: FastifyReply) => bacnetGatewayController.createGateway(req, reply);
export const listGateways = (req: FastifyRequest<any>, reply: FastifyReply) => bacnetGatewayController.listGateways(req, reply);
export const getGateway = (req: FastifyRequest<any>, reply: FastifyReply) => bacnetGatewayController.getGateway(req, reply);
export const updateGateway = (req: FastifyRequest<any>, reply: FastifyReply) => bacnetGatewayController.updateGateway(req, reply);
export const deleteGateway = (req: FastifyRequest<any>, reply: FastifyReply) => bacnetGatewayController.deleteGateway(req, reply);
export const startGateway = (req: FastifyRequest<any>, reply: FastifyReply) => bacnetGatewayController.startGateway(req, reply);
export const stopGateway = (req: FastifyRequest<any>, reply: FastifyReply) => bacnetGatewayController.stopGateway(req, reply);
export const testConnection = (req: FastifyRequest<any>, reply: FastifyReply) => bacnetGatewayController.testConnection(req, reply);
export const getStatus = (req: FastifyRequest<any>, reply: FastifyReply) => bacnetGatewayController.getStatus(req, reply);
export const readObject = (req: FastifyRequest<any>, reply: FastifyReply) => bacnetGatewayController.readObject(req, reply);
