import { FastifyInstance } from 'fastify';
import * as modbusGatewayController from '../controllers/modbus-gateway.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

/**
 * Modbus Gateway Routes
 *
 * Endpoints for managing Modbus gateways and connections
 */
export async function modbusGatewayRoutes(fastify: FastifyInstance) {
  // ==================== Gateway CRUD ====================

  /**
   * Create new Modbus gateway
   */
  fastify.post('/modbus-gateways', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Modbus'],
      summary: 'Create new Modbus gateway',
      description: 'Create a new Modbus TCP or RTU gateway configuration',
      body: {
        type: 'object',
        required: ['name', 'protocol', 'connection', 'polling', 'deviceMapping'],
        properties: {
          name: { type: 'string', description: 'Gateway name' },
          description: { type: 'string', description: 'Optional description' },
          protocol: {
            type: 'string',
            enum: ['tcp', 'rtu'],
            description: 'Modbus protocol (TCP or RTU)'
          },
          connection: {
            type: 'object',
            properties: {
              host: { type: 'string', description: 'IP address (TCP) or serial port (RTU)' },
              port: { type: 'number', description: 'Port number (default: 502)' },
              unitId: { type: 'number', description: 'Modbus unit ID (1-247)' },
              timeout: { type: 'number', description: 'Connection timeout in ms' },
              retryDelay: { type: 'number', description: 'Retry delay in ms' },
              baudRate: { type: 'number', description: 'Baud rate (RTU only)' },
              dataBits: { type: 'number', description: 'Data bits (RTU only)' },
              stopBits: { type: 'number', description: 'Stop bits (RTU only)' },
              parity: { type: 'string', enum: ['none', 'even', 'odd'], description: 'Parity (RTU only)' },
            }
          },
          polling: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean', description: 'Enable polling' },
              interval: { type: 'number', description: 'Polling interval in ms (min: 1000)' },
              onError: { type: 'string', enum: ['continue', 'stop'], description: 'Error behavior' },
            }
          },
          registers: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Register name' },
                address: { type: 'number', description: 'Register address (0-65535)' },
                type: { type: 'string', enum: ['holding', 'input', 'coil', 'discrete'] },
                dataType: { type: 'string', enum: ['int16', 'uint16', 'int32', 'uint32', 'float', 'boolean'] },
                scale: { type: 'number', description: 'Scale factor' },
                offset: { type: 'number', description: 'Offset' },
                unit: { type: 'string', description: 'Unit of measurement' },
                deviceId: { type: 'string', description: 'Target device ID (ULID)' },
              }
            }
          },
          deviceMapping: {
            type: 'object',
            properties: {
              autoRegister: { type: 'boolean', description: 'Auto-create devices' },
              deviceIdPrefix: { type: 'string', description: 'Prefix for auto-generated device IDs' },
              defaultTags: { type: 'array', items: { type: 'string' } },
            }
          },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
    preHandler: [requireAuth, requireRole('Admin')],
    handler: modbusGatewayController.createGateway,
  });

  /**
   * List all gateways
   */
  fastify.get('/modbus-gateways', {
      preHandler: [requireAuth, requireRole('Admin')],
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Modbus'],
      summary: 'List all Modbus gateways',
      description: 'Get list of all Modbus gateways with pagination',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string', description: 'Page number' },
          limit: { type: 'string', description: 'Items per page' },
          protocol: { type: 'string', enum: ['tcp', 'rtu'], description: 'Filter by protocol' },
          status: { type: 'string', enum: ['connected', 'disconnected', 'error'], description: 'Filter by status' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'array', items: { type: 'object', additionalProperties: true } },
            pagination: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
    handler: modbusGatewayController.listGateways,
  });

  /**
   * Get gateway by ID
   */
  fastify.get('/modbus-gateways/:id', {
      preHandler: [requireAuth, requireRole('Admin')],
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Modbus'],
      summary: 'Get gateway by ID',
      description: 'Get detailed information about a specific gateway',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Gateway ID' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
    handler: modbusGatewayController.getGateway,
  });

  /**
   * Update gateway
   */
  fastify.patch('/modbus-gateways/:id', {
      preHandler: [requireAuth, requireRole('Admin')],
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Modbus'],
      summary: 'Update gateway',
      description: 'Update gateway configuration (will restart if running)',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Gateway ID' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          connection: { type: 'object' },
          polling: { type: 'object' },
          registers: { type: 'array' },
          deviceMapping: { type: 'object' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
    handler: modbusGatewayController.updateGateway,
  });

  /**
   * Delete gateway
   */
  fastify.delete('/modbus-gateways/:id', {
      preHandler: [requireAuth, requireRole('Admin')],
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Modbus'],
      summary: 'Delete gateway',
      description: 'Delete gateway (will stop if running)',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Gateway ID' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: modbusGatewayController.deleteGateway,
  });

  // ==================== Gateway Operations ====================

  /**
   * Start gateway
   */
  fastify.post('/modbus-gateways/:id/start', {
      preHandler: [requireAuth, requireRole('Admin')],
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Modbus'],
      summary: 'Start gateway',
      description: 'Connect to Modbus device and start polling',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Gateway ID' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: modbusGatewayController.startGateway,
  });

  /**
   * Stop gateway
   */
  fastify.post('/modbus-gateways/:id/stop', {
      preHandler: [requireAuth, requireRole('Admin')],
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Modbus'],
      summary: 'Stop gateway',
      description: 'Disconnect from Modbus device and stop polling',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Gateway ID' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: modbusGatewayController.stopGateway,
  });

  /**
   * Test connection
   */
  fastify.post('/modbus-gateways/:id/test', {
      preHandler: [requireAuth, requireRole('Admin')],
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Modbus'],
      summary: 'Test connection',
      description: 'Test Modbus connection without starting polling',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Gateway ID' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: modbusGatewayController.testConnection,
  });

  /**
   * Get gateway status
   */
  fastify.get('/modbus-gateways/:id/status', {
      preHandler: [requireAuth, requireRole('Admin')],
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Modbus'],
      summary: 'Get gateway status',
      description: 'Get runtime status of gateway (running, connected)',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Gateway ID' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                running: { type: 'boolean' },
                connected: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    handler: modbusGatewayController.getStatus,
  });

  /**
   * Read register manually
   */
  fastify.post('/modbus-gateways/:id/read', {
      preHandler: [requireAuth, requireRole('Admin')],
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['Modbus'],
      summary: 'Read register manually',
      description: 'Read a single register value (for testing)',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Gateway ID' },
        },
      },
      body: {
        type: 'object',
        required: ['registerName'],
        properties: {
          registerName: { type: 'string', description: 'Name of register to read' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                registerName: { type: 'string' },
                value: { type: ['number', 'boolean'] },
                timestamp: { type: 'string' },
              },
            },
          },
        },
      },
    },
    handler: modbusGatewayController.readRegister,
  });
}
