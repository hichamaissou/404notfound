import { NextRequest, NextResponse } from 'next/server'

import { AppError, BadRequestError, ConflictError,mapErrorToResponse, NotFoundError, UnauthorizedError } from '../errors'
import { logger } from '../logger'

/**
 * Method handler function type for API routes.
 * Takes a request and returns a JSON-serializable response.
 */
type MethodHandler = (request: NextRequest) => Promise<unknown>

/**
 * Method handlers map for different HTTP methods.
 */
type MethodHandlers = {
  GET?: MethodHandler
  POST?: MethodHandler
  PUT?: MethodHandler
  PATCH?: MethodHandler
  DELETE?: MethodHandler
}

/**
 * Generates a unique request ID for tracing and debugging.
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Unified API handler wrapper that provides consistent error handling,
 * logging, and JSON response formatting for all API routes.
 * 
 * Features:
 * - Automatic try/catch error handling
 * - Request ID generation for tracing
 * - Consistent JSON response format
 * - Method-based routing
 * - Structured logging
 * 
 * @param methodHandlers - Object mapping HTTP methods to handler functions
 * @returns Next.js API route handler function
 * 
 * @example
 * ```typescript
 * export default withJson({
 *   GET: async (request) => {
 *     return { message: 'Hello World' }
 *   },
 *   POST: async (request) => {
 *     const body = await request.json()
 *     return { created: true, data: body }
 *   }
 * })
 * ```
 */
export function withJson(methodHandlers: MethodHandlers) {
  return async function handler(request: NextRequest): Promise<NextResponse> {
    const requestId = generateRequestId()
    const method = request.method as keyof MethodHandlers
    const url = request.url
    
    logger.debug('API request received', {
      requestId,
      method,
      url,
    })
    
    try {
      const methodHandler = methodHandlers[method]
      
      if (!methodHandler) {
        logger.warn('Method not allowed', {
          requestId,
          method,
          url,
          allowedMethods: Object.keys(methodHandlers),
        })
        
        return NextResponse.json(
          {
            ok: false,
            error: `Method ${method} not allowed`,
            code: 'METHOD_NOT_ALLOWED',
            requestId,
          },
          { status: 405 }
        )
      }
      
      const result = await methodHandler(request)
      
      logger.debug('API request successful', {
        requestId,
        method,
        url,
      })
      
      return NextResponse.json({
        ok: true,
        data: result,
        requestId,
      })
      
    } catch (error) {
      logger.error('API request failed', {
        requestId,
        method,
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })
      
      const errorResponse = mapErrorToResponse(error, requestId)
      const statusCode = error instanceof AppError ? error.statusCode : 500
      
      return NextResponse.json(errorResponse, { status: statusCode })
    }
  }
}

/**
 * Helper functions for creating common API responses.
 * These maintain backward compatibility with existing response formats.
 */
export const responses = {
  /**
   * Creates a successful response with data.
   */
  ok<T>(data: T) {
    return data
  },
  
  /**
   * Creates a bad request error response.
   */
  badRequest(message: string, details?: Record<string, unknown>) {
    throw new BadRequestError(message, details)
  },
  
  /**
   * Creates an unauthorized error response.
   */
  unauthorized(message = 'Unauthorized') {
    throw new UnauthorizedError(message)
  },
  
  /**
   * Creates a not found error response.
   */
  notFound(message = 'Resource not found') {
    throw new NotFoundError(message)
  },
  
  /**
   * Creates a conflict error response.
   */
  conflict(message: string, details?: Record<string, unknown>) {
    throw new ConflictError(message, details)
  },
}
