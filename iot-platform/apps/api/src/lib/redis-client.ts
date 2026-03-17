import Redis from 'ioredis';
import { config } from '../config/config.js';

let instance: Redis | null = null;

/**
 * Returns an ioredis Redis instance (for direct Redis operations, not BullMQ).
 * BullMQ uses getBullMQConnection() to avoid ioredis version conflicts.
 */
export function getRedisClient(): Redis {
  if (!instance) {
    instance = new Redis(config.redis.url, {
      maxRetriesPerRequest: null,
    });
  }
  return instance;
}

/**
 * Returns parsed connection options for BullMQ.
 * BullMQ ships its own ioredis version — passing options avoids type conflicts.
 */
export function getBullMQConnection(): { host: string; port: number; password?: string; maxRetriesPerRequest: null } {
  const url = new URL(config.redis.url);
  return {
    host: url.hostname || 'localhost',
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}

export async function quitRedis(): Promise<void> {
  if (instance) {
    await instance.quit();
    instance = null;
  }
}
