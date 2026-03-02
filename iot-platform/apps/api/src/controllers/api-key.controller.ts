import type { FastifyRequest, FastifyReply } from 'fastify';
import { ApiKeyService } from '../services/api-key.service';
import { NotFoundError, ForbiddenError, BadRequestError } from '../lib/errors';
import { sendSuccess, sendCreated, sendDeleted } from '../lib/response';
import { getRequestContext } from '../lib/request-context';

const apiKeyService = new ApiKeyService();

/**
 * ApiKeyController
 *
 * HTTP request handlers for API key management.
 * Converted from standalone functions to class for consistency.
 * Zero try/catch — errors propagate to global error handler.
 */
export class ApiKeyController {
  /**
   * POST /api-keys
   */
  async create(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = getRequestContext(request);
    const user = request.user as any;
    const { name, permissions, expiresAt, prefix } = request.body as {
      name: string;
      permissions?: string[];
      expiresAt?: string;
      prefix?: 'iot_live_' | 'iot_test_';
    };

    if (!name) {
      throw new BadRequestError('Name is required');
    }

    const expiresAtDate = expiresAt ? new Date(expiresAt) : undefined;
    if (expiresAtDate && isNaN(expiresAtDate.getTime())) {
      throw new BadRequestError('Invalid expiresAt date format');
    }

    const organizationId = user?.organizationId ?? (request.body as any)?.organizationId;
    const result = await apiKeyService.create({
      name,
      userId,
      organizationId,
      permissions,
      expiresAt: expiresAtDate,
      prefix: prefix || 'iot_test_',
    });

    return sendCreated(reply, {
      id: result.apiKey._id.toString(),
      name: result.apiKey.name,
      key: result.plainKey, // IMPORTANT: Only shown once
      prefix: result.apiKey.prefix,
      permissions: result.apiKey.permissions,
      expiresAt: result.apiKey.expiresAt,
      createdAt: result.apiKey.createdAt,
    });
  }

  /**
   * GET /api-keys
   */
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = getRequestContext(request);
    const keys = await apiKeyService.listByUser(userId);
    return sendSuccess(reply, keys.map(key => ({
      id: key._id.toString(),
      name: key.name,
      prefix: key.prefix,
      permissions: key.permissions,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      isActive: key.isActive,
      createdAt: key.createdAt,
    })));
  }

  /**
   * GET /api-keys/:id
   */
  async getOne(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = getRequestContext(request);
    const { id } = request.params as { id: string };
    const key = await apiKeyService.getById(id);

    if (!key) {
      throw new NotFoundError('API key');
    }

    const role = request.user?.role;
    if (key.userId.toString() !== userId && role !== 'SuperAdmin') {
      throw new ForbiddenError('You can only access your own API keys');
    }

    return sendSuccess(reply, {
      id: key._id.toString(),
      name: key.name,
      prefix: key.prefix,
      permissions: key.permissions,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      isActive: key.isActive,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    });
  }

  /**
   * PATCH /api-keys/:id
   */
  async update(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = getRequestContext(request);
    const { id } = request.params as { id: string };
    const { name, permissions, expiresAt } = request.body as {
      name?: string;
      permissions?: string[];
      expiresAt?: string;
    };

    const existingKey = await apiKeyService.getById(id);
    if (!existingKey) {
      throw new NotFoundError('API key');
    }

    const role = request.user?.role;
    if (existingKey.userId.toString() !== userId && role !== 'SuperAdmin') {
      throw new ForbiddenError('You can only update your own API keys');
    }

    const expiresAtDate = expiresAt ? new Date(expiresAt) : undefined;
    if (expiresAtDate && isNaN(expiresAtDate.getTime())) {
      throw new BadRequestError('Invalid expiresAt date format');
    }

    const updatedKey = await apiKeyService.update(id, { name, permissions, expiresAt: expiresAtDate });

    return sendSuccess(reply, {
      id: updatedKey!._id.toString(),
      name: updatedKey!.name,
      prefix: updatedKey!.prefix,
      permissions: updatedKey!.permissions,
      expiresAt: updatedKey!.expiresAt,
      lastUsedAt: updatedKey!.lastUsedAt,
      isActive: updatedKey!.isActive,
      updatedAt: updatedKey!.updatedAt,
    });
  }

  /**
   * POST /api-keys/:id/revoke
   */
  async revoke(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = getRequestContext(request);
    const { id } = request.params as { id: string };
    const existingKey = await apiKeyService.getById(id);

    if (!existingKey) {
      throw new NotFoundError('API key');
    }

    const role = request.user?.role;
    if (existingKey.userId.toString() !== userId && role !== 'SuperAdmin') {
      throw new ForbiddenError('You can only revoke your own API keys');
    }

    await apiKeyService.revoke(id);
    return sendSuccess(reply, null);
  }

  /**
   * DELETE /api-keys/:id
   */
  async deleteKey(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = getRequestContext(request);
    const { id } = request.params as { id: string };
    const existingKey = await apiKeyService.getById(id);

    if (!existingKey) {
      throw new NotFoundError('API key');
    }

    const role = request.user?.role;
    if (existingKey.userId.toString() !== userId && role !== 'SuperAdmin') {
      throw new ForbiddenError('You can only delete your own API keys');
    }

    await apiKeyService.delete(id);
    return sendDeleted(reply, 'API key deleted successfully');
  }

  /**
   * POST /api-keys/:id/rotate
   */
  async rotate(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = getRequestContext(request);
    const { id } = request.params as { id: string };
    const existingKey = await apiKeyService.getById(id);

    if (!existingKey) {
      throw new NotFoundError('API key');
    }

    const role = request.user?.role;
    if (existingKey.userId.toString() !== userId && role !== 'SuperAdmin') {
      throw new ForbiddenError('You can only rotate your own API keys');
    }

    const result = await apiKeyService.rotate(id);
    if (!result) {
      throw new NotFoundError('API key');
    }

    return sendSuccess(reply, {
      id: result.apiKey._id.toString(),
      name: result.apiKey.name,
      key: result.plainKey, // IMPORTANT: Only shown once
      prefix: result.apiKey.prefix,
      permissions: result.apiKey.permissions,
      expiresAt: result.apiKey.expiresAt,
    });
  }
}

export const apiKeyController = new ApiKeyController();

// Legacy named function exports — kept for backward compat with existing route registrations
export const create = (req: FastifyRequest, reply: FastifyReply) => apiKeyController.create(req, reply);
export const list = (req: FastifyRequest, reply: FastifyReply) => apiKeyController.list(req, reply);
export const getOne = (req: FastifyRequest, reply: FastifyReply) => apiKeyController.getOne(req, reply);
export const update = (req: FastifyRequest, reply: FastifyReply) => apiKeyController.update(req, reply);
export const revoke = (req: FastifyRequest, reply: FastifyReply) => apiKeyController.revoke(req, reply);
export const deleteKey = (req: FastifyRequest, reply: FastifyReply) => apiKeyController.deleteKey(req, reply);
export const rotate = (req: FastifyRequest, reply: FastifyReply) => apiKeyController.rotate(req, reply);
