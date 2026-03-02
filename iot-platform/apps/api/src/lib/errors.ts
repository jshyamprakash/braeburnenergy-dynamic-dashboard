/**
 * Custom error hierarchy for IoT Platform
 *
 * All AppError subclasses produce a flat JSON shape:
 *   { success: false, error: string, code: string, details?: any }
 *
 * This keeps the frontend response contract unchanged (additive: code field is new).
 */

export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(message: string, statusCode: number, code: ErrorCode, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON() {
    return {
      success: false as const,
      error: this.message,
      code: this.code,
      ...(this.details !== undefined && { details: this.details }),
    };
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super(message, 400, ErrorCode.BAD_REQUEST, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', details?: unknown) {
    super(message, 401, ErrorCode.UNAUTHORIZED, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown) {
    super(message, 403, ErrorCode.FORBIDDEN, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', details?: unknown) {
    super(`${resource} not found`, 404, ErrorCode.NOT_FOUND, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: unknown) {
    super(message, 409, ErrorCode.CONFLICT, details);
  }
}

export class UnprocessableError extends AppError {
  constructor(message = 'Unprocessable entity', details?: unknown) {
    super(message, 422, ErrorCode.UNPROCESSABLE_ENTITY, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, details);
  }
}

/**
 * Type guard — true when error is a known AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
