import type { FastifyRequest, FastifyReply } from 'fastify';
import { applicationService } from '../services/application.service';
import { NotFoundError } from '../lib/errors';
import { sendSuccess, sendCreated, sendPaginated, sendDeleted } from '../lib/response';
import { getRequestContext } from '../lib/request-context';
import type {
  CreateApplicationDTO,
  UpdateApplicationDTO,
  QueryApplicationsDTO,
  ApplicationIdParam,
} from '../schemas/application.schema';

/**
 * ApplicationController
 *
 * HTTP request handlers for application management.
 * Zero try/catch — errors propagate to global error handler.
 */
export class ApplicationController {
  /**
   * POST /applications
   */
  async create(
    request: FastifyRequest<{ Body: CreateApplicationDTO }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const application = await applicationService.create(orgId, request.body);
    return sendCreated(reply, application);
  }

  /**
   * GET /applications/:applicationId
   */
  async getOne(
    request: FastifyRequest<{ Params: ApplicationIdParam }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { applicationId } = request.params;
    const application = await applicationService.getById(orgId, applicationId);

    if (!application) {
      throw new NotFoundError('Application');
    }

    return sendSuccess(reply, application);
  }

  /**
   * GET /applications
   */
  async list(
    request: FastifyRequest<{ Querystring: QueryApplicationsDTO }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const result = await applicationService.list(orgId, request.query);
    return sendPaginated(reply, result.data, result.pagination);
  }

  /**
   * PATCH /applications/:applicationId
   */
  async update(
    request: FastifyRequest<{ Params: ApplicationIdParam; Body: UpdateApplicationDTO }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { applicationId } = request.params;
    const application = await applicationService.update(orgId, applicationId, request.body);

    if (!application) {
      throw new NotFoundError('Application');
    }

    return sendSuccess(reply, application);
  }

  /**
   * DELETE /applications/:applicationId
   */
  async delete(
    request: FastifyRequest<{ Params: ApplicationIdParam }>,
    reply: FastifyReply
  ) {
    const { orgId } = getRequestContext(request);
    const { applicationId } = request.params;
    const application = await applicationService.delete(orgId, applicationId);

    if (!application) {
      throw new NotFoundError('Application');
    }

    return sendDeleted(reply, 'Application deleted successfully');
  }
}

export const applicationController = new ApplicationController();
