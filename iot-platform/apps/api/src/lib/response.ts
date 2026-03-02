/**
 * Uniform response helpers for all controllers
 *
 * Eliminates 4 different inline reply.send() shapes across 15+ controllers.
 * All responses follow the established API contract:
 *   success: { success: true, data: T }
 *   paginated: { success: true, data: T[], pagination: PaginationMeta }
 *   deleted: { success: true, message: string }
 */

import type { FastifyReply } from 'fastify';

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * 200 OK — standard success
 */
export function sendSuccess<T>(reply: FastifyReply, data: T, statusCode = 200) {
  return reply.code(statusCode).send({ success: true, data });
}

/**
 * 201 Created
 */
export function sendCreated<T>(reply: FastifyReply, data: T) {
  return reply.code(201).send({ success: true, data });
}

/**
 * 202 Accepted — async operation started (e.g., workflow execution)
 */
export function sendAccepted<T>(reply: FastifyReply, data: T) {
  return reply.code(202).send({ success: true, data });
}

/**
 * 200 OK — paginated list
 * Shape: { success: true, data: T[], pagination: PaginationMeta }
 */
export function sendPaginated<T>(reply: FastifyReply, data: T[], meta: PaginationMeta) {
  return reply.code(200).send({ success: true, data, pagination: meta });
}

/**
 * 200 OK — deleted confirmation
 */
export function sendDeleted(reply: FastifyReply, message = 'Deleted successfully') {
  return reply.code(200).send({ success: true, message });
}
