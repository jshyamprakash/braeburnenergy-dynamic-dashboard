/**
 * Zod validation preHandler factories
 *
 * Removes 62 .parse(request.body) / ZodError catch blocks from controllers.
 * Use these as preHandlers in route definitions.
 *
 * On success: sets request.body/query/params to the parsed (typed) output.
 * On failure: throws ValidationError — caught by global error handler.
 *
 * Usage:
 *   preHandler: [requireAuth, zodBodyValidator(createDeviceSchema)]
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../lib/errors';

/**
 * Validate request body against a Zod schema
 */
export function zodBodyValidator(schema: ZodSchema) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      throw new ValidationError('Validation failed', result.error.errors);
    }
    request.body = result.data;
  };
}

/**
 * Validate querystring against a Zod schema
 */
export function zodQueryValidator(schema: ZodSchema) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      throw new ValidationError('Invalid query parameters', result.error.errors);
    }
    (request as any).query = result.data;
  };
}

/**
 * Validate route params against a Zod schema
 */
export function zodParamsValidator(schema: ZodSchema) {
  return async function (request: FastifyRequest, _reply: FastifyReply) {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      throw new ValidationError('Invalid path parameters', result.error.errors);
    }
    (request as any).params = result.data;
  };
}
