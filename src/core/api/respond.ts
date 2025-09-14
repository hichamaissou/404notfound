import { NextResponse } from 'next/server'

/**
 * Generates a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Creates a JSON response with a request ID for tracing
 */
export function jsonWithRequestId(data: any, init?: ResponseInit): NextResponse {
  const responseData = {
    ...data,
    requestId: generateRequestId(),
  }
  
  return NextResponse.json(responseData, init)
}