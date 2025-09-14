/**
 * OAuth compatibility layer.
 * Re-exports from the new modules structure to maintain backward compatibility.
 */

import crypto from 'crypto'

// Legacy function name mappings for backward compatibility
export function buildAuthUrl(shop: string, state: string): string {
  const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY
  const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES  
  const SHOPIFY_APP_URL = process.env.SHOPIFY_APP_URL
  
  const params = new URLSearchParams({
    client_id: SHOPIFY_API_KEY || '',
    scope: SHOPIFY_SCOPES || '',
    redirect_uri: `${SHOPIFY_APP_URL}/api/auth/callback`,
    state,
    'grant_options[]': 'per-user',
  })
  
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`
}

export function generateState(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Legacy shop domain validation function.
 * @deprecated Use zod schema validation instead
 */
export function validateShopDomain(shop: string): boolean {
  return /^[a-zA-Z0-9\-]+\.myshopify\.com$/.test(shop)
}

export function verifyHmac(params: Record<string, string>): boolean {
  const { hmac, ...query } = params
  const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET
  
  if (!hmac || !SHOPIFY_API_SECRET) {
    return false
  }
  
  const queryString = new URLSearchParams(query).toString()
  const expectedHmac = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(queryString)
    .digest('hex')
  
  return hmac === expectedHmac
}

export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ access_token: string; scope: string }> {
  const tokenUrl = `https://${shop}/admin/oauth/access_token`
  const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY
  const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET
  
  const body = {
    client_id: SHOPIFY_API_KEY || '',
    client_secret: SHOPIFY_API_SECRET || '',
    code,
  }
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  })
  
  if (!response.ok) {
    throw new Error('Failed to exchange authorization code')
  }
  
  return await response.json()
}