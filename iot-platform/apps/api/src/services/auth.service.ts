import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User, type IUser, type UserRole } from '../models';
import { TokenSession } from '../models/token-session.model';
import { config } from '../config/config';
import { BadRequestError } from '../lib/errors';

/**
 * Authentication Service
 *
 * Handles user authentication, JWT token generation, and session management.
 * Implements EPA-compliant password policies and account lockout.
 */

interface TokenPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  organizationId: string;
  type?: 'access' | 'refresh';
  jti?: string;
}

interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    organizationId: string;
  };
  accessToken?: string;
  refreshToken?: string;
  message?: string;
}

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_ACCESS_EXPIRY: string;
  private readonly JWT_REFRESH_EXPIRY: string;

  constructor() {
    // Load JWT secret from config
    this.JWT_SECRET = config.security.jwtSecret;
    this.JWT_ACCESS_EXPIRY = config.security.jwtAccessExpiry;
    this.JWT_REFRESH_EXPIRY = config.security.jwtRefreshExpiry;

    if (config.isProduction && this.JWT_SECRET === 'your-secret-key-change-this-in-production') {
      throw new Error('JWT_SECRET must be set in production environment');
    }
  }

  /**
   * Authenticate user with username/password
   */
  async login(username: string, password: string, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    try {
      // Find user by username (include passwordHash for comparison)
      const user = await User.findOne({ username }).select('+passwordHash');

      if (!user) {
        return {
          success: false,
          message: 'Invalid username or password',
        };
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesRemaining = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / (1000 * 60)
        );
        return {
          success: false,
          message: `Account locked. Try again in ${minutesRemaining} minute(s)`,
        };
      }

      // Check if account is inactive
      if (!user.isActive) {
        return {
          success: false,
          message: 'Account is deactivated. Contact administrator.',
        };
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        // Increment failed login attempts
        await user.incrementFailedAttempts();

        return {
          success: false,
          message: 'Invalid username or password',
        };
      }

      // Reset failed login attempts on successful login
      await user.resetFailedAttempts();

      // Update last login timestamp
      user.lastLogin = new Date();

      // Generate JTIs for both tokens
      const accessJti = crypto.randomBytes(16).toString('hex');
      const refreshJti = crypto.randomBytes(16).toString('hex');

      // Generate access token and refresh token
      const accessToken = this.generateAccessToken(
        {
          userId: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId.toString(),
        },
        accessJti
      );

      const refreshToken = this.generateRefreshToken(
        {
          userId: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId.toString(),
        },
        refreshJti
      );

      // Hash and store refresh token
      user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
      await user.save();

      // Store token sessions in database
      const accessExpiry = new Date(Date.now() + this.parseExpiry(this.JWT_ACCESS_EXPIRY));
      const refreshExpiry = new Date(Date.now() + this.parseExpiry(this.JWT_REFRESH_EXPIRY));

      await TokenSession.create([
        {
          jti: accessJti,
          userId: user._id.toString(),
          type: 'access',
          isRevoked: false,
          expiresAt: accessExpiry,
          ipAddress,
          userAgent,
        },
        {
          jti: refreshJti,
          userId: user._id.toString(),
          type: 'refresh',
          isRevoked: false,
          expiresAt: refreshExpiry,
          ipAddress,
          userAgent,
        },
      ]);

      return {
        success: true,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId.toString(),
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      throw new Error(`Login failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate access token (short-lived)
   */
  generateAccessToken(payload: Omit<TokenPayload, 'type' | 'jti'>, jti: string): string {
    const options = {
      expiresIn: this.JWT_ACCESS_EXPIRY,
      issuer: 'iot-platform',
      audience: 'iot-platform-api',
    } as jwt.SignOptions;
    return jwt.sign({ ...payload, type: 'access', jti }, this.JWT_SECRET, options);
  }

  /**
   * Generate refresh token (long-lived)
   */
  generateRefreshToken(payload: Omit<TokenPayload, 'type' | 'jti'>, jti: string): string {
    const options = {
      expiresIn: this.JWT_REFRESH_EXPIRY,
      issuer: 'iot-platform',
      audience: 'iot-platform-api',
    } as jwt.SignOptions;
    return jwt.sign({ ...payload, type: 'refresh', jti }, this.JWT_SECRET, options);
  }

  /**
   * Verify JWT token (access or refresh)
   * Also checks if token is revoked in database
   */
  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'iot-platform',
        audience: 'iot-platform-api',
      }) as TokenPayload;

      // Check if token is revoked
      if (decoded.jti) {
        const isValid = await TokenSession.isValid(decoded.jti);
        if (!isValid) {
          return null;
        }
      }

      return decoded;
    } catch (error) {
      // Token invalid or expired
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    // Verify refresh token
    const payload = await this.verifyToken(refreshToken);

    if (!payload || payload.type !== 'refresh') {
      return null;
    }

    // Get user and verify refresh token hash
    const user = await User.findById(payload.userId).select('+refreshTokenHash');

    if (!user || !user.isActive) {
      return null;
    }

    // Verify stored refresh token
    const isValidRefreshToken = await user.compareRefreshToken(refreshToken);

    if (!isValidRefreshToken) {
      return null;
    }

    // Revoke old refresh token
    if (payload.jti) {
      await TokenSession.revokeToken(payload.jti);
    }

    // Generate new JTIs
    const newAccessJti = crypto.randomBytes(16).toString('hex');
    const newRefreshJti = crypto.randomBytes(16).toString('hex');

    // Generate new access token
    const newAccessToken = this.generateAccessToken(
      {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId.toString(),
      },
      newAccessJti
    );

    // Generate new refresh token (rotate refresh tokens for security)
    const newRefreshToken = this.generateRefreshToken(
      {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId.toString(),
      },
      newRefreshJti
    );

    // Update stored refresh token
    user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    await user.save();

    // Store new token sessions
    const accessExpiry = new Date(Date.now() + this.parseExpiry(this.JWT_ACCESS_EXPIRY));
    const refreshExpiry = new Date(Date.now() + this.parseExpiry(this.JWT_REFRESH_EXPIRY));

    await TokenSession.create([
      {
        jti: newAccessJti,
        userId: user._id.toString(),
        type: 'access',
        isRevoked: false,
        expiresAt: accessExpiry,
        ipAddress,
        userAgent,
      },
      {
        jti: newRefreshJti,
        userId: user._id.toString(),
        type: 'refresh',
        isRevoked: false,
        expiresAt: refreshExpiry,
        ipAddress,
        userAgent,
      },
    ]);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user (invalidate all tokens)
   */
  async logout(userId: string): Promise<void> {
    // Revoke all active tokens for user
    await TokenSession.revokeAllUserTokens(userId);

    // Clear refresh token hash from user record
    await User.findByIdAndUpdate(userId, { refreshTokenHash: undefined });
  }

  /**
   * Logout from specific session (single token revocation)
   */
  async logoutSession(jti: string): Promise<void> {
    await TokenSession.revokeToken(jti);
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessions(userId: string) {
    return TokenSession.getActiveSessions(userId);
  }

  /**
   * Create new user (registration)
   */
  async createUser(
    username: string,
    email: string,
    password: string,
    role: UserRole,
    organizationId: string
  ): Promise<IUser> {
    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      throw new Error('Email already exists');
    }

    // Validate password strength (EPA compliance)
    this.validatePasswordStrength(password);

    // Create user
    const user = new User({
      username,
      email,
      role,
      organizationId,
      isActive: true,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lastPasswordChange: new Date(),
    });

    // Set password (will be hashed via virtual)
    user.password = password;

    await user.save();

    return user;
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await User.findById(userId).select('+passwordHash');

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password strength
    this.validatePasswordStrength(newPassword);

    // Update password
    user.password = newPassword;
    user.lastPasswordChange = new Date();
    user.mustChangePassword = false;

    await user.save();

    return true;
  }

  /**
   * Parse JWT expiry string to milliseconds
   * Examples: "15m" -> 900000, "7d" -> 604800000
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiry}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,           // seconds
      m: 60 * 1000,      // minutes
      h: 60 * 60 * 1000, // hours
      d: 24 * 60 * 60 * 1000, // days
    };

    return value * multipliers[unit];
  }

  /**
   * Validate password strength (EPA compliance)
   */
  private validatePasswordStrength(password: string): void {
    // Minimum 8 characters
    if (password.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters long');
    }

    // Must contain uppercase, lowercase, number, and special character
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      throw new BadRequestError(
        'Password must contain uppercase, lowercase, number, and special character'
      );
    }
  }

  /**
   * Force password change
   */
  async forcePasswordChange(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { mustChangePassword: true });
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { isActive: false });
  }

  /**
   * Activate user account
   */
  async activateUser(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { isActive: true });
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUser | null> {
    return User.findById(userId);
  }

  /**
   * List users by organization
   */
  async listUsers(organizationId: string): Promise<IUser[]> {
    return User.find({ organizationId }).sort({ createdAt: -1 });
  }

  /**
   * Update a user's role, active status, or unlock their account.
   *
   * Rules:
   * - Admin cannot assign or be assigned the SuperAdmin role.
   * - Actor cannot change their own role.
   * - Deactivating a user revokes all their active tokens.
   */
  async updateUser(
    actorId: string,
    actorRole: UserRole,
    targetUserId: string,
    updates: { role?: UserRole; isActive?: boolean; unlock?: boolean }
  ): Promise<IUser> {
    const target = await User.findById(targetUserId);
    if (!target) {
      throw new Error('User not found');
    }

    // Role change guards
    if (updates.role !== undefined) {
      if (actorId === targetUserId) {
        throw new Error('Cannot change your own role');
      }
      if (actorRole !== 'SuperAdmin' && updates.role === 'SuperAdmin') {
        throw new Error('Only SuperAdmin can assign the SuperAdmin role');
      }
      if (actorRole !== 'SuperAdmin' && target.role === 'SuperAdmin') {
        throw new Error('Only SuperAdmin can modify another SuperAdmin');
      }
      target.role = updates.role;
    }

    // Deactivate: revoke all active tokens
    if (updates.isActive === false && target.isActive !== false) {
      await this.logout(targetUserId);
    }
    if (updates.isActive !== undefined) {
      target.isActive = updates.isActive;
    }

    // Unlock: clear failed attempts and lock timer
    if (updates.unlock) {
      target.failedLoginAttempts = 0;
      target.lockedUntil = undefined;
    }

    await target.save();
    return target;
  }

  /**
   * Hard-delete a user account (SuperAdmin only).
   *
   * Rules:
   * - Actor cannot delete their own account.
   * - All active tokens are revoked before deletion.
   */
  async deleteUser(actorId: string, targetUserId: string): Promise<void> {
    if (actorId === targetUserId) {
      throw new Error('Cannot delete your own account');
    }

    const target = await User.findById(targetUserId);
    if (!target) {
      throw new Error('User not found');
    }

    // Revoke all tokens before deletion
    await this.logout(targetUserId);

    await User.findByIdAndDelete(targetUserId);
  }
}
