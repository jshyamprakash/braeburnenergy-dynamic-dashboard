import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '../models';

/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * Implements EPA-compliant authorization with role hierarchy:
 * SuperAdmin > Admin > Operator > Viewer
 */

/**
 * Role hierarchy levels (higher number = more permissions)
 */
const ROLE_LEVELS: Record<UserRole, number> = {
  SuperAdmin: 4,
  Admin: 3,
  Operator: 2,
  Viewer: 1,
};

/**
 * Permission definitions for each action type
 */
const PERMISSIONS: Record<string, UserRole[]> = {
  // Device management
  'device:create': ['SuperAdmin', 'Admin', 'Operator'],
  'device:read': ['SuperAdmin', 'Admin', 'Operator', 'Viewer'],
  'device:update': ['SuperAdmin', 'Admin', 'Operator'],
  'device:delete': ['SuperAdmin', 'Admin'],

  // Device state (telemetry data)
  'device-state:create': ['SuperAdmin', 'Admin', 'Operator'],
  'device-state:read': ['SuperAdmin', 'Admin', 'Operator', 'Viewer'],
  'device-state:export': ['SuperAdmin', 'Admin', 'Operator'],

  // Organization management
  'organization:create': ['SuperAdmin'],
  'organization:read': ['SuperAdmin', 'Admin'],
  'organization:update': ['SuperAdmin'],
  'organization:delete': ['SuperAdmin'],

  // User management
  'user:create': ['SuperAdmin', 'Admin'],
  'user:read': ['SuperAdmin', 'Admin'],
  'user:update': ['SuperAdmin', 'Admin'],
  'user:delete': ['SuperAdmin'],

  // Audit logs (read-only)
  'audit-log:read': ['SuperAdmin', 'Admin'],
  'audit-log:export': ['SuperAdmin', 'Admin'],

  // Alarm management
  'alarm:create': ['SuperAdmin', 'Admin', 'Operator'],
  'alarm:acknowledge': ['SuperAdmin', 'Admin', 'Operator'],
  'alarm:read': ['SuperAdmin', 'Admin', 'Operator', 'Viewer'],

  // Workflow management
  'workflow:create': ['SuperAdmin', 'Admin'],
  'workflow:read': ['SuperAdmin', 'Admin', 'Operator', 'Viewer'],
  'workflow:update': ['SuperAdmin', 'Admin'],
  'workflow:delete': ['SuperAdmin', 'Admin'],
  'workflow:execute': ['SuperAdmin', 'Admin', 'Operator'],
};

/**
 * Check if user role has permission for an action
 */
function hasPermission(userRole: UserRole, permission: string): boolean {
  const allowedRoles = PERMISSIONS[permission];

  if (!allowedRoles) {
    // If permission is not defined, deny by default
    return false;
  }

  return allowedRoles.includes(userRole);
}

/**
 * Check if user role meets minimum required level
 */
function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[minimumRole];
}

/**
 * Middleware factory - require specific permission
 */
export function requirePermission(permission: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
    }

    const userRole = user.role as UserRole;

    if (!hasPermission(userRole, permission)) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: `Your role (${userRole}) does not have permission for this action`,
        requiredPermission: permission,
      });
    }
  };
}

/**
 * Middleware factory - require minimum role level
 */
export function requireRole(minimumRole: UserRole) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource',
      });
    }

    const userRole = user.role as UserRole;

    if (!hasMinimumRole(userRole, minimumRole)) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: `Minimum role required: ${minimumRole}. Your role: ${userRole}`,
      });
    }
  };
}

/**
 * Middleware - check organization scope
 * Ensures users can only access resources in their organization
 */
export async function requireSameOrganization(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const user = (request as any).user;

  if (!user) {
    return reply.status(401).send({
      success: false,
      error: 'Authentication required',
    });
  }

  // SuperAdmins can access all organizations
  if (user.role === 'SuperAdmin') {
    return;
  }

  // Extract orgId from request (query params or body)
  const requestOrgId =
    (request.query as any)?.orgId ||
    (request.params as any)?.orgId ||
    (request.body as any)?.organizationId;

  if (requestOrgId && requestOrgId !== user.organizationId) {
    return reply.status(403).send({
      success: false,
      error: 'Forbidden',
      message: 'You can only access resources in your organization',
    });
  }
}

/**
 * Helper function to check permissions programmatically
 */
export function checkPermission(userRole: UserRole, permission: string): boolean {
  return hasPermission(userRole, permission);
}

/**
 * Helper function to check role level programmatically
 */
export function checkMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return hasMinimumRole(userRole, minimumRole);
}
