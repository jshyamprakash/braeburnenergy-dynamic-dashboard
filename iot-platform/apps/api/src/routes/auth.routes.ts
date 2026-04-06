import { FastifyInstance } from 'fastify';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission, requireSuperAdmin } from '../middleware/rbac.middleware';

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

  /**
   * PATCH /auth/users/:userId
   * Update user role, active status, or unlock account (Admin+)
   */
  fastify.patch(
    '/auth/users/:userId',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Update user',
        description: 'Update user role, active status, or unlock account. Admin cannot assign SuperAdmin role.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', description: 'User MongoDB ObjectId' },
          },
        },
        body: {
          type: 'object',
          properties: {
            role: {
              type: 'string',
              enum: ['SuperAdmin', 'Admin', 'Operator', 'Viewer'],
              description: 'New role to assign',
            },
            isActive: { type: 'boolean', description: 'Enable or disable the account' },
            unlock: { type: 'boolean', description: 'Clear failed login attempts and account lock' },
          },
        },
        response: {
          200: {
            description: 'User updated successfully',
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
                  isActive: { type: 'boolean' },
                  failedLoginAttempts: { type: 'number' },
                  lockedUntil: { type: 'string', nullable: true },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('user:update')],
    },
    authController.updateUser
  );

  // ── ADR-052: Passphrase-Derived Keypair Auth ──────────────────────────────

  /**
   * GET /auth/superadmin/challenge
   * Issue a one-time challenge for SuperAdmin login (public).
   */
  fastify.get(
    '/auth/superadmin/challenge',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'SuperAdmin: get login challenge (ADR-052)',
        description: 'Returns a one-time challenge. Browser derives RSA keypair from passphrase and signs the challenge.',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  challengeId: { type: 'string' },
                  challenge: { type: 'string' },
                  expiresAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    authController.superAdminChallenge
  );

  /**
   * POST /auth/superadmin/login
   * Verify RSA-PSS signature → issue JWT (public).
   */
  fastify.post(
    '/auth/superadmin/login',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'SuperAdmin: passphrase-derived login (ADR-052)',
        body: {
          type: 'object',
          required: ['challengeId', 'signature'],
          properties: {
            challengeId: { type: 'string' },
            signature: { type: 'string', description: 'Base64 RSA-PSS SHA-256 signature of challenge bytes' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  refreshToken: { type: 'string' },
                  user: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
      },
    },
    authController.superAdminLogin
  );

  /**
   * POST /auth/recovery/setup
   * Authenticated Admin stores recoveryPublicKey for future self-recovery.
   */
  fastify.post(
    '/auth/recovery/setup',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Admin: store recovery public key (ADR-052)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['publicKey'],
          properties: {
            publicKey: { type: 'string', description: 'PEM public key derived from recovery passphrase' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', properties: { message: { type: 'string' } } },
            },
          },
        },
      },
      preHandler: [requireAuth],
    },
    authController.recoverySetup
  );

  /**
   * GET /auth/recovery/challenge
   * Issue challenge for Admin self-recovery (public — user is locked out).
   */
  fastify.get(
    '/auth/recovery/challenge',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Admin: get recovery challenge (ADR-052)',
        querystring: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', description: 'MongoDB ObjectId of the Admin to recover' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  challengeId: { type: 'string' },
                  challenge: { type: 'string' },
                  expiresAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    authController.recoveryChallenge
  );

  /**
   * POST /auth/recovery/redeem
   * Verify recovery signature → reset Admin password (public).
   */
  fastify.post(
    '/auth/recovery/redeem',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Admin: redeem recovery — reset password (ADR-052)',
        body: {
          type: 'object',
          required: ['userId', 'challengeId', 'signature', 'newPassword'],
          properties: {
            userId: { type: 'string' },
            challengeId: { type: 'string' },
            signature: { type: 'string', description: 'Base64 RSA-PSS SHA-256 signature of challenge bytes' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', properties: { message: { type: 'string' } } },
            },
          },
        },
      },
    },
    authController.recoveryRedeem
  );

  // ── ADR-054: SA-Authorized Admin Recovery ────────────────────────────────

  /**
   * GET /auth/recovery/sa-challenge?username=...
   * Public — Admin is locked out, cannot authenticate.
   * Returns userId, challengeId, challenge hex, and short 8-char recovery token.
   */
  fastify.get(
    '/auth/recovery/sa-challenge',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Admin: get SA-authorized recovery challenge (ADR-054)',
        querystring: {
          type: 'object',
          required: ['username'],
          properties: { username: { type: 'string' } },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  userId:        { type: 'string' },
                  challengeId:   { type: 'string' },
                  challenge:     { type: 'string' },
                  recoveryToken: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    authController.saRecoveryChallenge
  );

  /**
   * POST /auth/recovery/sa-redeem
   * Public — verify SA RSA-PSS signature over challenge → reset Admin password.
   */
  fastify.post(
    '/auth/recovery/sa-redeem',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Admin: redeem SA-authorized recovery (ADR-054)',
        body: {
          type: 'object',
          required: ['userId', 'challengeId', 'signature', 'newPassword'],
          properties: {
            userId:      { type: 'string' },
            challengeId: { type: 'string' },
            signature:   { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', properties: { message: { type: 'string' } } },
            },
          },
        },
      },
    },
    authController.saRecoveryRedeem
  );

  /**
   * POST /auth/admin/create
   * Create single primary Admin account with temp password (SuperAdmin only).
   */
  fastify.post(
    '/auth/admin/create',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Create primary Admin account (SuperAdmin only)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['username', 'email'],
          properties: {
            username: { type: 'string', minLength: 3 },
            email: { type: 'string', format: 'email' },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: { tempPassword: { type: 'string' } },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requireSuperAdmin],
    },
    authController.createPrimaryAdmin
  );

  /**
   * POST /auth/admin/reset-password
   * Reset primary Admin password → new temp password (SuperAdmin only).
   */
  fastify.post(
    '/auth/admin/reset-password',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Reset primary Admin password (SuperAdmin only)',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  tempPassword: { type: 'string' },
                  username: { type: 'string' },
                  email: { type: 'string' },
                },
              },
            },
          },
        },
      },
      preHandler: [requireAuth, requireSuperAdmin],
    },
    authController.resetAdminPassword
  );

  /**
   * PUT /auth/superadmin/rotate-public-key (ADR-053)
   * Store a new SuperAdmin public key in MongoDB, overriding the Docker-baked env var.
   * Takes effect immediately on next login attempt. Current sessions remain valid.
   */
  fastify.put(
    '/auth/superadmin/rotate-public-key',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Rotate SuperAdmin public key (ADR-053)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['publicKeyPem'],
          properties: {
            publicKeyPem: { type: 'string', description: 'PEM-encoded RSA public key' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object', properties: { success: { type: 'boolean' } } },
            },
          },
        },
      },
      preHandler: [requireAuth, requireSuperAdmin],
    },
    authController.rotateSuperAdminPublicKey
  );

  /**
   * DELETE /auth/users/:userId
   * Hard-delete a user account (SuperAdmin only)
   */
  fastify.delete(
    '/auth/users/:userId',
    {
      schema: {
        tags: ['Authentication'],
        summary: 'Delete user',
        description: 'Permanently delete a user account and revoke all their tokens. SuperAdmin only. Cannot delete own account.',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', description: 'User MongoDB ObjectId' },
          },
        },
        response: {
          200: {
            description: 'User deleted successfully',
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string' },
            },
          },
        },
      },
      preHandler: [requireAuth, requirePermission('user:delete')],
    },
    authController.deleteUser
  );
}
