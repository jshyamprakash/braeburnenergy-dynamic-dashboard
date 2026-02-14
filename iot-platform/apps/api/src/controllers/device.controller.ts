import type { FastifyRequest, FastifyReply } from 'fastify';
import { deviceService } from '../services/device.service';
import {
  createDeviceSchema,
  updateDeviceSchema,
  queryDevicesSchema,
  deviceIdParamSchema,
  type CreateDeviceDTO,
  type UpdateDeviceDTO,
  type QueryDevicesDTO,
  type DeviceIdParam,
} from '../schemas/device.schema';

/**
 * Default organization ID for POC
 * TODO: Replace with orgId from JWT token or request header in MVP
 */
const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

/**
 * DeviceController
 *
 * HTTP request handlers for device management
 * Handles validation, service calls, and response formatting
 */
export class DeviceController {
  /**
   * POST /devices
   * Create a new device
   */
  async create(
    request: FastifyRequest<{ Body: CreateDeviceDTO }>,
    reply: FastifyReply
  ) {
    try {
      // Validate request body
      const validatedData = createDeviceSchema.parse(request.body);

      // Create device (using default org for now)
      const device = await deviceService.create(DEFAULT_ORG_ID, validatedData);

      // Return 201 Created
      return reply.code(201).send({
        success: true,
        data: device,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: error,
        });
      }

      request.log.error(error, 'Error creating device');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /devices/:deviceId
   * Get device by ULID
   */
  async getOne(
    request: FastifyRequest<{ Params: DeviceIdParam; Querystring: { includeStates?: string } }>,
    reply: FastifyReply
  ) {
    try {
      // Validate params
      const { deviceId } = deviceIdParamSchema.parse(request.params);
      const includeStates = request.query.includeStates === 'true';

      // Get device (using default org for now)
      const device = await deviceService.getByDeviceId(DEFAULT_ORG_ID, deviceId, includeStates);

      if (!device) {
        return reply.code(404).send({
          success: false,
          error: 'Device not found',
        });
      }

      return reply.code(200).send({
        success: true,
        data: device,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid device ID',
          details: error,
        });
      }

      request.log.error(error, 'Error fetching device');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /devices
   * List devices with filtering and pagination
   */
  async list(
    request: FastifyRequest<{ Querystring: QueryDevicesDTO }>,
    reply: FastifyReply
  ) {
    try {
      // Validate query params
      const validatedQuery = queryDevicesSchema.parse(request.query);

      // Get devices (using default org for now)
      const result = await deviceService.list(DEFAULT_ORG_ID, validatedQuery);

      return reply.code(200).send({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid query parameters',
          details: error,
        });
      }

      request.log.error(error, 'Error listing devices');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * PATCH /devices/:deviceId
   * Update device
   */
  async update(
    request: FastifyRequest<{ Params: DeviceIdParam; Body: UpdateDeviceDTO }>,
    reply: FastifyReply
  ) {
    try {
      // Validate params and body
      const { deviceId } = deviceIdParamSchema.parse(request.params);
      const validatedData = updateDeviceSchema.parse(request.body);

      // Update device (using default org for now)
      const device = await deviceService.update(DEFAULT_ORG_ID, deviceId, validatedData);

      if (!device) {
        return reply.code(404).send({
          success: false,
          error: 'Device not found',
        });
      }

      return reply.code(200).send({
        success: true,
        data: device,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: error,
        });
      }

      request.log.error(error, 'Error updating device');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * DELETE /devices/:deviceId
   * Delete device
   */
  async delete(
    request: FastifyRequest<{ Params: DeviceIdParam }>,
    reply: FastifyReply
  ) {
    try {
      // Validate params
      const { deviceId } = deviceIdParamSchema.parse(request.params);

      // Delete device (using default org for now)
      const device = await deviceService.delete(DEFAULT_ORG_ID, deviceId);

      if (!device) {
        return reply.code(404).send({
          success: false,
          error: 'Device not found',
        });
      }

      return reply.code(200).send({
        success: true,
        message: 'Device deleted successfully',
        data: device,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid device ID',
          details: error,
        });
      }

      request.log.error(error, 'Error deleting device');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /devices/search/tags
   * Search devices by tags (has ANY of the specified tags)
   */
  async searchByTags(
    request: FastifyRequest<{ Querystring: { tags: string; limit?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { tags, limit } = request.query;

      if (!tags) {
        return reply.code(400).send({
          success: false,
          error: 'Tags query parameter is required',
        });
      }

      const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const limitNum = limit ? parseInt(limit, 10) : 100;

      const devices = await deviceService.searchByTags(DEFAULT_ORG_ID, tagArray, limitNum);

      return reply.code(200).send({
        success: true,
        data: devices,
      });
    } catch (error) {
      request.log.error(error, 'Error searching devices by tags');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /devices/stats/count
   * Get device count
   */
  async count(
    request: FastifyRequest<{ Querystring: { tags?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { tags } = request.query;
      const tagArray = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;

      const count = await deviceService.count(DEFAULT_ORG_ID, tagArray);

      return reply.code(200).send({
        success: true,
        data: { count },
      });
    } catch (error) {
      request.log.error(error, 'Error counting devices');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /devices/recent
   * Get recently created devices (uses ULID time-sorting)
   */
  async getRecent(
    request: FastifyRequest<{ Querystring: { limit?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;

      const devices = await deviceService.getRecent(DEFAULT_ORG_ID, limit);

      return reply.code(200).send({
        success: true,
        data: devices,
      });
    } catch (error) {
      request.log.error(error, 'Error fetching recent devices');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

// Export singleton instance
export const deviceController = new DeviceController();
