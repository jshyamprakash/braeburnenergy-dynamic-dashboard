import type { FastifyRequest, FastifyReply } from 'fastify';
import { organizationService } from '../services/organization.service';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  orgIdParamSchema,
  orgSlugParamSchema,
  queryOrganizationsSchema,
} from '../schemas/organization.schema';

/**
 * OrganizationController handles HTTP requests for organization operations
 */
class OrganizationController {
  /**
   * Create a new organization
   * POST /organizations
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const validatedData = createOrganizationSchema.parse(request.body);

    // Check if slug already exists
    const existing = await organizationService.getBySlug(validatedData.slug);
    if (existing) {
      return reply.code(409).send({
        success: false,
        error: 'Organization with this slug already exists',
      });
    }

    const organization = await organizationService.create(validatedData);

    return reply.code(201).send({
      success: true,
      data: organization,
    });
  }

  /**
   * Get organization by ID
   * GET /organizations/:orgId
   */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { orgId } = orgIdParamSchema.parse(request.params);

    const organization = await organizationService.getById(orgId);

    if (!organization) {
      return reply.code(404).send({
        success: false,
        error: 'Organization not found',
      });
    }

    return reply.code(200).send({
      success: true,
      data: organization,
    });
  }

  /**
   * Get organization by slug
   * GET /organizations/slug/:slug
   */
  async getBySlug(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = orgSlugParamSchema.parse(request.params);

    const organization = await organizationService.getBySlug(slug);

    if (!organization) {
      return reply.code(404).send({
        success: false,
        error: 'Organization not found',
      });
    }

    return reply.code(200).send({
      success: true,
      data: organization,
    });
  }

  /**
   * List organizations with pagination
   * GET /organizations
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const validatedQuery = queryOrganizationsSchema.parse(request.query);

    const { organizations, total } = await organizationService.list(validatedQuery);

    return reply.code(200).send({
      success: true,
      data: organizations,
      pagination: {
        limit: validatedQuery.limit || 20,
        offset: validatedQuery.offset || 0,
        total,
      },
    });
  }

  /**
   * Update organization
   * PATCH /organizations/:orgId
   */
  async update(request: FastifyRequest, reply: FastifyReply) {
    const { orgId } = orgIdParamSchema.parse(request.params);
    const validatedData = updateOrganizationSchema.parse(request.body);

    // If updating slug, check if it's already taken
    if (validatedData.slug) {
      const existing = await organizationService.getBySlug(validatedData.slug);
      if (existing && existing.id !== orgId) {
        return reply.code(409).send({
          success: false,
          error: 'Organization with this slug already exists',
        });
      }
    }

    const organization = await organizationService.update(orgId, validatedData);

    if (!organization) {
      return reply.code(404).send({
        success: false,
        error: 'Organization not found',
      });
    }

    return reply.code(200).send({
      success: true,
      data: organization,
    });
  }

  /**
   * Delete organization
   * DELETE /organizations/:orgId
   */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { orgId } = orgIdParamSchema.parse(request.params);

    const deleted = await organizationService.delete(orgId);

    if (!deleted) {
      return reply.code(404).send({
        success: false,
        error: 'Organization not found',
      });
    }

    return reply.code(200).send({
      success: true,
      message: 'Organization deleted successfully',
    });
  }

  /**
   * Get organization statistics
   * GET /organizations/:orgId/stats
   */
  async getStats(request: FastifyRequest, reply: FastifyReply) {
    const { orgId } = orgIdParamSchema.parse(request.params);

    const stats = await organizationService.getStats(orgId);

    if (!stats) {
      return reply.code(404).send({
        success: false,
        error: 'Organization not found',
      });
    }

    return reply.code(200).send({
      success: true,
      data: stats,
    });
  }
}

export const organizationController = new OrganizationController();
