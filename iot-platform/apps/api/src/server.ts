import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config/config';
import { deviceRoutes } from './routes/device.routes';
import { deviceStateRoutes } from './routes/device-state.routes';
import { organizationRoutes } from './routes/organization.routes';
import { applicationRoutes } from './routes/application.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
import { healthRoutes } from './routes/health.routes';
import { authRoutes } from './routes/auth.routes';
import { apiKeyRoutes } from './routes/api-key.routes';
import { auditLogRoutes } from './routes/audit-log.routes';
import { retentionPolicyRoutes } from './routes/retention-policy.routes';
import { validationRuleRoutes } from './routes/validation-rule.routes';
import { alarmRoutes } from './routes/alarm.routes';
import { modbusGatewayRoutes } from './routes/modbus-gateway.routes';
import { opcuaGatewayRoutes } from './routes/opcua-gateway.routes';
import { waterQualityRoutes } from './routes/water-quality.routes';
import { workflowRoutes } from './routes/workflow.routes';
import { registerAuditMiddleware } from './middleware/audit.middleware';

/**
 * Create and configure Fastify server
 */
export async function createServer() {
  // Initialize Fastify with logging
  const fastify = Fastify({
    logger: {
      level: config.isDevelopment ? 'debug' : 'info',
      transport: config.isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    },
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    trustProxy: true,
  });

  // Register CORS
  await fastify.register(cors, {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  });

  // Register audit middleware (EPA compliance)
  registerAuditMiddleware(fastify);

  // Register Swagger
  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'IoT Platform API',
        description: 'Enterprise IoT Platform API - Device Management, Time-Series Data, and Real-Time Communication',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'support@iot-platform.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: `http://localhost:${config.server.port}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'Health', description: 'Health check and monitoring endpoints' },
        { name: 'Authentication', description: 'User authentication and authorization (EPA-compliant RBAC)' },
        { name: 'API Keys', description: 'API key management for machine-to-machine authentication' },
        { name: 'Audit Logs', description: 'EPA-compliant audit trail (append-only, read-only)' },
        { name: 'Retention Policies', description: 'EPA-compliant data retention policy management (5-year retention)' },
        { name: 'Data Quality', description: 'EPA/AWWA-compliant data quality validation and QA/QC' },
        { name: 'Alarm Management', description: 'ISA-18.2 compliant alarm management and acknowledgment' },
        { name: 'Modbus Gateway', description: 'Industrial protocol gateway for Modbus TCP/RTU devices' },
        { name: 'OPC UA Gateway', description: 'Industrial protocol gateway for OPC UA devices with subscriptions and polling' },
        { name: 'Water Quality', description: 'EPA/AWWA compliant water quality parameter validation and compliance reporting' },
        { name: 'Workflows', description: 'Visual workflow automation with node-based editor and execution engine' },
        { name: 'organizations', description: 'Multi-tenancy organization management' },
        { name: 'Dashboards', description: 'Dashboard configuration and layout management with cross-device sync' },
        { name: 'Devices', description: 'Device management operations' },
        { name: 'Device States', description: 'Time-series device state management with MongoDB Time Series' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT Authorization (planned for MVP)',
          },
        },
      },
    },
  });

  // Register Swagger UI
  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject) => swaggerObject,
    transformSpecificationClone: true,
  });

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    // Validation errors (from Zod or Fastify)
    if (error.validation) {
      return reply.code(400).send({
        success: false,
        error: 'Validation failed',
        details: error.validation,
      });
    }

    // Database errors
    if (error.message.includes('Mongo') || error.message.includes('mongoose')) {
      return reply.code(500).send({
        success: false,
        error: 'Database error',
        message: config.isDevelopment ? error.message : 'Internal server error',
      });
    }

    // Generic error response
    const statusCode = error.statusCode || 500;
    return reply.code(statusCode).send({
      success: false,
      error: error.message || 'Internal server error',
      ...(config.isDevelopment && { stack: error.stack }),
    });
  });

  // 404 handler
  fastify.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      success: false,
      error: 'Route not found',
      path: request.url,
      method: request.method,
    });
  });

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(authRoutes);
  await fastify.register(apiKeyRoutes);
  await fastify.register(auditLogRoutes);
  await fastify.register(retentionPolicyRoutes);
  await fastify.register(validationRuleRoutes);
  await fastify.register(alarmRoutes);
  await fastify.register(modbusGatewayRoutes);
  await fastify.register(opcuaGatewayRoutes);
  await fastify.register(waterQualityRoutes);
  await fastify.register(workflowRoutes);
  await fastify.register(organizationRoutes);
  await fastify.register(applicationRoutes);
  await fastify.register(dashboardRoutes);
  await fastify.register(deviceRoutes);
  await fastify.register(deviceStateRoutes);

  // Root endpoint
  fastify.get('/', async (_request, reply) => {
    return reply.send({
      service: 'IoT Platform API',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        auth: '/auth',
        apiKeys: '/api-keys',
        auditLogs: '/audit-logs',
        retentionPolicies: '/retention-policies',
        validationRules: '/validation-rules',
        qualityStats: '/quality/stats/:deviceId',
        alarmRules: '/alarm-rules',
        alarms: '/alarms',
        alarmStatistics: '/alarms/statistics',
        modbusGateways: '/modbus-gateways',
        opcuaGateways: '/opcua-gateways',
        waterQualityParameters: '/water-quality/parameters',
        waterQualityValidation: '/water-quality/validate',
        waterQualityCompliance: '/water-quality/compliance/:deviceId',
        workflows: '/workflows',
        workflowExecute: '/workflows/:workflowId/execute',
        executions: '/executions/:executionId',
        organizations: '/organizations',
        dashboards: '/dashboards',
        devices: '/devices',
        states: '/states',
        docs: '/docs',
        swagger: '/docs/json',
      },
      documentation: {
        interactive: `http://localhost:${config.server.port}/docs`,
        openapi: `http://localhost:${config.server.port}/docs/json`,
        websocket: 'See docs/softwares/WEBSOCKET_API.md',
      },
    });
  });

  return fastify;
}

/**
 * Alias for createServer (used in integration tests)
 */
export const build = createServer;

/**
 * Start the server
 */
export async function startServer() {
  try {
    const fastify = await createServer();

    // Start listening
    await fastify.listen({
      port: config.server.port,
      host: config.server.host,
    });

    fastify.log.info(
      `Server listening on http://${config.server.host}:${config.server.port}`
    );

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'];
    signals.forEach((signal) => {
      process.on(signal, async () => {
        fastify.log.info(`Received ${signal}, closing server gracefully...`);
        await fastify.close();
        process.exit(0);
      });
    });

    return fastify;
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}
