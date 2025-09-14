/**
 * Application error classes for consistent error handling across the app.
 * Each error maps to a specific HTTP status code and response format.
 */

export abstract class AppError extends Error {
  abstract readonly statusCode: number
  abstract readonly code: string
  
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

export class BadRequestError extends AppError {
  readonly statusCode = 400
  readonly code = 'BAD_REQUEST'
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401
  readonly code = 'UNAUTHORIZED'
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403
  readonly code = 'FORBIDDEN'
}

export class NotFoundError extends AppError {
  readonly statusCode = 404
  readonly code = 'NOT_FOUND'
}

export class ConflictError extends AppError {
  readonly statusCode = 409
  readonly code = 'CONFLICT'
}

export class ExternalServiceError extends AppError {
  readonly statusCode = 502
  readonly code = 'EXTERNAL_SERVICE_ERROR'
}

export class InternalServerError extends AppError {
  readonly statusCode = 500
  readonly code = 'INTERNAL_SERVER_ERROR'
}

/**
 * Maps any error to a consistent HTTP JSON response format.
 * 
 * @param error - The error to map
 * @param requestId - Optional request ID for tracing
 * @returns Consistent error response object
 */
export function mapErrorToResponse(error: unknown, requestId?: string) {
  if (error instanceof AppError) {
    return {
      ok: false as const,
      error: error.message,
      code: error.code,
      details: error.details,
      requestId,
    }
  }
  
  // Handle known error types
  if (error instanceof Error) {
    return {
      ok: false as const,
      error: error.message,
      code: 'INTERNAL_SERVER_ERROR',
      requestId,
    }
  }
  
  // Unknown error type
  return {
    ok: false as const,
    error: 'An unexpected error occurred',
    code: 'INTERNAL_SERVER_ERROR',
    requestId,
  }
}
