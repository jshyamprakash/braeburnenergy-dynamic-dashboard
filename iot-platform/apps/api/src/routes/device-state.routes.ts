import type { FastifyInstance } from 'fastify';
import { deviceStateController } from '../controllers/device-state.controller';
import {
  bulkCreateDeviceStatesSchema,
  queryDeviceStatesSchema,
} from '../schemas/device-state.schema';
import { deviceIdParamSchema } from '../schemas/device.schema';
import { zodToSwagger, successResponse, paginatedResponse, errorResponse } from '../utils/swagger';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

/**
 * Device State Routes
 *
 * Registers all device state/telemetry-related HTTP endpoints with OpenAPI documentation
 */
export async function deviceStateRoutes(fastify: FastifyInstance) {
  // Bulk create device states
  fastify.post('/states/bulk', {
    schema: {
      tags: ['Device States'],
      summary: 'Bulk create device states',
      description: 'Creates multiple device states in a single batch (up to 1000 states). Used for high-throughput data ingestion.',
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(bulkCreateDeviceStatesSchema),
      response: {
        201: successResponse(
          {
            type: 'object',
            properties: {
              count: { type: 'integer'},
              message: { type: 'string'},
            },
          },
          'States created successfully'
        ),
        400: errorResponse('Validation error - max 1000 states per batch'),
      },
    },
    preHandler: [requireAuth, requirePermission('device-state:create')],
  }, deviceStateController.bulkCreate.bind(deviceStateController));

  // Create device state
  fastify.post('/devices/:deviceId/states', {
    schema: {
      tags: ['Device States'],
      summary: 'Create device state',
      description: 'Creates a new state for a device. Automatically broadcasts to WebSocket subscribers. TimescaleDB hypertable with 7-day chunks.',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(deviceIdParamSchema),
      body: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            additionalProperties: true,
            description: 'State data (flexible JSON, e.g., {temperature: 23.5, humidity: 45})',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'State timestamp (defaults to now)',
          },
        },
        required: ['data'],
      },
      response: {
        201: successResponse(
          {
            type: 'object',
            properties: {
              id: { type: 'string' },
              deviceId: { type: 'string'},
              data: { type: 'object', additionalProperties: true },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          'State created and broadcast via WebSocket'
        ),
        404: errorResponse('Device not found'),
        400: errorResponse('Validation error - data cannot be empty'),
      },
    },
    preHandler: [requireAuth, requirePermission('device-state:create')],
  }, deviceStateController.create.bind(deviceStateController));

  // List device states
  fastify.get('/devices/:deviceId/states', {
    schema: {
      tags: ['Device States'],
      summary: 'List device states',
      description: 'Retrieves device states with time-range filtering, pagination, and sorting. Optimized with TimescaleDB chunk pruning.',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(deviceIdParamSchema),
      querystring: zodToSwagger(queryDeviceStatesSchema),
      response: {
        200: paginatedResponse(
          {
            type: 'object',
            properties: {
              id: { type: 'string' },
              deviceId: { type: 'string' },
              data: { type: 'object', additionalProperties: true },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          'Device states retrieved'
        ),
        404: errorResponse('Device not found'),
      },
    },
    preHandler: [requireAuth, requirePermission('device-state:read')],
  }, deviceStateController.list.bind(deviceStateController));

  // Get latest state
  fastify.get('/devices/:deviceId/states/latest', {
    schema: {
      tags: ['Device States'],
      summary: 'Get latest device state',
      description: 'Retrieves the most recent state for a device. Optimized with timestamp DESC index.',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(deviceIdParamSchema),
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              id: { type: 'string' },
              deviceId: { type: 'string' },
              data: { type: 'object', additionalProperties: true },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          'Latest state'
        ),
        404: errorResponse('No states found for this device'),
      },
    },
    preHandler: [requireAuth, requirePermission('device-state:read')],
  }, deviceStateController.getLatest.bind(deviceStateController));

  // Aggregate device states
  fastify.get('/devices/:deviceId/states/aggregate', {
    schema: {
      tags: ['Device States'],
      summary: 'Aggregate device states (TimescaleDB)',
      description: 'Aggregates time-series data using TimescaleDB time_bucket. Used for downsampling data for charts and dashboards. Supports avg, min, max, sum, count, first, last.',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(deviceIdParamSchema),
      querystring: {
        type: 'object',
        properties: {
          startTime: {
            type: 'string',
            format: 'date-time',
            description: 'Start of time range (inclusive) e.g., 2026-02-05T00:00:00Z',
          },
          endTime: {
            type: 'string',
            format: 'date-time',
            description: 'End of time range (inclusive) e.g., 2026-02-05T23:59:59Z',
          },
          bucket: {
            type: 'string',
            enum: ['1m', '5m', '15m', '1h', '6h', '1d', '1w'],
            description: 'Time bucket interval e.g., 1h',
          },
          fields: {
            type: 'string',
            description: 'Data fields to aggregate (comma-separated, max 50) e.g., temperature,humidity',
          },
          functions: {
            type: 'string',
            description: 'Aggregation functions (comma-separated) e.g., avg,min,max. Supported: avg, min, max, sum, count, first, last',
          },
        },
        required: ['startTime', 'endTime', 'bucket', 'fields', 'functions'],
      },
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              deviceId: { type: 'string' },
              startTime: { type: 'string', format: 'date-time' },
              endTime: { type: 'string', format: 'date-time' },
              bucket: { type: 'string'},
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    bucket: { type: 'string', format: 'date-time', description: 'Time bucket start' },
                    values: {
                      type: 'object',
                      additionalProperties: { type: 'number' },
                      example: { temperature_avg: 24.5, temperature_min: 23.1, temperature_max: 25.9 },
                    },
                  },
                },
              },
            },
          },
          'Aggregated time-series data'
        ),
        400: errorResponse('Validation error - invalid bucket or time range'),
        404: errorResponse('Device not found'),
      },
    },
    preHandler: [requireAuth, requirePermission('device-state:read')],
  }, deviceStateController.aggregate.bind(deviceStateController));

  // Get field statistics
  fastify.get('/devices/:deviceId/states/statistics', {
    schema: {
      tags: ['Device States'],
      summary: 'Get field statistics',
      description: 'Calculates statistics (avg, min, max, count) for a specific data field over a time range.',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(deviceIdParamSchema),
      querystring: {
        type: 'object',
        properties: {
          field: { type: 'string', description: 'Data field name'},
          startTime: { type: 'string', format: 'date-time', description: 'Start of time range' },
          endTime: { type: 'string', format: 'date-time', description: 'End of time range' },
        },
        required: ['field', 'startTime', 'endTime'],
      },
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              field: { type: 'string'},
              startTime: { type: 'string', format: 'date-time' },
              endTime: { type: 'string', format: 'date-time' },
              statistics: {
                type: 'object',
                properties: {
                  avg: { type: 'number', nullable: true},
                  min: { type: 'number', nullable: true},
                  max: { type: 'number', nullable: true},
                  count: { type: 'integer'},
                },
              },
            },
          },
          'Field statistics'
        ),
        404: errorResponse('Device not found'),
      },
    },
    preHandler: [requireAuth, requirePermission('device-state:read')],
  }, deviceStateController.getStatistics.bind(deviceStateController));

  // Get state count
  fastify.get('/devices/:deviceId/states/count', {
    schema: {
      tags: ['Device States'],
      summary: 'Get state count',
      description: 'Returns total count of states for a device, optionally filtered by time range.',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(deviceIdParamSchema),
      querystring: {
        type: 'object',
        properties: {
          startTime: { type: 'string', format: 'date-time', description: 'Start of time range (optional)' },
          endTime: { type: 'string', format: 'date-time', description: 'End of time range (optional)' },
        },
      },
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              count: { type: 'integer'},
            },
          },
          'State count'
        ),
        404: errorResponse('Device not found'),
      },
    },
    preHandler: [requireAuth, requirePermission('device-state:read')],
  }, deviceStateController.count.bind(deviceStateController));

  // Delete old states
  fastify.delete('/devices/:deviceId/states/old', {
    schema: {
      tags: ['Device States'],
      summary: 'Delete old states',
      description: 'Deletes device states older than a specified date. TimescaleDB automatic retention policy deletes data older than 90 days. Requires Admin or SuperAdmin role.',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(deviceIdParamSchema),
      querystring: {
        type: 'object',
        properties: {
          beforeDate: {
            type: 'string',
            format: 'date-time',
            description: 'Delete states older than this date e.g., 2026-01-01T00:00:00Z',
          },
        },
        required: ['beforeDate'],
      },
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              deleted: { type: 'integer'},
              message: { type: 'string'},
            },
          },
          'Old states deleted'
        ),
        404: errorResponse('Device not found'),
        400: errorResponse('Validation error - beforeDate required'),
      },
    },
    preHandler: [requireAuth, requirePermission('device-state:export')], // Using export permission for delete (Admin+)
  }, deviceStateController.deleteOld.bind(deviceStateController));
}
