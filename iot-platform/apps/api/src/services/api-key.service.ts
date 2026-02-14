import { ApiKey, type IApiKey, generateApiKey, hashApiKey } from '../models';
import { Types } from 'mongoose';

/**
 * API Key Service
 *
 * Manages API keys for machine-to-machine authentication.
 */

export interface CreateApiKeyParams {
  name: string;
  userId: string;
  organizationId: string;
  permissions?: string[];
  expiresAt?: Date;
  prefix?: 'iot_live_' | 'iot_test_';
}

export interface CreateApiKeyResult {
  apiKey: IApiKey;
  plainKey: string; // Only returned once during creation
}

export class ApiKeyService {
  /**
   * Create new API key
   * Returns the plain-text key (only shown once)
   */
  async create(params: CreateApiKeyParams): Promise<CreateApiKeyResult> {
    const { name, userId, organizationId, permissions, expiresAt, prefix = 'iot_test_' } = params;

    // Generate plain-text API key
    const plainKey = generateApiKey(prefix);

    // Hash the API key for storage
    const keyHash = await hashApiKey(plainKey);

    // Create API key document
    const apiKey = await ApiKey.create({
      name,
      keyHash,
      prefix,
      userId: new Types.ObjectId(userId),
      organizationId: new Types.ObjectId(organizationId),
      permissions: permissions || ['device:read', 'device-state:read'],
      expiresAt,
      isActive: true,
    });

    return {
      apiKey,
      plainKey, // Return plain key only once
    };
  }

  /**
   * List API keys for a user
   */
  async listByUser(userId: string): Promise<IApiKey[]> {
    return ApiKey.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
  }

  /**
   * List API keys for an organization
   */
  async listByOrganization(organizationId: string): Promise<IApiKey[]> {
    return ApiKey.find({ organizationId: new Types.ObjectId(organizationId) })
      .populate('userId', 'username email role')
      .sort({ createdAt: -1 });
  }

  /**
   * Get API key by ID
   */
  async getById(id: string): Promise<IApiKey | null> {
    return ApiKey.findById(id).populate('userId', 'username email role');
  }

  /**
   * Update API key
   */
  async update(
    id: string,
    updates: { name?: string; permissions?: string[]; expiresAt?: Date }
  ): Promise<IApiKey | null> {
    return ApiKey.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
  }

  /**
   * Revoke (soft delete) API key
   */
  async revoke(id: string): Promise<IApiKey | null> {
    return ApiKey.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }

  /**
   * Activate API key
   */
  async activate(id: string): Promise<IApiKey | null> {
    return ApiKey.findByIdAndUpdate(
      id,
      { isActive: true },
      { new: true }
    );
  }

  /**
   * Permanently delete API key
   */
  async delete(id: string): Promise<void> {
    await ApiKey.findByIdAndDelete(id);
  }

  /**
   * Rotate API key (generate new key, keep same ID)
   */
  async rotate(id: string): Promise<{ apiKey: IApiKey; plainKey: string } | null> {
    const existingKey = await ApiKey.findById(id);

    if (!existingKey) {
      return null;
    }

    // Generate new API key
    const plainKey = generateApiKey(existingKey.prefix as 'iot_live_' | 'iot_test_');
    const keyHash = await hashApiKey(plainKey);

    // Update the existing key with new hash
    existingKey.keyHash = keyHash;
    existingKey.lastUsedAt = undefined; // Reset last used
    await existingKey.save();

    return {
      apiKey: existingKey,
      plainKey,
    };
  }

  /**
   * Validate API key (check if exists and active)
   */
  async validate(plainKey: string): Promise<IApiKey | null> {
    const prefix = plainKey.startsWith('iot_live_') ? 'iot_live_' : 'iot_test_';

    // Find all active keys with this prefix
    const keys = await ApiKey.find({ prefix, isActive: true }).select('+keyHash');

    // Check each key's hash
    for (const key of keys) {
      const isValid = await key.compareKey(plainKey);

      if (isValid) {
        // Check if expired
        if (key.expiresAt && key.expiresAt < new Date()) {
          return null;
        }

        // Update last used
        await ApiKey.findByIdAndUpdate(key._id, { lastUsedAt: new Date() });

        return key;
      }
    }

    return null;
  }

  /**
   * Count API keys for a user
   */
  async countByUser(userId: string): Promise<number> {
    return ApiKey.countDocuments({ userId: new Types.ObjectId(userId), isActive: true });
  }

  /**
   * Delete all API keys for a user (when user is deleted)
   */
  async deleteAllForUser(userId: string): Promise<void> {
    await ApiKey.deleteMany({ userId: new Types.ObjectId(userId) });
  }

  /**
   * Delete all API keys for an organization (when org is deleted)
   */
  async deleteAllForOrganization(organizationId: string): Promise<void> {
    await ApiKey.deleteMany({ organizationId: new Types.ObjectId(organizationId) });
  }
}
