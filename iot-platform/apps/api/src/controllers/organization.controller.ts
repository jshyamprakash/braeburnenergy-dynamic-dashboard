import type { FastifyRequest, FastifyReply } from 'fastify';
import { organizationService } from '../services/organization.service';
import { NotFoundError, ConflictError } from '../lib/errors';
import { sendSuccess, sendCreated, sendPaginated, sendDeleted } from '../lib/response';
import {
  type CreateOrganizationDTO,
  type UpdateOrganizationDTO,
  type QueryOrganizationsDTO,
} from '../schemas/organization.schema';

/**
 * OrganizationController
 *
 * HTTP request handlers for organization management.
 * Zero try/catch — errors propagate to global error handler.
 */
class OrganizationController {
  /**
   * POST /organizations
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const data = request.body as CreateOrganizationDTO;

    const existing = await organizationService.getBySlug(data.slug);
    if (existing) {
      throw new ConflictError('Organization with this slug already exists');
    }

    const organization = await organizationService.create(data);
    return sendCreated(reply, organization);
  }

  /**
   * GET /organizations/:orgId
   */
  async getById(request: FastifyRequest, reply: FastifyReply) {
    const { orgId } = request.params as { orgId: string };
    const organization = await organizationService.getById(orgId);

    if (!organization) {
      throw new NotFoundError('Organization');
    }

    return sendSuccess(reply, organization);
  }

  /**
   * GET /organizations/slug/:slug
   */
  async getBySlug(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const organization = await organizationService.getBySlug(slug);

    if (!organization) {
      throw new NotFoundError('Organization');
    }

    return sendSuccess(reply, organization);
  }

  /**
   * GET /organizations
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as QueryOrganizationsDTO;
    const { organizations, total } = await organizationService.list(query);

    return sendPaginated(reply, organizations, {
      total,
      limit: query.limit || 20,
      offset: query.offset || 0,
      hasMore: (query.offset || 0) + (query.limit || 20) < total,
    });
  }

  /**
   * PATCH /organizations/:orgId
   */
  async update(request: FastifyRequest, reply: FastifyReply) {
    const { orgId } = request.params as { orgId: string };
    const data = request.body as UpdateOrganizationDTO;

    if (data.slug) {
      const existing = await organizationService.getBySlug(data.slug);
      if (existing && (existing._id?.toString() || existing.id) !== orgId) {
        throw new ConflictError('Organization with this slug already exists');
      }
    }

    const organization = await organizationService.update(orgId, data);

    if (!organization) {
      throw new NotFoundError('Organization');
    }

    return sendSuccess(reply, organization);
  }

  /**
   * DELETE /organizations/:orgId
   */
  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { orgId } = request.params as { orgId: string };
    const deleted = await organizationService.delete(orgId);

    if (!deleted) {
      throw new NotFoundError('Organization');
    }

    return sendDeleted(reply, 'Organization deleted successfully');
  }

  /**
   * GET /organizations/:orgId/stats
   */
  async getStats(request: FastifyRequest, reply: FastifyReply) {
    const { orgId } = request.params as { orgId: string };
    const stats = await organizationService.getStats(orgId);

    if (!stats) {
      throw new NotFoundError('Organization');
    }

    return sendSuccess(reply, stats);
  }
}

export const organizationController = new OrganizationController();
