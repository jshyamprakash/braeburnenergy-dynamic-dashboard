import type { FastifyRequest, FastifyReply } from 'fastify';
import { deviceService } from '../services/device.service';
import { NotFoundError, BadRequestError } from '../lib/errors';
import { sendSuccess, sendCreated, sendPaginated, sendDeleted } from '../lib/response';
import { getRequestContext } from '../lib/request-context';
import type {
  CreateDeviceDTO,
  UpdateDeviceDTO,
  QueryDevicesDTO,
  DeviceIdParam,
} from '../schemas/device.schema';

/**
 * DeviceController
 *
 * HTTP request handlers for device management.
 * Zero try/catch — errors propagate to global error handler.
 */
export class DeviceController {
  /**
   * POST /devices
   */
  async create(
    request: FastifyRequest<{ Body: CreateDeviceDTO }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const device = await deviceService.create(orgId, request.body);
    return sendCreated(reply, device);
  }

  /**
   * GET /devices/:deviceId
   */
  async getOne(
    request: FastifyRequest<{ Params: DeviceIdParam; Querystring: { includeStates?: string } }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { deviceId } = request.params;
    const includeStates = request.query.includeStates === 'true';
    const device = await deviceService.getByDeviceId(orgId, deviceId, includeStates);

    if (!device) {
      throw new NotFoundError('Device');
    }

    return sendSuccess(reply, device);
  }

  /**
   * GET /devices
   */
  async list(
    request: FastifyRequest<{ Querystring: QueryDevicesDTO }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const result = await deviceService.list(orgId, request.query);
    return sendPaginated(reply, result.data, result.pagination);
  }

  /**
   * PATCH /devices/:deviceId
   */
  async update(
    request: FastifyRequest<{ Params: DeviceIdParam; Body: UpdateDeviceDTO }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { deviceId } = request.params;
    const device = await deviceService.update(orgId, deviceId, request.body);

    if (!device) {
      throw new NotFoundError('Device');
    }

    return sendSuccess(reply, device);
  }

  /**
   * DELETE /devices/:deviceId
   */
  async delete(
    request: FastifyRequest<{ Params: DeviceIdParam }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { deviceId } = request.params;
    const device = await deviceService.delete(orgId, deviceId);

    if (!device) {
      throw new NotFoundError('Device');
    }

    return sendDeleted(reply, 'Device deleted successfully');
  }

  /**
   * GET /devices/search/tags
   */
  async searchByTags(
    request: FastifyRequest<{ Querystring: { tags: string; applicationId?: string; limit?: string } }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { tags, applicationId, limit } = request.query;

    if (!tags) {
      throw new BadRequestError('Tags query parameter is required');
    }
    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }

    const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const devices = await deviceService.searchByTags(orgId, applicationId, tagArray, limitNum);

    return sendSuccess(reply, devices);
  }

  /**
   * GET /devices/stats/count
   */
  async count(
    request: FastifyRequest<{ Querystring: { applicationId?: string; tags?: string } }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { applicationId, tags } = request.query;
    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }
    const tagArray = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
    const count = await deviceService.count(orgId, applicationId, tagArray);
    return sendSuccess(reply, { count });
  }

  /**
   * GET /devices/recent
   */
  async getRecent(
    request: FastifyRequest<{ Querystring: { applicationId?: string; limit?: string } }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { applicationId } = request.query;
    if (!applicationId) {
      throw new BadRequestError('applicationId is required');
    }
    const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
    const devices = await deviceService.getRecent(orgId, applicationId, limit);
    return sendSuccess(reply, devices);
  }
}

export const deviceController = new DeviceController();
