import type { FastifyInstance } from 'fastify';
import { deviceController } from '../controllers/device.controller';
import {
  createDeviceSchema,
  updateDeviceSchema,
  queryDevicesSchema,
  deviceIdParamSchema,
} from '../schemas/device.schema';
import { zodToSwagger, successResponse, paginatedResponse, errorResponse } from '../utils/swagger';

/**
 * Device Routes
 *
 * Registers all device-related HTTP endpoints with OpenAPI documentation
 */
export async function deviceRoutes(fastify: FastifyInstance) {
  // Create device
  fastify.post('/devices', {
    schema: {
      tags: ['Devices'],
      summary: 'Create a new device',
      description: 'Creates a new IoT device with auto-generated ULID identifier. ULIDs are 26 characters, time-sortable, and globally unique.',
      body: zodToSwagger(createDeviceSchema),
      response: {
        201: successResponse(
          {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              deviceId: { type: 'string', example: '01KGPQZ53TRMAG5Y1H2S2SHPVG' },
              name: { type: 'string', example: 'Temperature Sensor - Zone A' },
              tags: { type: 'array', items: { type: 'string' }, example: ['warehouse', 'floor-1'] },
              attributes: { type: 'object', additionalProperties: true, example: { location: 'Zone A' } },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          'Device created successfully'
        ),
        400: errorResponse('Validation error'),
      },
    },
  }, deviceController.create.bind(deviceController));

  // Get device by ID
  fastify.get('/devices/:deviceId', {
    schema: {
      tags: ['Devices'],
      summary: 'Get device by ULID',
      description: 'Retrieves a single device by its ULID identifier',
      params: zodToSwagger(deviceIdParamSchema),
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              deviceId: { type: 'string', example: '01KGPQZ53TRMAG5Y1H2S2SHPVG' },
              name: { type: 'string', example: 'Temperature Sensor - Zone A' },
              tags: { type: 'array', items: { type: 'string' } },
              attributes: { type: 'object', nullable: true, additionalProperties: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          'Device retrieved successfully'
        ),
        404: errorResponse('Device not found'),
      },
    },
  }, deviceController.getOne.bind(deviceController));

  // List devices
  fastify.get('/devices', {
    schema: {
      tags: ['Devices'],
      summary: 'List devices',
      description: 'Lists devices with pagination, filtering by tags, and search capabilities. Supports sorting by multiple fields.',
      querystring: zodToSwagger(queryDevicesSchema),
      response: {
        200: paginatedResponse(
          {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              deviceId: { type: 'string' },
              name: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              attributes: { type: 'object', nullable: true, additionalProperties: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          'Devices retrieved successfully'
        ),
      },
    },
  }, deviceController.list.bind(deviceController));

  // Update device
  fastify.patch('/devices/:deviceId', {
    schema: {
      tags: ['Devices'],
      summary: 'Update device',
      description: 'Updates an existing device. All fields are optional (partial update).',
      params: zodToSwagger(deviceIdParamSchema),
      body: zodToSwagger(updateDeviceSchema),
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              deviceId: { type: 'string' },
              name: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              attributes: { type: 'object', nullable: true, additionalProperties: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          'Device updated successfully'
        ),
        404: errorResponse('Device not found'),
        400: errorResponse('Validation error'),
      },
    },
  }, deviceController.update.bind(deviceController));

  // Delete device
  fastify.delete('/devices/:deviceId', {
    schema: {
      tags: ['Devices'],
      summary: 'Delete device',
      description: 'Deletes a device and all associated states (cascade delete)',
      params: zodToSwagger(deviceIdParamSchema),
      response: {
        200: {
          description: 'Device deleted successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Device deleted successfully' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                deviceId: { type: 'string' },
                name: { type: 'string' },
              },
            },
          },
        },
        404: errorResponse('Device not found'),
      },
    },
  }, deviceController.delete.bind(deviceController));

  // Search devices by tags (OR logic)
  fastify.get('/devices/search/tags', {
    schema: {
      tags: ['Devices'],
      summary: 'Search devices by tags (OR logic)',
      description: 'Finds devices that have ANY of the specified tags. Uses OR logic (unlike /devices?tags= which uses AND logic). Example: ?tags=floor-1,floor-2',
      querystring: {
        type: 'object',
        properties: {
          tags: { type: 'string', description: 'Comma-separated tags (e.g., floor-1,floor-2)' },
          limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
        },
        required: ['tags'],
      },
      response: {
        200: successResponse(
          {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                deviceId: { type: 'string' },
                name: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          'Devices matching tags'
        ),
        400: errorResponse('Validation error - tags parameter required'),
      },
    },
  }, deviceController.searchByTags.bind(deviceController));

  // Get device count
  fastify.get('/devices/stats/count', {
    schema: {
      tags: ['Devices'],
      summary: 'Get device count',
      description: 'Returns total device count, optionally filtered by tags',
      querystring: {
        type: 'object',
        properties: {
          tags: { type: 'string', description: 'Filter by tags (comma-separated)' },
        },
      },
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              count: { type: 'integer', example: 42 },
            },
          },
          'Device count'
        ),
      },
    },
  }, deviceController.count.bind(deviceController));

  // Get recent devices
  fastify.get('/devices/recent', {
    schema: {
      tags: ['Devices'],
      summary: 'Get recent devices',
      description: 'Returns most recently created devices, sorted by ULID (time-sortable)',
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        },
      },
      response: {
        200: successResponse(
          {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                deviceId: { type: 'string' },
                name: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          'Recent devices'
        ),
      },
    },
  }, deviceController.getRecent.bind(deviceController));
}
