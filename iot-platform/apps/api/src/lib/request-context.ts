/**
 * Request context helpers
 *
 * Eliminates DEFAULT_ORG_ID/DEFAULT_USER_ID hardcoding across 5 controllers
 * and replaces (request as any).user casts everywhere.
 *
 * POC compatibility: when request.user is undefined, falls back to POC defaults.
 * This means zero behavioural change until MVP auth is wired end-to-end.
 */

import type { FastifyRequest } from 'fastify';

/**
 * POC defaults — single source of truth, replaces 38 per-file duplicates
 */
export const POC_DEFAULT_ORG_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
export const POC_DEFAULT_USER_ID = 'admin-user';

/**
 * Typed user attached to request by auth middleware
 */
export interface RequestUser {
  id: string;
  username: string;
  email: string;
  role: string;
  organizationId: string;
  authType: 'jwt' | 'api_key';
  apiKeyPermissions?: string[];
}

/**
 * Augment FastifyRequest to carry typed user (and server extensions)
 * Import this file from index.ts to activate the augmentation globally.
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: RequestUser;
  }
  interface FastifyInstance {
    io: import('socket.io').Server;
    triggerDispatcher: import('../services/workflow-trigger-dispatcher.service').WorkflowTriggerDispatcher;
  }
}

/**
 * Extract org + user context from a request.
 * Falls back to POC defaults when user is not authenticated
 * (keeps POC routes working without breaking auth-protected paths).
 */
export function getRequestContext(request: FastifyRequest): {
  orgId: string;
  userId: string;
  role: string;
} {
  if (request.user) {
    return {
      orgId: request.user.organizationId,
      userId: request.user.id,
      role: request.user.role,
    };
  }

  // POC fallback — non-auth routes continue to work
  return {
    orgId: POC_DEFAULT_ORG_ID,
    userId: POC_DEFAULT_USER_ID,
    role: 'Admin',
  };
}
