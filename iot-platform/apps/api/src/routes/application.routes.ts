import type { FastifyInstance } from 'fastify';
import { applicationController } from '../controllers/application.controller';
import {
  createApplicationSchema,
  updateApplicationSchema,
  queryApplicationsSchema,
  applicationIdParamSchema,
} from '../schemas/application.schema';
import { zodToSwagger, successResponse, paginatedResponse, errorResponse } from '../utils/swagger';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

/**
 * Application Routes
 *
 * Registers all application-related HTTP endpoints with OpenAPI documentation.
 * Applications are top-level containers for Devices, Workflows, and Dashboards (ADR-023).
 */
export async function applicationRoutes(fastify: FastifyInstance) {
  // Create application
  fastify.post('/applications', {
    schema: {
      tags: ['Applications'],
      summary: 'Create a new application',
      description: 'Creates a new application with auto-generated ULID and slug. Applications are the top-level container for devices, workflows, and dashboards.',
      security: [{ bearerAuth: [] }],
      body: zodToSwagger(createApplicationSchema),
      response: {
        201: successResponse(
          {
            type: 'object',
            properties: {
              id: { type: 'string' },
              applicationId: { type: 'string', description: 'ULID identifier' },
              orgId: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              slug: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          'Application created successfully'
        ),
        400: errorResponse('Validation error'),
        409: errorResponse('Slug already taken'),
      },
    },
    preHandler: [requireAuth, requirePermission('application:create')],
  }, applicationController.create.bind(applicationController) as any);

  // List applications
  fastify.get('/applications', {
    schema: {
      tags: ['Applications'],
      summary: 'List applications',
      description: 'Lists applications with pagination and optional filtering by name/slug.',
      security: [{ bearerAuth: [] }],
      querystring: zodToSwagger(queryApplicationsSchema),
      response: {
        200: paginatedResponse(
          {
            type: 'object',
            properties: {
              id: { type: 'string' },
              applicationId: { type: 'string' },
              orgId: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              slug: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          'Applications retrieved successfully'
        ),
      },
    },
    preHandler: [requireAuth, requirePermission('application:read')],
  }, applicationController.list.bind(applicationController) as any);

  // Get application
  fastify.get('/applications/:applicationId', {
    schema: {
      tags: ['Applications'],
      summary: 'Get application by ULID',
      description: 'Retrieves a single application by its ULID identifier.',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(applicationIdParamSchema),
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              id: { type: 'string' },
              applicationId: { type: 'string' },
              orgId: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              slug: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          'Application retrieved successfully'
        ),
        404: errorResponse('Application not found'),
      },
    },
    preHandler: [requireAuth, requirePermission('application:read')],
  }, applicationController.getOne.bind(applicationController) as any);

  // Update application
  fastify.patch('/applications/:applicationId', {
    schema: {
      tags: ['Applications'],
      summary: 'Update application',
      description: 'Updates an existing application. All fields are optional. Name changes auto-regenerate the slug.',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(applicationIdParamSchema),
      body: zodToSwagger(updateApplicationSchema),
      response: {
        200: successResponse(
          {
            type: 'object',
            properties: {
              id: { type: 'string' },
              applicationId: { type: 'string' },
              orgId: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              slug: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          'Application updated successfully'
        ),
        404: errorResponse('Application not found'),
        409: errorResponse('Slug already taken or operation conflict'),
      },
    },
    preHandler: [requireAuth, requirePermission('application:manage')],
  }, applicationController.update.bind(applicationController) as any);

  // Delete application
  fastify.delete('/applications/:applicationId', {
    schema: {
      tags: ['Applications'],
      summary: 'Delete application',
      description: 'Deletes an application. Rejects deletion if devices or workflows are still linked.',
      security: [{ bearerAuth: [] }],
      params: zodToSwagger(applicationIdParamSchema),
      response: {
        200: successResponse(
          { type: 'object', properties: { message: { type: 'string' } } },
          'Application deleted successfully'
        ),
        404: errorResponse('Application not found'),
        409: errorResponse('Cannot delete: linked devices or workflows exist'),
      },
    },
    preHandler: [requireAuth, requirePermission('application:manage')],
  }, applicationController.delete.bind(applicationController) as any);
}
