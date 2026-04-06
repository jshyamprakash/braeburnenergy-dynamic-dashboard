import { FastifyInstance } from 'fastify';
import * as enipGatewayController from '../controllers/enip-gateway.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

export async function enipGatewayRoutes(fastify: FastifyInstance) {
  const pre = [requireAuth, requireRole('Admin')];

  fastify.post('/enip-gateways', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['EthernetIP'],
      summary: 'Create EtherNet/IP gateway',
      body: {
        type: 'object',
        required: ['name', 'host', 'polling', 'deviceMapping'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          applicationId: { type: 'string' },
          host: { type: 'string' },
          port: { type: 'number' },
          slot: { type: 'number' },
          timeout: { type: 'number' },
          tags: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tagName: { type: 'string' },
                field: { type: 'string' },
                dataType: { type: 'string' },
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
    handler: enipGatewayController.createGateway,
  });

  fastify.get('/enip-gateways', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['EthernetIP'],
      summary: 'List EtherNet/IP gateways',
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
    handler: enipGatewayController.listGateways,
  });

  fastify.get('/enip-gateways/:id', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['EthernetIP'],
      summary: 'Get EtherNet/IP gateway by ID',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', additionalProperties: true } } } },
    },
    handler: enipGatewayController.getGateway,
  });

  fastify.patch('/enip-gateways/:id', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['EthernetIP'],
      summary: 'Update EtherNet/IP gateway',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', additionalProperties: true },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', additionalProperties: true } } } },
    },
    handler: enipGatewayController.updateGateway,
  });

  fastify.delete('/enip-gateways/:id', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['EthernetIP'],
      summary: 'Delete EtherNet/IP gateway',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } },
    },
    handler: enipGatewayController.deleteGateway,
  });

  fastify.post('/enip-gateways/:id/start', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['EthernetIP'],
      summary: 'Start EtherNet/IP gateway',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } },
    },
    handler: enipGatewayController.startGateway,
  });

  fastify.post('/enip-gateways/:id/stop', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['EthernetIP'],
      summary: 'Stop EtherNet/IP gateway',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } },
    },
    handler: enipGatewayController.stopGateway,
  });

  fastify.post('/enip-gateways/:id/test', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['EthernetIP'],
      summary: 'Test EtherNet/IP connection',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' } } } },
    },
    handler: enipGatewayController.testConnection,
  });

  fastify.get('/enip-gateways/:id/status', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['EthernetIP'],
      summary: 'Get runtime status',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', additionalProperties: true } } } },
    },
    handler: enipGatewayController.getStatus,
  });

  fastify.post('/enip-gateways/:id/read', {
    preHandler: pre,
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['EthernetIP'],
      summary: 'Read single CIP tag',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: { type: 'object', required: ['fieldName'], properties: { fieldName: { type: 'string' } } },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', additionalProperties: true } } } },
    },
    handler: enipGatewayController.readTag,
  });
}
