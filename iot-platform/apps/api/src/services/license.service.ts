import jwt from 'jsonwebtoken';
import { config } from '../config/config';

/**
 * License Service (ADR-048 / ADR-050)
 *
 * Verifies the JWT license key on startup and exposes the enabled module list.
 * Algorithm selection (ADR-050):
 *   - RS256 (production): LICENSE_PUBLIC_KEY set → jwt.verify with RS256 + public key PEM
 *   - HS256 (dev/staging): only LICENSE_SECRET set → jwt.verify with HS256 + shared secret
 *
 * Dev override: NODE_ENV=development + no LICENSE_KEY → all modules enabled.
 */

export type LicenseModule = 'combustion_dl' | 'asset_life' | 'be_agent';

interface LicensePayload {
  customer?: string;
  modules?: string[];
  iat?: number;
  exp?: number;
}

export interface LicenseState {
  valid: boolean;
  customer: string;
  modules: string[];
  expiresAt: string | null;
}

const ALL_MODULES: LicenseModule[] = ['combustion_dl', 'asset_life', 'be_agent'];

class LicenseService {
  private state: LicenseState = {
    valid: false,
    customer: 'unlicensed',
    modules: [],
    expiresAt: null,
  };

  /**
   * Must be called once on application startup (before serving requests).
   */
  init(): void {
    // Dev override: development mode with no key → all modules unlocked
    if (config.isDevelopment && !config.license.key) {
      this.state = {
        valid: true,
        customer: 'development',
        modules: [...ALL_MODULES],
        expiresAt: null,
      };
      return;
    }

    if (!config.license.key) {
      this.state = { valid: false, customer: 'unlicensed', modules: [], expiresAt: null };
      return;
    }

    try {
      // ADR-050: RS256 when publicKey is configured; HS256 fallback for dev/staging.
      const verifyKey = config.license.publicKey || config.license.secret;
      const algorithm = config.license.publicKey ? 'RS256' : 'HS256';
      const payload = jwt.verify(
        config.license.key,
        verifyKey,
        { algorithms: [algorithm] }
      ) as LicensePayload;
      const modules = Array.isArray(payload.modules)
        ? payload.modules.filter((m): m is LicenseModule =>
            ALL_MODULES.includes(m as LicenseModule)
          )
        : [];
      this.state = {
        valid: true,
        customer: payload.customer || 'unknown',
        modules,
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      };
    } catch {
      // Catches: JsonWebTokenError (invalid sig / alg mismatch), TokenExpiredError, NotBeforeError
      this.state = { valid: false, customer: 'invalid-key', modules: [], expiresAt: null };
    }
  }

  getState(): LicenseState {
    return { ...this.state };
  }

  isModuleEnabled(key: string): boolean {
    return this.state.valid && this.state.modules.includes(key);
  }
}

export const licenseService = new LicenseService();
