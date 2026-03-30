import type { FastifyInstance } from 'fastify';
import * as mqttGatewayController from '../controllers/mqtt-gateway.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const topicMappingSchema = {
  type: 'object',
  required: ['topic', 'field', 'deviceId'],
  properties: {
    topic:         { type: 'string', description: 'MQTT topic pattern (supports + and # wildcards)' },
    field:         { type: 'string', description: 'Field name in device state data' },
    deviceId:      { type: 'string', description: 'Target device ULID' },
    payloadFormat: { type: 'string', enum: ['json', 'raw'], description: 'json=extract key, raw=whole payload as scalar' },
    jsonPath:      { type: 'string', description: 'Dot-notation key to extract from JSON payload (e.g. sensors.temperature)' },
    scale:         { type: 'number', description: 'Multiply value by this factor' },
    offset:        { type: 'number', description: 'Add this offset after scaling' },
    unit:          { type: 'string', description: 'Unit label (e.g. °C, bar)' },
    qos:           { type: 'number', enum: [0, 1, 2], description: 'MQTT QoS level' },
    processingOverrides: {
      type: 'object',
      description: 'Per-topic Processing Engine overrides (takes precedence over global env vars)',
      properties: {
        noiseThreshold: { type: 'number', minimum: 0, description: 'EMA noise gate threshold for this topic' },
        deltaPercent:   { type: 'number', minimum: 0, description: 'Minimum relative change (0–1) to emit an event' },
      },
    },
  },
};

const gatewayResponseSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    _id:           { type: 'string' },
    name:          { type: 'string' },
    brokerUrl:     { type: 'string' },
    status:        { type: 'string' },
    isActive:      { type: 'boolean' },
    topicMappings: { type: 'array', items: { type: 'object', additionalProperties: true } },
    createdAt:     { type: 'string' },
    updatedAt:     { type: 'string' },
  },
};

/**
 * MQTT Gateway Routes
 *
 * Endpoints for managing MQTT broker gateways and subscriptions.
 */
export async function mqttGatewayRoutes(fastify: FastifyInstance) {
  // ==================== Create ====================
  fastify.post('/mqtt-gateways', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['MQTT'],
      summary: 'Create MQTT gateway',
      description: 'Create a new MQTT broker gateway with topic-to-field mappings.',
      body: {
        type: 'object',
        required: ['name', 'brokerUrl'],
        properties: {
          name:          { type: 'string' },
          description:   { type: 'string' },
          applicationId: { type: 'string' },
          brokerUrl:     { type: 'string', description: 'mqtt://, mqtts://, ws://, or wss:// URL' },
          clientId:      { type: 'string', description: 'MQTT client ID (auto-generated if omitted)' },
          keepalive:     { type: 'number', description: 'Keepalive interval in seconds (default 60)' },
          connectTimeout:  { type: 'number', description: 'Connect timeout in ms (default 10000)' },
          reconnectPeriod: { type: 'number', description: 'Reconnect period in ms (default 5000)' },
          auth: {
            type: 'object',
            properties: {
              username: { type: 'string' },
              password: { type: 'string' },
            },
          },
          tls: {
            type: 'object',
            properties: {
              enabled:              { type: 'boolean' },
              rejectUnauthorized:   { type: 'boolean' },
              caCert:               { type: 'string' },
              clientCert:           { type: 'string' },
              clientKey:            { type: 'string' },
            },
          },
          topicMappings: { type: 'array', items: topicMappingSchema },
        },
      },
      response: { 201: { type: 'object', additionalProperties: true } },
    },
    preHandler: [requireAuth, requireRole('Operator')],
  }, mqttGatewayController.createGateway);

  // ==================== List ====================
  fastify.get('/mqtt-gateways', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['MQTT'],
      summary: 'List MQTT gateways',
      querystring: {
        type: 'object',
        properties: {
          page:          { type: 'string' },
          limit:         { type: 'string' },
          status:        { type: 'string', enum: ['connected', 'disconnected', 'error'] },
          applicationId: { type: 'string' },
        },
      },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
    preHandler: [requireAuth],
  }, mqttGatewayController.listGateways);

  // ==================== Get ====================
  fastify.get('/mqtt-gateways/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['MQTT'],
      summary: 'Get MQTT gateway',
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      response: { 200: { type: 'object', properties: { success: { type: 'boolean' }, data: gatewayResponseSchema } } },
    },
    preHandler: [requireAuth],
  }, mqttGatewayController.getGateway);

  // ==================== Update ====================
  fastify.put('/mqtt-gateways/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['MQTT'],
      summary: 'Update MQTT gateway',
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      body: { type: 'object', additionalProperties: true },
      response: { 200: { type: 'object', additionalProperties: true } },
    },
    preHandler: [requireAuth, requireRole('Operator')],
  }, mqttGatewayController.updateGateway);

  // ==================== Delete ====================
  fastify.delete('/mqtt-gateways/:id', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['MQTT'],
      summary: 'Delete MQTT gateway',
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
    preHandler: [requireAuth, requireRole('Admin')],
  }, mqttGatewayController.deleteGateway);

  // ==================== Start ====================
  fastify.post('/mqtt-gateways/:id/start', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['MQTT'],
      summary: 'Start MQTT gateway',
      description: 'Connect to broker and begin subscribing to configured topics.',
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
    preHandler: [requireAuth, requireRole('Operator')],
  }, mqttGatewayController.startGateway);

  // ==================== Stop ====================
  fastify.post('/mqtt-gateways/:id/stop', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['MQTT'],
      summary: 'Stop MQTT gateway',
      description: 'Disconnect from broker and stop receiving messages.',
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
    preHandler: [requireAuth, requireRole('Operator')],
  }, mqttGatewayController.stopGateway);

  // ==================== Test ====================
  fastify.post('/mqtt-gateways/:id/test', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['MQTT'],
      summary: 'Test MQTT broker connection',
      description: 'Attempts a brief connection to verify broker reachability without subscribing.',
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
    },
    preHandler: [requireAuth, requireRole('Operator')],
  }, mqttGatewayController.testConnection);

  // ==================== Status ====================
  fastify.get('/mqtt-gateways/:id/status', {
    schema: {
      security: [{ bearerAuth: [] }],
      tags: ['MQTT'],
      summary: 'Get MQTT gateway runtime status',
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                running:   { type: 'boolean' },
                connected: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    preHandler: [requireAuth],
  }, mqttGatewayController.getStatus);
}
