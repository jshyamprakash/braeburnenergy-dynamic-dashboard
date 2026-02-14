import { FastifyRequest, FastifyReply } from 'fastify';
import { ApiKeyService } from '../services/api-key.service';

/**
 * API Key Controller
 *
 * Handles API key management endpoints.
 */

const apiKeyService = new ApiKeyService();

/**
 * Create new API key
 */
export async function create(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const { name, permissions, expiresAt, prefix } = request.body as {
      name: string;
      permissions?: string[];
      expiresAt?: string;
      prefix?: 'iot_live_' | 'iot_test_';
    };

    if (!name) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        message: 'Name is required',
      });
    }

    // Parse expiresAt if provided
    const expiresAtDate = expiresAt ? new Date(expiresAt) : undefined;

    if (expiresAtDate && isNaN(expiresAtDate.getTime())) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        message: 'Invalid expiresAt date format',
      });
    }

    const result = await apiKeyService.create({
      name,
      userId: user.id,
      organizationId: user.organizationId,
      permissions,
      expiresAt: expiresAtDate,
      prefix: prefix || 'iot_test_',
    });

    return reply.status(201).send({
      success: true,
      data: {
        id: result.apiKey._id.toString(),
        name: result.apiKey.name,
        key: result.plainKey, // IMPORTANT: Only shown once
        prefix: result.apiKey.prefix,
        permissions: result.apiKey.permissions,
        expiresAt: result.apiKey.expiresAt,
        createdAt: result.apiKey.createdAt,
      },
      message: 'API key created successfully. Save the key securely - it will not be shown again.',
    });
  } catch (error) {
    request.log.error({ error }, 'Create API key error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create API key',
    });
  }
}

/**
 * List user's API keys
 */
export async function list(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;

    const keys = await apiKeyService.listByUser(user.id);

    return reply.status(200).send({
      success: true,
      data: keys.map(key => ({
        id: key._id.toString(),
        name: key.name,
        prefix: key.prefix,
        permissions: key.permissions,
        expiresAt: key.expiresAt,
        lastUsedAt: key.lastUsedAt,
        isActive: key.isActive,
        createdAt: key.createdAt,
      })),
    });
  } catch (error) {
    request.log.error({ error }, 'List API keys error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to list API keys',
    });
  }
}

/**
 * Get API key by ID
 */
export async function getOne(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const key = await apiKeyService.getById(id);

    if (!key) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'API key not found',
      });
    }

    // Check ownership (users can only access their own keys)
    if (key.userId.toString() !== user.id && user.role !== 'SuperAdmin') {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'You can only access your own API keys',
      });
    }

    return reply.status(200).send({
      success: true,
      data: {
        id: key._id.toString(),
        name: key.name,
        prefix: key.prefix,
        permissions: key.permissions,
        expiresAt: key.expiresAt,
        lastUsedAt: key.lastUsedAt,
        isActive: key.isActive,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Get API key error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve API key',
    });
  }
}

/**
 * Update API key
 */
export async function update(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const { id } = request.params as { id: string };
    const { name, permissions, expiresAt } = request.body as {
      name?: string;
      permissions?: string[];
      expiresAt?: string;
    };

    const existingKey = await apiKeyService.getById(id);

    if (!existingKey) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'API key not found',
      });
    }

    // Check ownership
    if (existingKey.userId.toString() !== user.id && user.role !== 'SuperAdmin') {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'You can only update your own API keys',
      });
    }

    // Parse expiresAt if provided
    const expiresAtDate = expiresAt ? new Date(expiresAt) : undefined;

    if (expiresAtDate && isNaN(expiresAtDate.getTime())) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        message: 'Invalid expiresAt date format',
      });
    }

    const updatedKey = await apiKeyService.update(id, {
      name,
      permissions,
      expiresAt: expiresAtDate,
    });

    return reply.status(200).send({
      success: true,
      data: {
        id: updatedKey!._id.toString(),
        name: updatedKey!.name,
        prefix: updatedKey!.prefix,
        permissions: updatedKey!.permissions,
        expiresAt: updatedKey!.expiresAt,
        lastUsedAt: updatedKey!.lastUsedAt,
        isActive: updatedKey!.isActive,
        updatedAt: updatedKey!.updatedAt,
      },
      message: 'API key updated successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Update API key error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update API key',
    });
  }
}

/**
 * Revoke API key
 */
export async function revoke(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const existingKey = await apiKeyService.getById(id);

    if (!existingKey) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'API key not found',
      });
    }

    // Check ownership
    if (existingKey.userId.toString() !== user.id && user.role !== 'SuperAdmin') {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'You can only revoke your own API keys',
      });
    }

    await apiKeyService.revoke(id);

    return reply.status(200).send({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Revoke API key error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to revoke API key',
    });
  }
}

/**
 * Delete API key permanently
 */
export async function deleteKey(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const existingKey = await apiKeyService.getById(id);

    if (!existingKey) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'API key not found',
      });
    }

    // Check ownership
    if (existingKey.userId.toString() !== user.id && user.role !== 'SuperAdmin') {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'You can only delete your own API keys',
      });
    }

    await apiKeyService.delete(id);

    return reply.status(200).send({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Delete API key error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete API key',
    });
  }
}

/**
 * Rotate API key (generate new key)
 */
export async function rotate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const existingKey = await apiKeyService.getById(id);

    if (!existingKey) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'API key not found',
      });
    }

    // Check ownership
    if (existingKey.userId.toString() !== user.id && user.role !== 'SuperAdmin') {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'You can only rotate your own API keys',
      });
    }

    const result = await apiKeyService.rotate(id);

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'API key not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: {
        id: result.apiKey._id.toString(),
        name: result.apiKey.name,
        key: result.plainKey, // IMPORTANT: Only shown once
        prefix: result.apiKey.prefix,
        permissions: result.apiKey.permissions,
        expiresAt: result.apiKey.expiresAt,
      },
      message: 'API key rotated successfully. Save the new key securely - it will not be shown again.',
    });
  } catch (error) {
    request.log.error({ error }, 'Rotate API key error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to rotate API key',
    });
  }
}
