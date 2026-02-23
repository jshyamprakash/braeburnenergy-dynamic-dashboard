import type { FastifyRequest, FastifyReply } from 'fastify';
import { applicationService } from '../services/application.service';
import {
  createApplicationSchema,
  updateApplicationSchema,
  queryApplicationsSchema,
  applicationIdParamSchema,
  type CreateApplicationDTO,
  type UpdateApplicationDTO,
  type QueryApplicationsDTO,
  type ApplicationIdParam,
} from '../schemas/application.schema';

/**
 * Default organization ID for POC
 * TODO: Replace with orgId from JWT token or request header in MVP
 */
const DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

/**
 * ApplicationController
 *
 * HTTP request handlers for application management
 */
export class ApplicationController {
  /**
   * POST /applications
   * Create a new application
   */
  async create(
    request: FastifyRequest<{ Body: CreateApplicationDTO }>,
    reply: FastifyReply
  ) {
    try {
      const validatedData = createApplicationSchema.parse(request.body);
      const application = await applicationService.create(DEFAULT_ORG_ID, validatedData);

      return reply.code(201).send({
        success: true,
        data: application,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: error,
        });
      }

      if (error instanceof Error && error.message.includes('already taken')) {
        return reply.code(409).send({
          success: false,
          error: error.message,
        });
      }

      request.log.error(error, 'Error creating application');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /applications/:applicationId
   * Get application by ULID
   */
  async getOne(
    request: FastifyRequest<{ Params: ApplicationIdParam }>,
    reply: FastifyReply
  ) {
    try {
      const { applicationId } = applicationIdParamSchema.parse(request.params);
      const application = await applicationService.getById(DEFAULT_ORG_ID, applicationId);

      if (!application) {
        return reply.code(404).send({
          success: false,
          error: 'Application not found',
        });
      }

      return reply.code(200).send({
        success: true,
        data: application,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid application ID',
          details: error,
        });
      }

      request.log.error(error, 'Error fetching application');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * GET /applications
   * List applications
   */
  async list(
    request: FastifyRequest<{ Querystring: QueryApplicationsDTO }>,
    reply: FastifyReply
  ) {
    try {
      const validatedQuery = queryApplicationsSchema.parse(request.query);
      const result = await applicationService.list(DEFAULT_ORG_ID, validatedQuery);

      return reply.code(200).send({
        success: true,
        ...result,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid query parameters',
          details: error,
        });
      }

      request.log.error(error, 'Error listing applications');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * PATCH /applications/:applicationId
   * Update application
   */
  async update(
    request: FastifyRequest<{ Params: ApplicationIdParam; Body: UpdateApplicationDTO }>,
    reply: FastifyReply
  ) {
    try {
      const { applicationId } = applicationIdParamSchema.parse(request.params);
      const validatedData = updateApplicationSchema.parse(request.body);

      const application = await applicationService.update(DEFAULT_ORG_ID, applicationId, validatedData);

      if (!application) {
        return reply.code(404).send({
          success: false,
          error: 'Application not found',
        });
      }

      return reply.code(200).send({
        success: true,
        data: application,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.code(400).send({
          success: false,
          error: 'Validation failed',
          details: error,
        });
      }

      if (error instanceof Error && error.message.includes('already taken')) {
        return reply.code(409).send({
          success: false,
          error: error.message,
        });
      }

      request.log.error(error, 'Error updating application');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * DELETE /applications/:applicationId
   * Delete application
   */
  async delete(
    request: FastifyRequest<{ Params: ApplicationIdParam }>,
    reply: FastifyReply
  ) {
    try {
      const { applicationId } = applicationIdParamSchema.parse(request.params);
      const application = await applicationService.delete(DEFAULT_ORG_ID, applicationId);

      if (!application) {
        return reply.code(404).send({
          success: false,
          error: 'Application not found',
        });
      }

      return reply.code(200).send({
        success: true,
        data: { message: 'Application deleted successfully' },
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Cannot delete')) {
        return reply.code(409).send({
          success: false,
          error: error.message,
        });
      }

      request.log.error(error, 'Error deleting application');
      return reply.code(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}

// Export singleton instance
export const applicationController = new ApplicationController();
