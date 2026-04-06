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
      organizationId: user.organizationId ? user.organizationId.toString() : undefined,
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
      organizationId: userProfile.organizationId ? userProfile.organizationId.toString() : undefined,
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
      organizationId: u.organizationId ? u.organizationId.toString() : undefined,
      isActive: u.isActive,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
    })));
  }

  // ── Primary Admin Management (SuperAdmin only) ───────────────────────────

  /**
   * POST /auth/admin/create
   * Create the single primary Admin account with a temporary password.
   */
  async createPrimaryAdmin(request: FastifyRequest, reply: FastifyReply) {
    const { username, email } = request.body as { username: string; email: string };
    if (!username || !email) {
      throw new BadRequestError('username and email are required');
    }
    const result = await authService.createPrimaryAdmin(username, email);
    return sendCreated(reply, result);
  }

  /**
   * POST /auth/admin/reset-password
   * Reset the primary Admin password and return a new temporary password.
   */
  async resetAdminPassword(_request: FastifyRequest, reply: FastifyReply) {
    const result = await authService.resetAdminPassword();
    return sendSuccess(reply, result);
  }

  // ── ADR-052: Passphrase-Derived Keypair Auth ──────────────────────────────

  /**
   * GET /auth/superadmin/challenge
   * Issues a one-time challenge for SuperAdmin passphrase-derived login.
   */
  async superAdminChallenge(_request: FastifyRequest, reply: FastifyReply) {
    const result = authService.generateChallenge();
    return sendSuccess(reply, result);
  }

  /**
   * POST /auth/superadmin/login
   * Verify RSA-PSS signature against ENV.SUPERADMIN_PUBLIC_KEY → issue JWT session.
   */
  async superAdminLogin(request: FastifyRequest, reply: FastifyReply) {
    const { challengeId, signature } = request.body as { challengeId: string; signature: string };
    if (!challengeId || !signature) {
      throw new BadRequestError('challengeId and signature are required');
    }

    let valid: boolean;
    try {
      valid = await authService.verifySuperAdminChallenge(challengeId, signature);
    } catch (err: any) {
      throw new UnauthorizedError(err.message || 'Verification failed');
    }

    if (!valid) {
      throw new UnauthorizedError('Invalid or expired challenge signature');
    }

    const session = await authService.loginSuperAdmin(request.ip, request.headers['user-agent']);
    return sendSuccess(reply, session);
  }

  /**
   * PUT /auth/superadmin/rotate-public-key (ADR-053)
   * Store a new SuperAdmin public key in MongoDB, overriding the Docker-baked env var.
   */
  async rotateSuperAdminPublicKey(request: FastifyRequest, reply: FastifyReply) {
    const { publicKeyPem } = request.body as { publicKeyPem: string };
    if (!publicKeyPem) throw new BadRequestError('publicKeyPem is required');
    const result = await authService.rotateSuperAdminPublicKey(publicKeyPem);
    return sendSuccess(reply, result);
  }

  /**
   * POST /auth/recovery/setup
   * Authenticated Admin stores their recoveryPublicKey for future self-recovery.
   */
  async recoverySetup(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = getRequestContext(request);
    const { publicKey } = request.body as { publicKey: string };
    if (!publicKey) throw new BadRequestError('publicKey (PEM) is required');
    await authService.setRecoveryPublicKey(userId, publicKey);
    return sendSuccess(reply, { message: 'Recovery key saved' });
  }

  /**
   * GET /auth/recovery/challenge
   * Issues a challenge for Admin self-recovery (no auth required — user is locked out).
   */
  async recoveryChallenge(request: FastifyRequest, reply: FastifyReply) {
    const { userId } = request.query as { userId: string };
    if (!userId) throw new BadRequestError('userId query param is required');
    const result = authService.generateChallenge();
    return sendSuccess(reply, result);
  }

  /**
   * POST /auth/recovery/redeem
   * Verify recovery signature → reset password.
   */
  async recoveryRedeem(request: FastifyRequest, reply: FastifyReply) {
    const { userId, challengeId, signature, newPassword } = request.body as {
      userId: string;
      challengeId: string;
      signature: string;
      newPassword: string;
    };
    if (!userId || !challengeId || !signature || !newPassword) {
      throw new BadRequestError('userId, challengeId, signature, and newPassword are required');
    }

    const valid = await authService.verifyAdminRecovery(userId, challengeId, signature);
    if (!valid) throw new UnauthorizedError('Invalid or expired recovery signature');

    await authService.redeemRecovery(userId, newPassword);
    return sendSuccess(reply, { message: 'Password reset successfully. Please log in with your new password.' });
  }

  // ── ADR-054: SA-Authorized Admin Recovery ────────────────────────────────

  /**
   * GET /auth/recovery/sa-challenge?username=...
   * Issues a challenge for SA-authorized Admin recovery (public — user is locked out).
   * Returns userId, challengeId, challenge hex, and a short recovery token.
   */
  async saRecoveryChallenge(request: FastifyRequest, reply: FastifyReply) {
    const { username } = request.query as { username: string };
    if (!username) throw new BadRequestError('username query param is required');
    const result = await authService.getSARecoveryChallenge(username.trim());
    return sendSuccess(reply, result);
  }

  /**
   * POST /auth/recovery/sa-redeem
   * Verify SA signature over challenge → reset Admin password (ADR-054).
   */
  async saRecoveryRedeem(request: FastifyRequest, reply: FastifyReply) {
    const { userId, challengeId, signature, newPassword } = request.body as {
      userId: string;
      challengeId: string;
      signature: string;
      newPassword: string;
    };
    if (!userId || !challengeId || !signature || !newPassword) {
      throw new BadRequestError('userId, challengeId, signature, and newPassword are required');
    }
    await authService.redeemSARecovery(userId, challengeId, signature, newPassword);
    return sendSuccess(reply, { message: 'Password reset successfully. You will be required to set a new password on login.' });
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
export const superAdminChallenge = (req: FastifyRequest, reply: FastifyReply) => authController.superAdminChallenge(req, reply);
export const superAdminLogin = (req: FastifyRequest, reply: FastifyReply) => authController.superAdminLogin(req, reply);
export const rotateSuperAdminPublicKey = (req: FastifyRequest, reply: FastifyReply) => authController.rotateSuperAdminPublicKey(req, reply);
export const recoverySetup = (req: FastifyRequest, reply: FastifyReply) => authController.recoverySetup(req, reply);
export const recoveryChallenge = (req: FastifyRequest, reply: FastifyReply) => authController.recoveryChallenge(req, reply);
export const recoveryRedeem = (req: FastifyRequest, reply: FastifyReply) => authController.recoveryRedeem(req, reply);
export const saRecoveryChallenge = (req: FastifyRequest, reply: FastifyReply) => authController.saRecoveryChallenge(req, reply);
export const saRecoveryRedeem = (req: FastifyRequest, reply: FastifyReply) => authController.saRecoveryRedeem(req, reply);
export const createPrimaryAdmin = (req: FastifyRequest, reply: FastifyReply) => authController.createPrimaryAdmin(req, reply);
export const resetAdminPassword = (req: FastifyRequest, reply: FastifyReply) => authController.resetAdminPassword(req, reply);
