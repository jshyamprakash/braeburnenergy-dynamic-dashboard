import { FastifyInstance } from 'fastify';
import * as opcuaGatewayController from '../controllers/opcua-gateway.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

/**
 * OPC UA Gateway Routes
 *
 * Industrial protocol gateway management for OPC UA devices.
 * Note: Authentication disabled for POC - enable in production
 */

export async function opcuaGatewayRoutes(fastify: FastifyInstance) {
  // ============================================================================
  // Gateway Configuration Management
  // ============================================================================

  /**
   * POST /opcua-gateways
   * Create OPC UA gateway
   */
  fastify.post(
    '/opcua-gateways',
    {
      schema: {
      security: [{ bearerAuth: [] }],
        tags: ['OPC UA Gateway'],
        summary: 'Create OPC UA gateway',
        description: 'Create new OPC UA gateway configuration',
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    opcuaGatewayController.createOpcuaGateway
  );

  /**
   * GET /opcua-gateways
   * List OPC UA gateways
   */
  fastify.get(
    '/opcua-gateways',
    {
      schema: {
      security: [{ bearerAuth: [] }],
        tags: ['OPC UA Gateway'],
        summary: 'List OPC UA gateways',
        description: 'List all OPC UA gateways with filtering',
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    opcuaGatewayController.listOpcuaGateways
  );

  /**
   * GET /opcua-gateways/running
   * Get all running gateways
   */
  fastify.get(
    '/opcua-gateways/running',
    {
      schema: {
      security: [{ bearerAuth: [] }],
        tags: ['OPC UA Gateway'],
        summary: 'Get running gateways',
        description: 'Get all currently running OPC UA gateways',
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    opcuaGatewayController.getRunningGateways
  );

  /**
   * GET /opcua-gateways/:id
   * Get OPC UA gateway by ID
   */
  fastify.get(
    '/opcua-gateways/:id',
    {
      schema: {
      security: [{ bearerAuth: [] }],
        tags: ['OPC UA Gateway'],
        summary: 'Get OPC UA gateway',
        description: 'Get specific OPC UA gateway by ID with runtime status',
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    opcuaGatewayController.getOpcuaGateway
  );

  /**
   * PATCH /opcua-gateways/:id
   * Update OPC UA gateway (Admin+)
   */
  fastify.patch(
    '/opcua-gateways/:id',
    {
      schema: {
      security: [{ bearerAuth: [] }],
        tags: ['OPC UA Gateway'],
        summary: 'Update OPC UA gateway',
        description: 'Update existing OPC UA gateway configuration (Admin and SuperAdmin)',
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    opcuaGatewayController.updateOpcuaGateway
  );

  /**
   * DELETE /opcua-gateways/:id
   * Delete OPC UA gateway (Admin+)
   */
  fastify.delete(
    '/opcua-gateways/:id',
    {
      schema: {
      security: [{ bearerAuth: [] }],
        tags: ['OPC UA Gateway'],
        summary: 'Delete OPC UA gateway',
        description: 'Delete OPC UA gateway configuration (Admin and SuperAdmin)',
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    opcuaGatewayController.deleteOpcuaGateway
  );

  // ============================================================================
  // Gateway Control
  // ============================================================================

  /**
   * POST /opcua-gateways/:id/start
   * Start OPC UA gateway (Admin+)
   */
  fastify.post(
    '/opcua-gateways/:id/start',
    {
      schema: {
      security: [{ bearerAuth: [] }],
        tags: ['OPC UA Gateway'],
        summary: 'Start OPC UA gateway',
        description: 'Start OPC UA gateway connection and data acquisition (Admin and SuperAdmin)',
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    opcuaGatewayController.startOpcuaGateway
  );

  /**
   * POST /opcua-gateways/:id/stop
   * Stop OPC UA gateway (Admin+)
   */
  fastify.post(
    '/opcua-gateways/:id/stop',
    {
      schema: {
      security: [{ bearerAuth: [] }],
        tags: ['OPC UA Gateway'],
        summary: 'Stop OPC UA gateway',
        description: 'Stop OPC UA gateway connection (Admin and SuperAdmin)',
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    opcuaGatewayController.stopOpcuaGateway
  );

  /**
   * POST /opcua-gateways/:id/restart
   * Restart OPC UA gateway (Admin+)
   */
  fastify.post(
    '/opcua-gateways/:id/restart',
    {
      schema: {
      security: [{ bearerAuth: [] }],
        tags: ['OPC UA Gateway'],
        summary: 'Restart OPC UA gateway',
        description: 'Restart OPC UA gateway connection (Admin and SuperAdmin)',
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    opcuaGatewayController.restartOpcuaGateway
  );

  /**
   * POST /opcua-gateways/:id/test
   * Test OPC UA connection (Admin+)
   */
  fastify.post(
    '/opcua-gateways/:id/test',
    {
      schema: {
      security: [{ bearerAuth: [] }],
        tags: ['OPC UA Gateway'],
        summary: 'Test OPC UA connection',
        description: 'Test OPC UA connection without starting monitoring (Admin and SuperAdmin)',
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    opcuaGatewayController.testConnection
  );

  /**
   * GET /opcua-gateways/:id/status
   * Get gateway runtime status
   */
  fastify.get(
    '/opcua-gateways/:id/status',
    {
      schema: {
      security: [{ bearerAuth: [] }],
        tags: ['OPC UA Gateway'],
        summary: 'Get gateway status',
        description: 'Get runtime status of OPC UA gateway (running, connected)',
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    opcuaGatewayController.getStatus
  );

  /**
   * POST /opcua-gateways/:id/browse
   * Browse OPC UA server nodes (Admin+)
   */
  fastify.post(
    '/opcua-gateways/:id/browse',
    {
      schema: {
      security: [{ bearerAuth: [] }],
        tags: ['OPC UA Gateway'],
        summary: 'Browse OPC UA nodes',
        description: 'Browse OPC UA server address space for node discovery (Admin and SuperAdmin)',
        body: {
          type: 'object',
          properties: {
            nodeId: {
              type: 'string',
              description: 'Node ID to browse (default: RootFolder)',
            },
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
                  nodeId: { type: 'string' },
                  nodes: { type: 'array', items: { type: 'object', additionalProperties: true } },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    opcuaGatewayController.browseNodes
  );

  // ============================================================================
  // Gateway Statistics
  // ============================================================================

  /**
   * GET /opcua-gateways/:id/statistics
   * Get OPC UA gateway statistics
   */
  fastify.get(
    '/opcua-gateways/:id/statistics',
    {
      schema: {
      security: [{ bearerAuth: [] }],
        tags: ['OPC UA Gateway'],
        summary: 'Get gateway statistics',
        description: 'Get OPC UA gateway connection statistics and performance metrics',
      },
      preHandler: [requireAuth, requireRole('Admin')],
    },
    opcuaGatewayController.getOpcuaGatewayStatistics
  );
}
