/**
 * Pagination utilities
 *
 * Eliminates duplicated limit/offset logic and the ...result spread anti-pattern
 * that mixes pagination fields directly into the response body.
 */

import type { PaginationMeta } from './response';

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 500;

/**
 * Parse and clamp pagination parameters from a querystring object
 */
export function parsePaginationQuery(query: { limit?: number | string; offset?: number | string }): {
  limit: number;
  offset: number;
} {
  const rawLimit = typeof query.limit === 'string' ? parseInt(query.limit, 10) : (query.limit ?? DEFAULT_LIMIT);
  const rawOffset = typeof query.offset === 'string' ? parseInt(query.offset, 10) : (query.offset ?? 0);

  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? DEFAULT_LIMIT : rawLimit), MAX_LIMIT);
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);

  return { limit, offset };
}

/**
 * Build a PaginationMeta object from query results
 */
export function buildPaginationMeta(total: number, limit: number, offset: number): PaginationMeta {
  return {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}
