import { FastifyInstance } from 'fastify';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

/**
 * Authentication Routes
 *
 * Handles user authentication, registration, and profile management.
 */

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /auth/login
   * Authenticate user with username and password
   */
  fastify.post(
    '/auth/login',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Login with username and password',
        description: 'Authenticate user and receive JWT token',
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', description: 'Username (e.g., admin)' },
            password: { type: 'string', description: 'Password (e.g., SecurePass123!)' },
          },
        },
        response: {
          200: {
            description: 'Login successful',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      username: { type: 'string' },
                      email: { type: 'string' },
                      role: { type: 'string', enum: ['SuperAdmin', 'Admin', 'Operator', 'Viewer'] },
                      organizationId: { type: 'string' },
                    },
                  },
                  accessToken: { type: 'string', description: 'JWT access token (15 min expiry)' },
                  refreshToken: { type: 'string', description: 'JWT refresh token (7 days expiry)' },
                },
              },
            },
          },
          401: {
            description: 'Invalid credentials or account locked',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    authController.login
  );

  /**
   * POST /auth/logout
   * Logout current user (client-side token invalidation)
   */
  fastify.post(
    '/auth/logout',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Logout current user',
        description: 'Logout user (client-side token invalidation)',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Logout successful',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: requireAuth,
    },
    authController.logout
  );

  /**
   * POST /auth/register
   * Register new user (SuperAdmin or Admin only)
   */
  fastify.post(
    '/auth/register',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Register new user',
        description: 'Create new user account (SuperAdmin or Admin only)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['username', 'email', 'password', 'role', 'organizationId'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 50, description: 'Username (e.g., operator1)' },
            email: { type: 'string', format: 'email', description: 'Email address (e.g., operator1@example.com)' },
            password: {
              type: 'string',
              minLength: 8,
              description: 'Must contain uppercase, lowercase, number, and special character (e.g., SecurePass123!)',
            },
            role: {
              type: 'string',
              enum: ['SuperAdmin', 'Admin', 'Operator', 'Viewer'],
              description: 'User role (e.g., Operator)',
            },
            organizationId: { type: 'string', description: 'Organization ID (e.g., aaaaaaaaaaaaaaaaaaaaaaaa)' },
          },
        },
        response: {
          201: {
            description: 'User created successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  organizationId: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
          409: {
            description: 'Username or email already exists',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('user:create')],
    },
    authController.register
  );

  /**
   * GET /auth/profile
   * Get current user profile
   */
  fastify.get(
    '/auth/profile',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Get current user profile',
        description: 'Retrieve authenticated user profile information',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'User profile retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                  role: { type: 'string' },
                  organizationId: { type: 'string' },
                  isActive: { type: 'boolean' },
                  mustChangePassword: { type: 'boolean' },
                  lastLogin: { type: 'string', format: 'date-time', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
      preHandler: requireAuth,
    },
    authController.getProfile
  );

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  fastify.post(
    '/auth/refresh',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Refresh access token',
        description: 'Get new access token and refresh token using a valid refresh token',
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', description: 'Refresh token from login response' },
          },
        },
        response: {
          200: {
            description: 'Token refreshed successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string', description: 'New JWT access token (15 min expiry)' },
                  refreshToken: { type: 'string', description: 'New refresh token (7 days expiry)' },
                },
              },
              message: { type: 'string' },
            },
          },
          401: {
            description: 'Invalid or expired refresh token',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    authController.refreshToken
  );

  /**
   * POST /auth/change-password
   * Change user password
   */
  fastify.post(
    '/auth/change-password',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Change user password',
        description: 'Change authenticated user password (EPA-compliant password policy)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', description: 'Current password (e.g., OldPass123!)' },
            newPassword: {
              type: 'string',
              minLength: 8,
              description: 'Must contain uppercase, lowercase, number, and special character (e.g., NewSecurePass456!)',
            },
          },
        },
        response: {
          200: {
            description: 'Password changed successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string' },
            },
          },
          401: {
            description: 'Current password is incorrect',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: requireAuth,
    },
    authController.changePassword
  );

  /**
   * GET /auth/users
   * List users (SuperAdmin and Admin only)
   */
  fastify.get(
    '/auth/users',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'List users',
        description: 'List all users in organization (SuperAdmin and Admin only)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            organizationId: {
              type: 'string',
              description: 'Organization ID (SuperAdmin can query any org)',
            },
          },
        },
        response: {
          200: {
            description: 'Users retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    username: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string' },
                    organizationId: { type: 'string' },
                    isActive: { type: 'boolean' },
                    lastLogin: { type: 'string', format: 'date-time', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('user:read')],
    },
    authController.listUsers
  );

  /**
   * GET /auth/sessions
   * Get active sessions for current user
   */
  fastify.get(
    '/auth/sessions',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Get active sessions',
        description: 'List all active token sessions for the authenticated user',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Active sessions retrieved successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    jti: { type: 'string', description: 'Token ID' },
                    type: { type: 'string', enum: ['access', 'refresh'] },
                    createdAt: { type: 'string', format: 'date-time' },
                    expiresAt: { type: 'string', format: 'date-time' },
                    ipAddress: { type: 'string', nullable: true },
                    userAgent: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      preHandler: requireAuth,
    },
    authController.getActiveSessions
  );

  /**
   * POST /auth/logout-all
   * Logout from all devices (revoke all tokens)
   */
  fastify.post(
    '/auth/logout-all',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Logout from all devices',
        description: 'Revoke all active tokens for the authenticated user (logout from all devices)',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Logged out from all devices successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Logged out from all devices successfully' },
            },
          },
        },
      },
      preHandler: requireAuth,
    },
    authController.logoutAll
  );
}
