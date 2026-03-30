import { RetentionPolicy, type IRetentionPolicy, type DataCategory } from '../models';

/**
 * RetentionPolicyService
 *
 * Manages data retention policies for EPA compliance.
 * Handles hot/warm/cold storage tiers and archival.
 */

export class RetentionPolicyService {
  /**
   * Create a new retention policy
   */
  async createPolicy(data: Partial<IRetentionPolicy>): Promise<IRetentionPolicy> {
    // Deactivate existing policy for the same category if setting as active
    if (data.isActive && data.category) {
      await RetentionPolicy.updateMany(
        { category: data.category, isActive: true },
        { isActive: false }
      );
    }

    const policy = new RetentionPolicy({
      ...data,
      appliedAt: data.isActive ? new Date() : undefined,
    });

    await policy.save();
    return policy;
  }

  /**
   * Get active retention policy for a category
   */
  async getActivePolicy(category: DataCategory): Promise<IRetentionPolicy | null> {
    return RetentionPolicy.findOne({ category, isActive: true });
  }

  /**
   * Get insert expiry duration for a data category (ADR-047).
   * Returns milliseconds to add to Date.now() for the expiresAt field.
   * Falls back to hardcoded safe defaults when no active policy exists.
   */
  async getInsertExpiry(category: DataCategory): Promise<number> {
    const FALLBACK_MS: Record<DataCategory, number> = {
      device_states: 157_680_000 * 1000,       // 5 years
      derived_state_history: 7_776_000 * 1000,  // 90 days
      audit_logs: 315_360_000 * 1000,           // 10 years
      alarms: 7_776_000 * 1000,                 // 90 days
      calibration_records: 157_680_000 * 1000,  // 5 years
    };

    const policy = await this.getActivePolicy(category);
    return policy
      ? policy.totalRetentionDuration * 1000
      : FALLBACK_MS[category];
  }

  /**
   * List all retention policies
   */
  async listPolicies(filter?: { category?: DataCategory; isActive?: boolean }): Promise<IRetentionPolicy[]> {
    const query: any = {};

    if (filter?.category) query.category = filter.category;
    if (filter?.isActive !== undefined) query.isActive = filter.isActive;

    return RetentionPolicy.find(query).sort({ category: 1, createdAt: -1 });
  }

  /**
   * Get retention policy by ID
   */
  async getPolicyById(policyId: string): Promise<IRetentionPolicy | null> {
    return RetentionPolicy.findById(policyId);
  }

  /**
   * Update retention policy
   */
  async updatePolicy(policyId: string, updates: Partial<IRetentionPolicy>): Promise<IRetentionPolicy | null> {
    const policy = await RetentionPolicy.findById(policyId);

    if (!policy) {
      throw new Error('Retention policy not found');
    }

    // If activating this policy, deactivate others in the same category
    if (updates.isActive && !policy.isActive) {
      await RetentionPolicy.updateMany(
        { category: policy.category, isActive: true, _id: { $ne: policyId } },
        { isActive: false }
      );
      updates.appliedAt = new Date();
    }

    Object.assign(policy, updates);
    await policy.save();

    return policy;
  }

  /**
   * Delete retention policy
   */
  async deletePolicy(policyId: string): Promise<boolean> {
    const result = await RetentionPolicy.findByIdAndDelete(policyId);
    return !!result;
  }

  /**
   * Calculate storage tier for a given timestamp
   */
  calculateStorageTier(
    timestamp: Date,
    policy: IRetentionPolicy
  ): { tier: 'hot' | 'warm' | 'cold' | 'expired'; ageInDays: number } {
    const now = Date.now();
    const ageInSeconds = Math.floor((now - timestamp.getTime()) / 1000);
    const ageInDays = Math.floor(ageInSeconds / 86400);

    if (ageInSeconds <= policy.hotStorageDuration) {
      return { tier: 'hot', ageInDays };
    } else if (ageInSeconds <= policy.warmStorageDuration) {
      return { tier: 'warm', ageInDays };
    } else if (ageInSeconds <= policy.coldStorageDuration) {
      return { tier: 'cold', ageInDays };
    } else {
      return { tier: 'expired', ageInDays };
    }
  }

  /**
   * Get retention statistics for a category
   */
  async getRetentionStats(category: DataCategory): Promise<{
    policy: IRetentionPolicy | null;
    hotStorageDays: number;
    warmStorageDays: number;
    coldStorageDays: number;
    totalRetentionDays: number;
    archiveEnabled: boolean;
  } | null> {
    const policy = await this.getActivePolicy(category);

    if (!policy) {
      return null;
    }

    return {
      policy,
      hotStorageDays: Math.floor(policy.hotStorageDuration / 86400),
      warmStorageDays: Math.floor(policy.warmStorageDuration / 86400),
      coldStorageDays: Math.floor(policy.coldStorageDuration / 86400),
      totalRetentionDays: Math.floor(policy.totalRetentionDuration / 86400),
      archiveEnabled: policy.archiveEnabled,
    };
  }

  /**
   * Seed default retention policies (for initial setup)
   */
  async seedDefaultPolicies(): Promise<void> {
    const defaults = [
      {
        name: 'Device States - EPA Compliant',
        description: 'EPA-compliant 5-year retention for water quality monitoring data',
        category: 'device_states' as DataCategory,
        hotStorageDuration: 7776000, // 90 days
        warmStorageDuration: 31536000, // 1 year
        coldStorageDuration: 157680000, // 5 years
        totalRetentionDuration: 157680000, // 5 years
        archiveEnabled: false,
        compressionEnabled: true,
        compressionThreshold: 90,
        regulatoryRequirement: 'EPA Water Quality Standards (40 CFR 136)',
        minimumRetentionDays: 1825, // 5 years
        isActive: true,
      },
      {
        name: 'Audit Logs - Permanent',
        description: 'Permanent retention for audit trail compliance (10+ years)',
        category: 'audit_logs' as DataCategory,
        hotStorageDuration: 7776000, // 90 days
        warmStorageDuration: 31536000, // 1 year
        coldStorageDuration: 315360000, // 10 years
        totalRetentionDuration: 315360000, // 10 years (use very long duration for "permanent")
        archiveEnabled: true,
        compressionEnabled: true,
        compressionThreshold: 365,
        regulatoryRequirement: '21 CFR Part 11, EPA Record Keeping',
        minimumRetentionDays: 3650, // 10 years
        isActive: true,
      },
      {
        name: 'Derived State History - 90 Day',
        description: '90-day retention for workflow/ML derived state history (ADR-047)',
        category: 'derived_state_history' as DataCategory,
        hotStorageDuration: 7776000,  // 90 days
        warmStorageDuration: 7776000, // 90 days
        coldStorageDuration: 7776000, // 90 days
        totalRetentionDuration: 7776000, // 90 days
        archiveEnabled: false,
        compressionEnabled: false,
        compressionThreshold: 90,
        minimumRetentionDays: 0,
        isActive: true,
      },
    ];

    for (const defaultPolicy of defaults) {
      const existing = await RetentionPolicy.findOne({ name: defaultPolicy.name });

      if (!existing) {
        await this.createPolicy(defaultPolicy);
        console.log(`✅ Created default retention policy: ${defaultPolicy.name}`);
      }
    }
  }
}

export const retentionPolicyService = new RetentionPolicyService();
