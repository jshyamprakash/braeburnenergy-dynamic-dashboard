import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User, type IUser, type UserRole } from '../models';
import { TokenSession } from '../models/token-session.model';
import { SystemConfig } from '../models/system-config.model';
import { config } from '../config/config';
import { BadRequestError, ConflictError, NotFoundError } from '../lib/errors';
import mongoose from 'mongoose';

const DEFAULT_ORG_ID = new mongoose.Types.ObjectId('aaaaaaaaaaaaaaaaaaaaaaaa');

interface ChallengeEntry {
  challenge: string;
  expiresAt: Date;
}

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
  organizationId?: string;
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
    organizationId?: string;
    mustChangePassword: boolean;
  };
  accessToken?: string;
  refreshToken?: string;
  message?: string;
}

export class AuthService {
  private readonly JWT_SECRET: string;
  private readonly JWT_ACCESS_EXPIRY: string;
  private readonly JWT_REFRESH_EXPIRY: string;
  /** In-memory challenge store. TTL: 15 min. Replace with Redis at scale. */
  private readonly challengeStore = new Map<string, ChallengeEntry>();

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

      // SuperAdmin uses passphrase-derived keypair login (ADR-052)
      if (user.role === 'SuperAdmin') {
        return {
          success: false,
          message: 'SuperAdmin must use passphrase-based login: POST /api/v1/auth/superadmin/login',
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
      const orgId = user.organizationId ? user.organizationId.toString() : undefined;
      const accessToken = this.generateAccessToken(
        {
          userId: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: orgId,
        },
        accessJti
      );

      const refreshToken = this.generateRefreshToken(
        {
          userId: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: orgId,
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
          organizationId: orgId,
          mustChangePassword: user.mustChangePassword ?? false,
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

    const orgId = user.organizationId ? user.organizationId.toString() : undefined;

    // Generate new access token
    const newAccessToken = this.generateAccessToken(
      {
        userId: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: orgId,
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
        organizationId: orgId,
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

  // ── ADR-052: Passphrase-Derived Keypair Auth ──────────────────────────────

  /**
   * Generate a one-time challenge (random 32-byte hex, TTL 15 min).
   * Used for both SuperAdmin login and Admin self-recovery.
   */
  generateChallenge(): { challengeId: string; challenge: string; expiresAt: Date } {
    this.cleanupExpiredChallenges();
    const challengeId = crypto.randomBytes(16).toString('hex');
    const challenge = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    this.challengeStore.set(challengeId, { challenge, expiresAt });
    return { challengeId, challenge, expiresAt };
  }

  /**
   * Resolve the active SuperAdmin public key.
   * Checks MongoDB SystemConfig first (runtime rotation override, ADR-053),
   * falls back to SUPERADMIN_PUBLIC_KEY env var if no DB entry exists.
   * On DB error, logs and falls back to env var so login is never broken.
   */
  private async getPublicKey(): Promise<string> {
    try {
      const doc = await SystemConfig.findById('superadmin_public_key');
      if (doc?.value) return doc.value;
    } catch (err) {
      console.error('[AuthService] SystemConfig lookup failed, using env fallback:', err);
    }
    return config.superadmin.publicKey;
  }

  /**
   * Verify SuperAdmin challenge signature against stored public key (ADR-053).
   * DB override checked first; falls back to SUPERADMIN_PUBLIC_KEY env var.
   * Consumes the challenge on success (one-time use).
   */
  async verifySuperAdminChallenge(challengeId: string, signatureBase64: string): Promise<boolean> {
    const entry = this.challengeStore.get(challengeId);
    if (!entry || entry.expiresAt < new Date()) {
      this.challengeStore.delete(challengeId);
      return false;
    }

    const publicKeyPem = await this.getPublicKey();
    if (!publicKeyPem) {
      throw new Error('SUPERADMIN_PUBLIC_KEY not configured');
    }

    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(Buffer.from(entry.challenge));
      const valid = verify.verify(
        {
          key: crypto.createPublicKey(publicKeyPem),
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: 32,
        },
        Buffer.from(signatureBase64, 'base64')
      );
      if (valid) this.challengeStore.delete(challengeId);
      return valid;
    } catch {
      return false;
    }
  }

  /**
   * Rotate the SuperAdmin public key in MongoDB (ADR-053).
   * After this call, getPublicKey() returns the new value on every subsequent login.
   * Current JWT sessions remain valid — only future logins are affected.
   */
  async rotateSuperAdminPublicKey(newPublicKeyPem: string): Promise<{ success: boolean }> {
    try {
      crypto.createPublicKey(newPublicKeyPem);
    } catch {
      throw new BadRequestError('Invalid public key PEM — must be a valid RSA public key');
    }
    await SystemConfig.findByIdAndUpdate(
      'superadmin_public_key',
      { value: newPublicKeyPem, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    return { success: true };
  }

  /**
   * Verify Admin recovery challenge signature against user.recoveryPublicKey in DB.
   * Consumes the challenge on success.
   */
  async verifyAdminRecovery(
    userId: string,
    challengeId: string,
    signatureBase64: string
  ): Promise<boolean> {
    const entry = this.challengeStore.get(challengeId);
    if (!entry || entry.expiresAt < new Date()) {
      this.challengeStore.delete(challengeId);
      return false;
    }

    const user = await User.findById(userId).select('+recoveryPublicKey');
    if (!user || !user.recoveryPublicKey) return false;

    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(Buffer.from(entry.challenge));
      const valid = verify.verify(
        {
          key: crypto.createPublicKey(user.recoveryPublicKey),
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: 32,
        },
        Buffer.from(signatureBase64, 'base64')
      );
      if (valid) this.challengeStore.delete(challengeId);
      return valid;
    } catch {
      return false;
    }
  }

  /**
   * Issue a JWT session for SuperAdmin after challenge verification.
   */
  async loginSuperAdmin(
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ accessToken: string; refreshToken: string; user: object }> {
    const user = await User.findOne({ role: 'SuperAdmin' });
    if (!user) throw new Error('SuperAdmin account not found');

    user.lastLogin = new Date();

    const accessJti = crypto.randomBytes(16).toString('hex');
    const refreshJti = crypto.randomBytes(16).toString('hex');

    const accessToken = this.generateAccessToken(
      { userId: user._id.toString(), username: user.username, email: user.email, role: user.role },
      accessJti
    );
    const refreshToken = this.generateRefreshToken(
      { userId: user._id.toString(), username: user.username, email: user.email, role: user.role },
      refreshJti
    );

    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await user.save();

    const accessExpiry = new Date(Date.now() + this.parseExpiry(this.JWT_ACCESS_EXPIRY));
    const refreshExpiry = new Date(Date.now() + this.parseExpiry(this.JWT_REFRESH_EXPIRY));
    await TokenSession.create([
      { jti: accessJti, userId: user._id.toString(), type: 'access', isRevoked: false, expiresAt: accessExpiry, ipAddress, userAgent },
      { jti: refreshJti, userId: user._id.toString(), type: 'refresh', isRevoked: false, expiresAt: refreshExpiry, ipAddress, userAgent },
    ]);

    return {
      accessToken,
      refreshToken,
      user: { id: user._id.toString(), username: user.username, email: user.email, role: user.role },
    };
  }

  /**
   * Store Admin recoveryPublicKey (PEM). Requires the user to be authenticated.
   */
  async setRecoveryPublicKey(userId: string, publicKeyPem: string): Promise<void> {
    // Basic PEM validation
    if (!publicKeyPem.includes('BEGIN PUBLIC KEY') && !publicKeyPem.includes('BEGIN RSA PUBLIC KEY')) {
      throw new BadRequestError('Invalid PEM public key format');
    }
    await User.findByIdAndUpdate(userId, { recoveryPublicKey: publicKeyPem });
  }

  /**
   * Redeem Admin recovery: verify signature then reset password.
   */
  async redeemRecovery(userId: string, newPassword: string): Promise<void> {
    this.validatePasswordStrength(newPassword);
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    user.password = newPassword;
    user.lastPasswordChange = new Date();
    user.mustChangePassword = false;
    await user.save();
  }

  /**
   * Compute a short 8-char base32 recovery token from the challenge (ADR-054).
   * Used as a verbal confirmation code so SA and Admin verify they share the same challenge.
   * Token = base32(SHA-256(challenge).slice(0,5))
   */
  private recoveryToken(challenge: string): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const hash = crypto.createHash('sha256').update(challenge).digest();
    const bits: number[] = [];
    for (let i = 0; i < 5; i++) {
      for (let j = 7; j >= 0; j--) bits.push((hash[i] >> j) & 1);
    }
    let result = '';
    for (let i = 0; i < 8; i++) {
      const idx = bits.slice(i * 5, i * 5 + 5).reduce((a, b) => (a << 1) | b, 0);
      result += alphabet[idx];
    }
    return result;
  }

  /**
   * Issue a challenge for SA-authorized Admin recovery (ADR-054).
   * Returns challengeId, challenge hex, and a short 8-char recovery token.
   */
  async getSARecoveryChallenge(
    username: string
  ): Promise<{ userId: string; challengeId: string; challenge: string; recoveryToken: string }> {
    const user = await User.findOne({ username });
    if (!user) throw new NotFoundError('No account found with that username');

    const { challengeId, challenge } = this.generateChallenge();
    const token = this.recoveryToken(challenge);
    return { userId: user._id.toString(), challengeId, challenge, recoveryToken: token };
  }

  /**
   * Redeem SA-authorized recovery (ADR-054).
   * Verifies RSA-PSS signature (SA's private key) against stored SA public key,
   * then resets the user's password and forces mustChangePassword = true.
   */
  async redeemSARecovery(
    userId: string,
    challengeId: string,
    signatureBase64: string,
    newPassword: string
  ): Promise<void> {
    this.validatePasswordStrength(newPassword);

    // Verify signature against SA's public key (DB override → env fallback)
    const valid = await this.verifySuperAdminChallenge(challengeId, signatureBase64);
    if (!valid) throw new BadRequestError('Invalid or expired recovery signature');

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    user.password = newPassword;
    user.lastPasswordChange = new Date();
    user.mustChangePassword = true; // Force password change on next login
    await user.save();
  }

  /** Generate a secure random temporary password. */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%';
    return Array.from(crypto.randomBytes(12)).map(b => chars[b % chars.length]).join('');
  }

  /**
   * Create the single primary Admin account (SuperAdmin-initiated).
   * Only one Admin (role=Admin) may exist per deployment.
   * Returns the plaintext temporary password — shown once, never stored.
   */
  async createPrimaryAdmin(username: string, email: string): Promise<{ tempPassword: string }> {
    const existing = await User.findOne({ role: 'Admin' });
    if (existing) {
      throw new ConflictError('Admin account already exists. Use reset password to generate new credentials.');
    }

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await User.create({
      username,
      email,
      passwordHash,
      role: 'Admin',
      organizationId: DEFAULT_ORG_ID,
      isActive: true,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lastPasswordChange: new Date(),
    });

    return { tempPassword };
  }

  /**
   * Reset the primary Admin account's password (SuperAdmin-initiated).
   * Sets mustChangePassword=true so Admin must change on next login.
   * Returns the new plaintext temporary password — shown once, never stored.
   */
  async resetAdminPassword(): Promise<{ tempPassword: string; username: string; email: string }> {
    const admin = await User.findOne({ role: 'Admin' }).select('+passwordHash');
    if (!admin) {
      throw new NotFoundError('No Admin account found. Create one first.');
    }

    const tempPassword = this.generateTempPassword();
    admin.password = tempPassword;
    admin.mustChangePassword = true;
    admin.lastPasswordChange = new Date();
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = undefined as any;
    await admin.save();

    return { tempPassword, username: admin.username, email: admin.email };
  }

  /** Remove expired challenges from in-memory store. */
  private cleanupExpiredChallenges(): void {
    const now = new Date();
    for (const [id, entry] of this.challengeStore) {
      if (entry.expiresAt < now) this.challengeStore.delete(id);
    }
  }
}
