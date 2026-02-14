import { FastifyRequest, FastifyReply } from 'fastify';
import { AuditLog } from '../models';

/**
 * Audit Middleware
 *
 * EPA-compliant audit logging middleware that captures all API operations.
 * Logs CREATE, UPDATE, DELETE, VIEW, and EXPORT actions to the audit_logs collection.
 */

interface AuditContext {
  userId?: string;
  username?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW' | 'EXPORT';
  resource: string;
  resourceId?: string;
}

/**
 * Extracts resource information from request
 */
function extractResourceInfo(request: FastifyRequest): { resource: string; resourceId?: string } {
  const url = request.url.split('?')[0];
  const parts = url.split('/').filter(Boolean);

  // Map routes to resource names
  if (url.includes('/devices')) {
    const deviceId = parts[parts.indexOf('devices') + 1];
    if (url.includes('/states')) {
      return {
        resource: 'DeviceState',
        resourceId: deviceId,
      };
    }
    return {
      resource: 'Device',
      resourceId: deviceId !== 'states' ? deviceId : undefined,
    };
  }

  if (url.includes('/organizations')) {
    return {
      resource: 'Organization',
      resourceId: parts[parts.indexOf('organizations') + 1],
    };
  }

  if (url.includes('/audit-logs')) {
    return {
      resource: 'AuditLog',
      resourceId: parts[parts.indexOf('audit-logs') + 1],
    };
  }

  return { resource: 'Unknown' };
}

/**
 * Maps HTTP methods to audit actions
 */
function mapMethodToAction(method: string, url: string): AuditContext['action'] | null {
  // Skip health checks and swagger docs
  if (url.includes('/health') || url.includes('/docs')) {
    return null;
  }

  // Export actions
  if (url.includes('/export')) {
    return 'EXPORT';
  }

  // Standard CRUD operations
  switch (method) {
    case 'POST':
      if (url.includes('/login')) return 'LOGIN';
      if (url.includes('/logout')) return 'LOGOUT';
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    case 'GET':
      return 'VIEW';
    default:
      return null;
  }
}

/**
 * Audit logging hook
 */
export async function auditMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  // Extract audit context
  const action = mapMethodToAction(request.method, request.url);

  // Skip non-auditable actions
  if (!action) {
    return;
  }

  const { resource, resourceId } = extractResourceInfo(request);

  // Get user info from request (will be populated by auth middleware)
  const user = (request as any).user;
  const userId = user?.id || undefined;
  const username = user?.username || 'anonymous';

  // Capture request body for CREATE/UPDATE actions
  const requestBody = ['CREATE', 'UPDATE'].includes(action) ? request.body : undefined;

  // Store audit context for onResponse hook
  (request as any).auditContext = {
    action,
    resource,
    resourceId,
    userId,
    username,
    requestBody,
  };
}

/**
 * Register audit middleware with Fastify
 */
export function registerAuditMiddleware(fastify: any) {
  // Hook to capture request info
  fastify.addHook('onRequest', auditMiddleware);

  // Hook to create audit log after response is sent
  fastify.addHook('onResponse', async (request: any, reply: any) => {
    const auditContext = request.auditContext;

    // Skip if no audit context (non-auditable request)
    if (!auditContext) {
      return;
    }

    try {
      const { action, resource, resourceId, userId, username, requestBody } = auditContext;
      const success = reply.statusCode < 400;

      // Capture changes for UPDATE actions
      const changes =
        action === 'UPDATE' && requestBody
          ? {
              before: {}, // Will be populated by service layer in the future
              after: requestBody,
            }
          : undefined;

      // Create audit log entry (async, don't await to avoid blocking)
      AuditLog.create({
        userId,
        username,
        action,
        resource,
        resourceId,
        changes,
        metadata: {
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          sessionId: request.session?.id,
          reason: requestBody?.reason, // Optional reason for critical operations
        },
        timestamp: new Date(),
        success,
        errorMessage: !success ? 'Request failed' : undefined,
      }).catch((error) => {
        // Log audit failure but don't block
        request.log.error({ error, action, resource }, 'Failed to create audit log');
      });
    } catch (error) {
      // Silently catch errors to avoid breaking the response
      request.log.error({ error }, 'Audit logging error');
    }
  });
}
