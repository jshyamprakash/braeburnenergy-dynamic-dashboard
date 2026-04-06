import { FastifyInstance } from 'fastify';
import * as bacnetGatewayController from '../controllers/bacnet-gateway.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

export async function bacnetGatewayRoutes(fastify: FastifyInstance) {
  const pre = [requireAuth, requireRole('Admin')];

  fastify.post('/bacnet-gateways', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['BACnet'],
      summary: 'Create BACnet gateway',
      body: {
        type: 'object',
        required: ['name', 'host', 'polling', 'deviceMapping'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          applicationId: { type: 'string' },
          host: { type: 'string' },
          port: { type: 'number' },
          broadcastAddress: { type: 'string' },
          deviceInstance: { type: 'number' },
          objects: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                objectType: { type: 'string' },
                instanceNumber: { type: 'number' },
                property: { type: 'string' },
                field: { type: 'string' },
                scale: { type: 'number' },
                offset: { type: 'number' },
                unit: { type: 'string' },
                deviceId: { type: 'string' },
              },
            },
          },
          polling: { type: 'object' },
          deviceMapping: { type: 'object' },
        },
      },
      response: { 201: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', additionalProperties: true } } } },
    },
    handler: bacnetGatewayController.createGateway,
  });

  fastify.get('/bacnet-gateways', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['BACnet'],
      summary: 'List BACnet gateways',
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'string' },
          limit: { type: 'string' },
          status: { type: 'string' },
          applicationId: { type: 'string' },
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
    handler: bacnetGatewayController.listGateways,
  });

  fastify.get('/bacnet-gateways/:id', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['BACnet'],
      summary: 'Get BACnet gateway by ID',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', additionalProperties: true } } } },
    },
    handler: bacnetGatewayController.getGateway,
  });

  fastify.patch('/bacnet-gateways/:id', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['BACnet'],
      summary: 'Update BACnet gateway',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', additionalProperties: true },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', additionalProperties: true } } } },
    },
    handler: bacnetGatewayController.updateGateway,
  });

  fastify.delete('/bacnet-gateways/:id', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['BACnet'],
      summary: 'Delete BACnet gateway',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } },
    },
    handler: bacnetGatewayController.deleteGateway,
  });

  fastify.post('/bacnet-gateways/:id/start', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['BACnet'],
      summary: 'Start BACnet gateway',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } },
    },
    handler: bacnetGatewayController.startGateway,
  });

  fastify.post('/bacnet-gateways/:id/stop', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['BACnet'],
      summary: 'Stop BACnet gateway',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } },
    },
    handler: bacnetGatewayController.stopGateway,
  });

  fastify.post('/bacnet-gateways/:id/test', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['BACnet'],
      summary: 'Test BACnet connection',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } },
    },
    handler: bacnetGatewayController.testConnection,
  });

  fastify.get('/bacnet-gateways/:id/status', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['BACnet'],
      summary: 'Get runtime status',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', additionalProperties: true } } } },
    },
    handler: bacnetGatewayController.getStatus,
  });

  fastify.post('/bacnet-gateways/:id/read', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['BACnet'],
      summary: 'Read single BACnet object',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', required: ['fieldName'], properties: { fieldName: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', additionalProperties: true } } } },
    },
    handler: bacnetGatewayController.readObject,
  });
}
