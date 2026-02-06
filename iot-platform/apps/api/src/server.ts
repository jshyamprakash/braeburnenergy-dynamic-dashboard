import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from './config/config';
import { deviceRoutes } from './routes/device.routes';
import { deviceStateRoutes } from './routes/device-state.routes';
import { healthRoutes } from './routes/health.routes';

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
        { name: 'Devices', description: 'Device management operations' },
        { name: 'Device States', description: 'Time-series device state management with TimescaleDB' },
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
    if (error.message.includes('Prisma')) {
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
