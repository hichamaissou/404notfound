/**
 * Shopify OAuth 2.0 flow implementation.
 * Handles authorization URL generation, state verification, and token exchange.
 */

import crypto from 'crypto'

import { env } from '../../config/env'
import { BadRequestError,ExternalServiceError } from '../../core/errors'
import { logger } from '../../core/logger'

/**
 * Generates a secure random state parameter for OAuth flow.
 * Used to prevent CSRF attacks during authorization.
 * 
 * @returns Random state string
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Builds the Shopify OAuth authorization URL.
 * Redirects user to Shopify for app installation/permission grant.
 * 
 * @param shop - The shop domain (e.g., 'example.myshopify.com')
 * @param state - CSRF protection state parameter
 * @returns Complete authorization URL
 */
export function buildAuthorizeUrl(shop: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.SHOPIFY_API_KEY,
    scope: env.SHOPIFY_SCOPES,
    redirect_uri: `${env.SHOPIFY_APP_URL}/api/auth/callback`,
    state,
    'grant_options[]': 'per-user',
  })
  
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`
}

/**
 * Verifies the OAuth callback parameters from Shopify.
 * Validates HMAC signature and state parameter for security.
 * 
 * @param params - Query parameters from OAuth callback
 * @param expectedState - The state parameter we sent initially
 * @throws BadRequestError if validation fails
 */
export function verifyCallback(
  params: Record<string, string>,
  expectedState: string
): void {
  const { code, hmac, state, shop } = params
  
  // Verify required parameters
  if (!code || !hmac || !state || !shop) {
    throw new BadRequestError('Missing required OAuth parameters')
  }
  
  // Verify state parameter (CSRF protection)
  if (state !== expectedState) {
    throw new BadRequestError('Invalid state parameter')
  }
  
  // Verify HMAC signature
  const query = new URLSearchParams(params)
  query.delete('hmac')
  query.delete('signature')
  
  const queryString = query.toString()
  const expectedHmac = crypto
    .createHmac('sha256', env.SHOPIFY_API_SECRET)
    .update(queryString)
    .digest('hex')
  
  if (hmac !== expectedHmac) {
    throw new BadRequestError('Invalid HMAC signature')
  }
  
  logger.info('OAuth callback verified successfully', { shop })
}

/**
 * Exchanges authorization code for access token.
 * Makes API call to Shopify to complete OAuth flow.
 * 
 * @param shop - The shop domain
 * @param code - Authorization code from callback
 * @returns Object containing access token and scope
 * @throws ExternalServiceError if token exchange fails
 */
export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ access_token: string; scope: string }> {
  const tokenUrl = `https://${shop}/admin/oauth/access_token`
  
  const body = {
    client_id: env.SHOPIFY_API_KEY,
    client_secret: env.SHOPIFY_API_SECRET,
    code,
  }
  
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Token exchange failed', {
        shop,
        status: response.status,
        error: errorText,
      })
      throw new ExternalServiceError('Failed to exchange authorization code')
    }
    
    const tokenData = await response.json()
    
    logger.info('OAuth token exchange successful', { shop })
    
    return tokenData
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error
    }
    
    logger.error('Token exchange error', {
      shop,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    
    throw new ExternalServiceError('Failed to exchange authorization code')
  }
}
