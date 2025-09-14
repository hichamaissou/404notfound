import { jwtVerify,SignJWT } from 'jose'

const secret = new TextEncoder().encode(process.env.ENCRYPTION_KEY)

export interface JWTPayload {
  shopId: string
  shopDomain: string
  iat?: number
  exp?: number
}

export async function createJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as JWTPayload
}

export function extractJWTFromHeaders(headers: Headers): string | null {
  const authorization = headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return null
  }
  return authorization.slice(7)
}

export async function getSessionFromHeaders(headers: Headers): Promise<JWTPayload | null> {
  const token = extractJWTFromHeaders(headers)
  if (!token) return null
  
  try {
    return await verifyJWT(token)
  } catch {
    return null
  }
}
