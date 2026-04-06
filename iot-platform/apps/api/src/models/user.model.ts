import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * User Model
 *
 * User authentication and authorization for EPA compliance.
 * Supports Role-Based Access Control (RBAC).
 */

export type UserRole = 'SuperAdmin' | 'Admin' | 'Operator' | 'Viewer';

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash?: string;
  /** PEM public key for Admin self-recovery (ADR-052). Absent for non-Admin roles. */
  recoveryPublicKey?: string;
  role: UserRole;
  organizationId?: Schema.Types.ObjectId;
  isActive: boolean;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLogin?: Date;
  lastPasswordChange: Date;
  refreshTokenHash?: string;
  createdAt: Date;
  updatedAt: Date;

  // Virtual: password is write-only
  password?: string;

  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  compareRefreshToken(candidateToken: string): Promise<boolean>;
  incrementFailedAttempts(): Promise<void>;
  resetFailedAttempts(): Promise<void>;
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Basic email validation
  },
  passwordHash: {
    type: String,
    required: false, // Optional: SuperAdmin uses keypair auth (ADR-052), no password stored
    select: false,
  },
  recoveryPublicKey: {
    type: String,
    required: false, // PEM public key set by Admin for self-recovery (ADR-052)
    select: false,
  },
  role: {
    type: String,
    required: true,
    enum: ['SuperAdmin', 'Admin', 'Operator', 'Viewer'],
    default: 'Viewer',
    index: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    required: false, // Optional: SuperAdmin has no org (ADR-051)
    ref: 'Organization',
    index: true,
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true,
  },
  mustChangePassword: {
    type: Boolean,
    required: true,
    default: false,
  },
  failedLoginAttempts: {
    type: Number,
    required: true,
    default: 0,
  },
  lockedUntil: {
    type: Date,
  },
  lastLogin: {
    type: Date,
  },
  lastPasswordChange: {
    type: Date,
    required: true,
    default: Date.now,
  },
  refreshTokenHash: {
    type: String,
    select: false, // Don't include in queries by default
  },
}, {
  timestamps: true,
  collection: 'users',
});

// Virtual for password (write-only)
userSchema.virtual('password').set(function(this: IUser, password: string) {
  this.passwordHash = bcrypt.hashSync(password, 10);
});

// Method: Compare password
userSchema.methods.comparePassword = async function(this: IUser, candidatePassword: string): Promise<boolean> {
  if (!this.passwordHash) return false; // SuperAdmin has no password (ADR-052)
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Method: Compare refresh token
userSchema.methods.compareRefreshToken = async function(this: IUser, candidateToken: string): Promise<boolean> {
  if (!this.refreshTokenHash) {
    return false;
  }
  return bcrypt.compare(candidateToken, this.refreshTokenHash);
};

// Method: Increment failed login attempts
userSchema.methods.incrementFailedAttempts = async function(this: IUser): Promise<void> {
  this.failedLoginAttempts += 1;

  // Lock account after 5 failed attempts for 15 minutes
  if (this.failedLoginAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  }

  await this.save();
};

// Method: Reset failed login attempts
userSchema.methods.resetFailedAttempts = async function(this: IUser): Promise<void> {
  this.failedLoginAttempts = 0;
  this.lockedUntil = undefined;
  await this.save();
};

// Compound indexes
userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ isActive: 1, organizationId: 1 });

export const User = model<IUser>('User', userSchema);

/**
 * Seed the SuperAdmin account on first deployment (ADR-051 / ADR-052).
 * SuperAdmin has no password — authentication uses passphrase-derived keypair (ADR-052).
 * Env vars: SUPERADMIN_USERNAME, SUPERADMIN_EMAIL
 * Idempotent — safe to call on every startup.
 */
export async function seedSuperAdmin(): Promise<void> {
  const username = process.env.SUPERADMIN_USERNAME || 'superadmin';
  const email = process.env.SUPERADMIN_EMAIL || 'superadmin@local.dev';

  const existing = await User.findOne({ role: 'SuperAdmin' }).lean();
  if (existing) {
    return;
  }

  await User.create({
    username,
    email,
    role: 'SuperAdmin',
    isActive: true,
    mustChangePassword: false,
    failedLoginAttempts: 0,
    lastPasswordChange: new Date(),
    // No passwordHash — SuperAdmin authenticates via passphrase-derived keypair (ADR-052)
  });
  console.log(`✅ SuperAdmin account seeded (username: ${username})`);
}
