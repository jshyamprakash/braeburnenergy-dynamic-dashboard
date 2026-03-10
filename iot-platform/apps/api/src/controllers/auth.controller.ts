import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';
import type { UserRole } from '../models';
import { BadRequestError, UnauthorizedError, NotFoundError, UnprocessableError } from '../lib/errors';
import { sendSuccess, sendCreated } from '../lib/response';
import { getRequestContext } from '../lib/request-context';

const authService = new AuthService();

/**
 * AuthController
 *
 * User authentication, registration, and session management.
 * Zero try/catch — errors propagate to global error handler.
 */
export class AuthController {
  /**
   * POST /auth/login
   */
  async login(request: FastifyRequest, reply: FastifyReply) {
    const { username, password } = request.body as { username: string; password: string };

    if (!username || !password) {
      throw new BadRequestError('Username and password are required');
    }

    const result = await authService.login(username, password, request.ip, request.headers['user-agent']);

    if (!result.success) {
      throw new UnauthorizedError(result.message || 'Authentication failed');
    }

    return sendSuccess(reply, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  /**
   * POST /auth/logout
   */
  async logout(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = getRequestContext(request);
    await authService.logout(userId);
    return sendSuccess(reply, { message: 'Logged out successfully' });
  }

  /**
   * POST /auth/register
   */
  async register(request: FastifyRequest, reply: FastifyReply) {
    const { username, email, password, role, organizationId } = request.body as {
      username: string;
      email: string;
      password: string;
      role: UserRole;
      organizationId: string;
    };

    if (!username || !email || !password || !role || !organizationId) {
      throw new BadRequestError('All fields are required');
    }

    const validRoles: UserRole[] = ['SuperAdmin', 'Admin', 'Operator', 'Viewer'];
    if (!validRoles.includes(role)) {
      throw new BadRequestError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    const user = await authService.createUser(username, email, password, role, organizationId);

    return sendCreated(reply, {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString(),
      createdAt: user.createdAt,
    });
  }

  /**
   * GET /auth/profile
   */
  async getProfile(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = getRequestContext(request);
    const userProfile = await authService.getUserById(userId);

    if (!userProfile) {
      throw new NotFoundError('User');
    }

    return sendSuccess(reply, {
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
    });
  }

  /**
   * POST /auth/change-password
   */
  async changePassword(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = getRequestContext(request);
    const { currentPassword, newPassword } = request.body as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Current password and new password are required');
    }

    await authService.changePassword(userId, currentPassword, newPassword);
    return sendSuccess(reply, { message: 'Password changed successfully' });
  }

  /**
   * POST /auth/refresh
   */
  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    const { refreshToken } = request.body as { refreshToken: string };

    if (!refreshToken) {
      throw new BadRequestError('Refresh token is required');
    }

    const result = await authService.refreshAccessToken(refreshToken, request.ip, request.headers['user-agent']);

    if (!result) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    return sendSuccess(reply, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  }

  /**
   * GET /auth/sessions
   */
  async getActiveSessions(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = getRequestContext(request);
    const sessions = await authService.getActiveSessions(userId);

    return sendSuccess(reply, sessions.map((session: any) => ({
      jti: session.jti,
      type: session.type,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    })));
  }

  /**
   * POST /auth/logout-all
   */
  async logoutAll(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = getRequestContext(request);
    await authService.logout(userId);
    return sendSuccess(reply, { message: 'Logged out from all devices successfully' });
  }

  /**
   * PATCH /auth/users/:userId
   */
  async updateUser(request: FastifyRequest, reply: FastifyReply) {
    const { userId: actorId } = getRequestContext(request);
    const actorRole = (request.user as any)?.role as UserRole;
    const { userId: targetUserId } = request.params as { userId: string };
    const { role, isActive, unlock } = request.body as {
      role?: UserRole;
      isActive?: boolean;
      unlock?: boolean;
    };

    if (role === undefined && isActive === undefined && unlock === undefined) {
      throw new BadRequestError('At least one of role, isActive, or unlock must be provided');
    }

    try {
      const updated = await authService.updateUser(actorId, actorRole, targetUserId, { role, isActive, unlock });
      return sendSuccess(reply, {
        id: updated._id.toString(),
        username: updated.username,
        email: updated.email,
        role: updated.role,
        isActive: updated.isActive,
        failedLoginAttempts: updated.failedLoginAttempts,
        lockedUntil: updated.lockedUntil,
        updatedAt: updated.updatedAt,
      });
    } catch (err: any) {
      if (err.message === 'User not found') throw new NotFoundError('User');
      throw new UnprocessableError(err.message);
    }
  }

  /**
   * DELETE /auth/users/:userId
   */
  async deleteUser(request: FastifyRequest, reply: FastifyReply) {
    const { userId: actorId } = getRequestContext(request);
    const { userId: targetUserId } = request.params as { userId: string };

    try {
      await authService.deleteUser(actorId, targetUserId);
      return sendSuccess(reply, { message: 'User deleted successfully' });
    } catch (err: any) {
      if (err.message === 'User not found') throw new NotFoundError('User');
      throw new UnprocessableError(err.message);
    }
  }

  /**
   * GET /auth/users
   */
  async listUsers(request: FastifyRequest, reply: FastifyReply) {
    const { orgId } = getRequestContext(request);
    const user = request.user;
    const { organizationId } = request.query as { organizationId?: string };

    // Non-SuperAdmin: always scoped to their own org (from JWT)
    // SuperAdmin: use provided organizationId param, fallback to their own org
    const targetOrgId = user?.role !== 'SuperAdmin'
      ? orgId
      : (organizationId || orgId);

    if (!targetOrgId) {
      throw new BadRequestError('organizationId is required');
    }

    const users = await authService.listUsers(targetOrgId);

    return sendSuccess(reply, users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      email: u.email,
      role: u.role,
      organizationId: u.organizationId.toString(),
      isActive: u.isActive,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
    })));
  }
}

export const authController = new AuthController();

// Legacy named function exports
export const login = (req: FastifyRequest, reply: FastifyReply) => authController.login(req, reply);
export const logout = (req: FastifyRequest, reply: FastifyReply) => authController.logout(req, reply);
export const register = (req: FastifyRequest, reply: FastifyReply) => authController.register(req, reply);
export const getProfile = (req: FastifyRequest, reply: FastifyReply) => authController.getProfile(req, reply);
export const changePassword = (req: FastifyRequest, reply: FastifyReply) => authController.changePassword(req, reply);
export const refreshToken = (req: FastifyRequest, reply: FastifyReply) => authController.refreshToken(req, reply);
export const getActiveSessions = (req: FastifyRequest, reply: FastifyReply) => authController.getActiveSessions(req, reply);
export const logoutAll = (req: FastifyRequest, reply: FastifyReply) => authController.logoutAll(req, reply);
export const listUsers = (req: FastifyRequest, reply: FastifyReply) => authController.listUsers(req, reply);
export const updateUser = (req: FastifyRequest, reply: FastifyReply) => authController.updateUser(req, reply);
export const deleteUser = (req: FastifyRequest, reply: FastifyReply) => authController.deleteUser(req, reply);
