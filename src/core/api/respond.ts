import { NextResponse } from 'next/server'

/**
 * Generates a requestId and returns a JSON response with the id attached
 * in both the body and the `x-request-id` header.
 * Does not alter the response shape beyond adding `requestId`.
 */
export function jsonWithRequestId<T extends Record<string, unknown> | undefined>(
  body: T,
  init?: ResponseInit
) {
  const requestId = (globalThis as any).crypto?.randomUUID
    ? (globalThis as any).crypto.randomUUID()
    : `req_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const json = NextResponse.json(
    body
      ? { ...body, requestId }
      : // allow returning {ok:true} via caller and still enrich
        ({ requestId } as Record<string, unknown>),
    init
  )

  json.headers.set('x-request-id', requestId)
  return json
}

