import { ModuleConfig, LicenseModule, VALID_MODULES, MODULE_CONFIG_ID } from '../models/module-config.model';
import { ValidationError } from '../lib/errors';

/**
 * Module Service (ADR-051)
 *
 * Manages the ModuleConfig singleton document.
 * SuperAdmin calls setEnabled() to toggle optional modules.
 */
export class ModuleService {
  /**
   * Get current module config. Returns { enabled: [] } if no document yet.
   */
  async getConfig(): Promise<{ enabled: LicenseModule[] }> {
    const doc = await ModuleConfig.findById(MODULE_CONFIG_ID).lean();
    return { enabled: (doc?.enabled ?? []) as LicenseModule[] };
  }

  /**
   * Replace the enabled[] list. Validates module names before saving.
   */
  async setEnabled(modules: LicenseModule[]): Promise<{ enabled: LicenseModule[] }> {
    const invalid = modules.filter((m) => !VALID_MODULES.includes(m));
    if (invalid.length > 0) {
      throw new ValidationError(`Invalid module identifiers: ${invalid.join(', ')}`);
    }

    const updated = await ModuleConfig.findOneAndUpdate(
      { _id: MODULE_CONFIG_ID },
      { $set: { enabled: modules } },
      { upsert: true, new: true }
    );
    return { enabled: updated!.enabled as LicenseModule[] };
  }

  /**
   * Seed default config on first deploy (all modules disabled).
   * Idempotent — uses $setOnInsert so existing docs are untouched.
   */
  async seedDefault(): Promise<void> {
    await ModuleConfig.findOneAndUpdate(
      { _id: MODULE_CONFIG_ID },
      { $setOnInsert: { _id: MODULE_CONFIG_ID, enabled: [] } },
      { upsert: true }
    );
    console.log('✅ ModuleConfig seeded (default: all modules disabled)');
  }
}

export const moduleService = new ModuleService();
