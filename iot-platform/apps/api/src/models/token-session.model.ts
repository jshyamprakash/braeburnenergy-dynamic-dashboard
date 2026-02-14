import mongoose, { Schema, Document } from 'mongoose';

/**
 * Token Session Interface
 * Tracks active JWT tokens for revocation and session management
 */
export interface ITokenSession extends Document {
  jti: string; // JWT ID (unique identifier)
  userId: string; // User who owns this token
  type: 'access' | 'refresh'; // Token type
  isRevoked: boolean; // Revocation status
  expiresAt: Date; // Token expiration time
  createdAt: Date; // Session creation time
  revokedAt?: Date; // When token was revoked (if revoked)
  ipAddress?: string; // IP address of login
  userAgent?: string; // User agent string
}

/**
 * Token Session Model Interface (with static methods)
 */
export interface ITokenSessionModel extends mongoose.Model<ITokenSession> {
  isValid(jti: string): Promise<boolean>;
  revokeToken(jti: string): Promise<boolean>;
  revokeAllUserTokens(userId: string): Promise<number>;
  revokeAllRefreshTokens(userId: string): Promise<number>;
  getActiveSessions(userId: string): Promise<any[]>;
  cleanupExpired(): Promise<number>;
}

/**
 * Token Session Schema
 */
const TokenSessionSchema = new Schema<ITokenSession>(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['access', 'refresh'],
      required: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true, // For TTL cleanup
    },
    revokedAt: {
      type: Date,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'token_sessions',
  }
);

// Compound indexes for efficient queries
TokenSessionSchema.index({ userId: 1, type: 1 }); // Get user's sessions
TokenSessionSchema.index({ userId: 1, isRevoked: 1 }); // Get active sessions
TokenSessionSchema.index({ jti: 1, isRevoked: 1 }); // Fast revocation check

// TTL index - auto-delete expired tokens after 7 days
// This gives a grace period after expiry for audit logs
TokenSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 } // 7 days after expiry
);

/**
 * Static Methods
 */

/**
 * Check if token is valid (exists and not revoked)
 */
TokenSessionSchema.statics.isValid = async function (jti: string): Promise<boolean> {
  const session = await this.findOne({ jti, isRevoked: false });

  if (!session) {
    return false;
  }

  // Check if expired
  if (new Date() > session.expiresAt) {
    return false;
  }

  return true;
};

/**
 * Revoke a specific token
 */
TokenSessionSchema.statics.revokeToken = async function (jti: string): Promise<boolean> {
  const result = await this.updateOne(
    { jti },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
};

/**
 * Revoke all tokens for a user
 */
TokenSessionSchema.statics.revokeAllUserTokens = async function (userId: string): Promise<number> {
  const result = await this.updateMany(
    { userId, isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
};

/**
 * Revoke all refresh tokens for a user (keeps access tokens active)
 */
TokenSessionSchema.statics.revokeAllRefreshTokens = async function (
  userId: string
): Promise<number> {
  const result = await this.updateMany(
    { userId, type: 'refresh', isRevoked: false },
    {
      $set: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
};

/**
 * Get active sessions for a user
 */
TokenSessionSchema.statics.getActiveSessions = async function (userId: string) {
  return this.find({
    userId,
    isRevoked: false,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Clean up expired tokens (manual cleanup if TTL not working)
 */
TokenSessionSchema.statics.cleanupExpired = async function (): Promise<number> {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7 days old
  });

  return result.deletedCount;
};

/**
 * Export Model
 */
export const TokenSession = mongoose.model<ITokenSession, ITokenSessionModel>('TokenSession', TokenSessionSchema);
