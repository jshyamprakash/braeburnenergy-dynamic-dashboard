import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenvConfig({ path: resolve(__dirname, '../../.env') });

/**
 * Application Configuration
 * Centralized configuration loaded from environment variables
 */
export const config = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/iot_platform?replicaSet=rs0',
  },

  // WebSocket Configuration
  websocket: {
    port: parseInt(process.env.WS_PORT || '3002', 10),
    corsOrigin: process.env.WS_CORS_ORIGIN || 'http://localhost:3000',
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  },

  // API Configuration
  api: {
    version: process.env.API_VERSION || 'v1',
    prefix: process.env.API_PREFIX || '/api',
    fullPrefix: `${process.env.API_PREFIX || '/api'}/${process.env.API_VERSION || 'v1'}`,
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // NATS Configuration
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Storage Worker Configuration (ADR-043)
  worker: {
    batchSize: parseInt(process.env.WORKER_BATCH_SIZE || '1000', 10),
    flushIntervalMs: parseInt(process.env.WORKER_FLUSH_INTERVAL_MS || '200', 10),
  },

  // Processing Engine Configuration (ADR-043 Phase 3)
  processing: {
    noiseThreshold: parseFloat(process.env.PROCESSING_NOISE_THRESHOLD || '0.5'),
    deltaPercent: parseFloat(process.env.PROCESSING_DELTA_PERCENT || '0.01'),
    cacheTTLSeconds: parseInt(process.env.PROCESSING_CACHE_TTL_SECONDS || '300', 10),
    cacheKeyPrefix: process.env.PROCESSING_CACHE_KEY_PREFIX || 'sensor:latest:',
  },

  // License Configuration (ADR-048 / ADR-050)
  // RS256 (production): set LICENSE_PUBLIC_KEY — LicenseService uses RS256 verify path.
  // HS256 (dev/staging fallback): set LICENSE_SECRET only — LicenseService uses HS256 verify path.
  license: {
    key: process.env.LICENSE_KEY || '',
    secret: process.env.LICENSE_SECRET || 'license-secret-change-in-production',
    publicKey: process.env.LICENSE_PUBLIC_KEY || '',
  },
} as const;

// Validate required configuration
export function validateConfig() {
  const required = [
    { key: 'MONGODB_URI', value: config.database.uri },
    { key: 'PORT', value: config.server.port },
  ];

  const missing = required.filter(({ value }) => !value);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.map(({ key }) => key).join(', ')}`
    );
  }

  // Warn about default JWT secret in production
  if (config.isProduction && config.security.jwtSecret === 'your-secret-key-change-this-in-production') {
    console.warn('⚠️  WARNING: Using default JWT_SECRET in production! Please set a secure secret.');
  }
}

// Export individual configs for convenience
export const { env, isDevelopment, isProduction, isTest } = config;
export const { server, database, websocket, logging, security, api, nats, redis, worker, processing, license } = config;
