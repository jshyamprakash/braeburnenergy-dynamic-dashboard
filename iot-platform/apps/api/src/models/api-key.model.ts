import { Schema, model, Document } from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

/**
 * API Key Model
 *
 * Machine-to-machine authentication for external systems.
 * API keys are long-lived tokens that don't expire (unless manually set).
 */

export interface IApiKey extends Document {
  name: string;
  keyHash: string;
  prefix: string; // e.g., "iot_live_" or "iot_test_"
  userId: Schema.Types.ObjectId;
  organizationId: Schema.Types.ObjectId;
  permissions: string[];
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  compareKey(candidateKey: string): Promise<boolean>;
}

const apiKeySchema = new Schema<IApiKey>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  keyHash: {
    type: String,
    required: true,
    select: false, // Don't include in queries by default
  },
  prefix: {
    type: String,
    required: true,
    enum: ['iot_live_', 'iot_test_'],
    default: 'iot_test_',
  },
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true,
  },
  organizationId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Organization',
    index: true,
  },
  permissions: {
    type: [String],
    default: ['device:read', 'device-state:read'],
  },
  expiresAt: {
    type: Date,
  },
  lastUsedAt: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
  collection: 'api_keys',
});

// Method: Compare API key
apiKeySchema.methods.compareKey = async function(this: IApiKey, candidateKey: string): Promise<boolean> {
  return bcrypt.compare(candidateKey, this.keyHash);
};

// Indexes
apiKeySchema.index({ userId: 1, isActive: 1 });
apiKeySchema.index({ organizationId: 1, isActive: 1 });
apiKeySchema.index({ expiresAt: 1 }, { sparse: true });

/**
 * Generate API key
 * Format: {prefix}{random_32_chars}
 * Example: iot_live_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6
 */
export function generateApiKey(prefix: 'iot_live_' | 'iot_test_' = 'iot_test_'): string {
  const randomBytes = crypto.randomBytes(24); // 24 bytes = 32 base64 chars
  const randomString = randomBytes.toString('base64')
    .replace(/\+/g, '')
    .replace(/\//g, '')
    .replace(/=/g, '')
    .slice(0, 32);

  return `${prefix}${randomString}`;
}

/**
 * Hash API key for storage
 */
export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}

/**
 * Extract prefix from API key
 */
export function extractPrefix(key: string): string | null {
  if (key.startsWith('iot_live_')) return 'iot_live_';
  if (key.startsWith('iot_test_')) return 'iot_test_';
  return null;
}

export const ApiKey = model<IApiKey>('ApiKey', apiKeySchema);
