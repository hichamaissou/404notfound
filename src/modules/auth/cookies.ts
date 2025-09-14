/**
 * OAuth cookie management for Shopify embedded apps.
 * Handles secure cookie operations with proper SameSite settings.
 */

import { NextRequest, NextResponse } from 'next/server'

import { env } from '../../config/env'

/**
 * Cookie options for OAuth state and tokens in embedded apps.
 * Uses SameSite=None and Secure=true for cross-origin iframe compatibility.
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  path: '/',
  maxAge: 60 * 60, // 1 hour
}

/**
 * Sets the OAuth state cookie for CSRF protection.
 * 
 * @param response - Next.js response object
 * @param state - Random state string to store
 */
export function setStateCookie(response: NextResponse, state: string): void {
  response.cookies.set('oauth_state', state, COOKIE_OPTIONS)
}

/**
 * Gets the OAuth state from cookies.
 * 
 * @param request - Next.js request object
 * @returns State string or null if not found
 */
export function getStateCookie(request: NextRequest): string | null {
  return request.cookies.get('oauth_state')?.value ?? null
}

/**
 * Clears the OAuth state cookie after successful authentication.
 * 
 * @param response - Next.js response object
 */
export function clearStateCookie(response: NextResponse): void {
  response.cookies.set('oauth_state', '', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  })
}

/**
 * Sets the shop domain cookie for session management.
 * 
 * @param response - Next.js response object
 * @param shop - Shop domain to store
 */
export function setShopCookie(response: NextResponse, shop: string): void {
  response.cookies.set('shop_domain', shop, {
    ...COOKIE_OPTIONS,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  })
}

/**
 * Gets the shop domain from cookies.
 * 
 * @param request - Next.js request object
 * @returns Shop domain or null if not found
 */
export function getShopCookie(request: NextRequest): string | null {
  return request.cookies.get('shop_domain')?.value ?? null
}

/**
 * Sets the access token cookie (encrypted in production).
 * Note: In production, this should be encrypted or stored server-side.
 * 
 * @param response - Next.js response object
 * @param token - Access token to store
 */
export function setTokenCookie(response: NextResponse, token: string): void {
  // In production, encrypt the token before storing
  const tokenToStore = env.isProduction 
    ? encryptToken(token)
    : token
    
  response.cookies.set('access_token', tokenToStore, COOKIE_OPTIONS)
}

/**
 * Gets the access token from cookies (decrypted in production).
 * 
 * @param request - Next.js request object
 * @returns Decrypted access token or null if not found
 */
export function getTokenCookie(request: NextRequest): string | null {
  const tokenValue = request.cookies.get('access_token')?.value
  
  if (!tokenValue) {
    return null
  }
  
  // In production, decrypt the token
  return env.isProduction 
    ? decryptToken(tokenValue)
    : tokenValue
}

/**
 * Clears all OAuth-related cookies on logout.
 * 
 * @param response - Next.js response object
 */
export function clearAllCookies(response: NextResponse): void {
  const expiredOptions = { ...COOKIE_OPTIONS, maxAge: 0 }
  
  response.cookies.set('oauth_state', '', expiredOptions)
  response.cookies.set('shop_domain', '', expiredOptions)
  response.cookies.set('access_token', '', expiredOptions)
}

/**
 * Simple token encryption for production use.
 * In a real app, use a proper encryption library like @aws-crypto/client-node.
 */
function encryptToken(token: string): string {
  // Simplified encryption - use proper crypto library in production
  const crypto = require('crypto')
  const cipher = crypto.createCipher('aes-256-cbc', env.ENCRYPTION_KEY)
  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

/**
 * Simple token decryption for production use.
 */
function decryptToken(encryptedToken: string): string {
  try {
    const crypto = require('crypto')
    const decipher = crypto.createDecipher('aes-256-cbc', env.ENCRYPTION_KEY)
    let decrypted = decipher.update(encryptedToken, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    // If decryption fails, return empty string to force re-authentication
    return ''
  }
}
