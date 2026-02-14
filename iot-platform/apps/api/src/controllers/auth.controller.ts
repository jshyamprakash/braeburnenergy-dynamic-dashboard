import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models';

/**
 * Authentication Controller
 *
 * Handles user authentication, registration, and session management.
 */

const authService = new AuthService();

/**
 * Login user with username and password
 */
export async function login(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { username, password } = request.body as { username: string; password: string };

    if (!username || !password) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        message: 'Username and password are required',
      });
    }

    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await authService.login(username, password, ipAddress, userAgent);

    if (!result.success) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication failed',
        message: result.message,
      });
    }

    return reply.status(200).send({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Login error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: (error as Error).message,
    });
  }
}

/**
 * Logout user (invalidate refresh token)
 */
export async function logout(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    // Invalidate refresh token
    await authService.logout(user.id);

    return reply.status(200).send({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Logout error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to logout',
    });
  }
}

/**
 * Register new user (SuperAdmin or Admin only)
 */
export async function register(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { username, email, password, role, organizationId } = request.body as {
      username: string;
      email: string;
      password: string;
      role: UserRole;
      organizationId: string;
    };

    // Validate required fields
    if (!username || !email || !password || !role || !organizationId) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        message: 'All fields are required',
      });
    }

    // Validate role
    const validRoles: UserRole[] = ['SuperAdmin', 'Admin', 'Operator', 'Viewer'];
    if (!validRoles.includes(role)) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
      });
    }

    const user = await authService.createUser(username, email, password, role, organizationId);

    return reply.status(201).send({
      success: true,
      data: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId.toString(),
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Registration error');

    const errorMessage = (error as Error).message;

    // Handle duplicate username/email errors
    if (errorMessage.includes('already exists')) {
      return reply.status(409).send({
        success: false,
        error: 'Conflict',
        message: errorMessage,
      });
    }

    // Handle password validation errors
    if (errorMessage.includes('Password must')) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        message: errorMessage,
      });
    }

    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create user',
    });
  }
}

/**
 * Get current user profile
 */
export async function getProfile(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    const userProfile = await authService.getUserById(user.id);

    if (!userProfile) {
      return reply.status(404).send({
        success: false,
        error: 'Not found',
        message: 'User not found',
      });
    }

    return reply.status(200).send({
      success: true,
      data: {
        id: userProfile._id.toString(),
        username: userProfile.username,
        email: userProfile.email,
        role: userProfile.role,
        organizationId: userProfile.organizationId.toString(),
        isActive: userProfile.isActive,
        mustChangePassword: userProfile.mustChangePassword,
        lastLogin: userProfile.lastLogin,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
      },
    });
  } catch (error) {
    request.log.error({ error }, 'Get profile error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve user profile',
    });
  }
}

/**
 * Change password
 */
export async function changePassword(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const { currentPassword, newPassword } = request.body as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        message: 'Current password and new password are required',
      });
    }

    await authService.changePassword(user.id, currentPassword, newPassword);

    return reply.status(200).send({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Change password error');

    const errorMessage = (error as Error).message;

    if (errorMessage.includes('incorrect')) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication failed',
        message: errorMessage,
      });
    }

    if (errorMessage.includes('Password must')) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        message: errorMessage,
      });
    }

    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to change password',
    });
  }
}

/**
 * Refresh access token
 */
export async function refreshToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { refreshToken } = request.body as { refreshToken: string };

    if (!refreshToken) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        message: 'Refresh token is required',
      });
    }

    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    const result = await authService.refreshAccessToken(refreshToken, ipAddress, userAgent);

    if (!result) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid or expired refresh token',
      });
    }

    return reply.status(200).send({
      success: true,
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      message: 'Access token refreshed successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Refresh token error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to refresh token',
    });
  }
}

/**
 * Get active sessions for current user
 */
export async function getActiveSessions(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    const sessions = await authService.getActiveSessions(user.id);

    return reply.status(200).send({
      success: true,
      data: sessions.map((session: any) => ({
        jti: session.jti,
        type: session.type,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      })),
    });
  } catch (error) {
    request.log.error({ error }, 'Get sessions error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve sessions',
    });
  }
}

/**
 * Logout from all devices (revoke all tokens)
 */
export async function logoutAll(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
      });
    }

    // Revoke all user tokens
    await authService.logout(user.id);

    return reply.status(200).send({
      success: true,
      message: 'Logged out from all devices successfully',
    });
  } catch (error) {
    request.log.error({ error }, 'Logout all error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to logout from all devices',
    });
  }
}

/**
 * List users (SuperAdmin and Admin only)
 */
export async function listUsers(request: FastifyRequest, reply: FastifyReply) {
  try {
    const user = (request as any).user;
    const { organizationId } = request.query as { organizationId?: string };

    // Determine which organizationId to use
    let targetOrgId = organizationId;

    // Non-SuperAdmins can only list users in their organization
    if (user.role !== 'SuperAdmin') {
      targetOrgId = user.organizationId;
    }

    if (!targetOrgId) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        message: 'organizationId is required',
      });
    }

    const users = await authService.listUsers(targetOrgId);

    return reply.status(200).send({
      success: true,
      data: users.map((u) => ({
        id: u._id.toString(),
        username: u.username,
        email: u.email,
        role: u.role,
        organizationId: u.organizationId.toString(),
        isActive: u.isActive,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    request.log.error({ error }, 'List users error');
    return reply.status(500).send({
      success: false,
      error: 'Internal server error',
      message: 'Failed to list users',
    });
  }
}
