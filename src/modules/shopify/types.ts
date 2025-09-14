/**
 * TypeScript types for Shopify Admin API objects.
 * Minimal types focused on what our app actually uses.
 */

/**
 * Shopify URL Redirect object structure.
 */
export interface UrlRedirect {
  /** Shopify Global ID (e.g., 'gid://shopify/UrlRedirect/123') */
  id: string
  /** Source path to redirect from (e.g., '/old-page') */
  path: string
  /** Target URL to redirect to (e.g., '/new-page' or 'https://example.com') */
  target: string
}

/**
 * Input type for creating URL redirects.
 */
export interface UrlRedirectInput {
  /** Source path to redirect from */
  path: string
  /** Target URL to redirect to */
  target: string
}

/**
 * Shopify Shop object (minimal fields we use).
 */
export interface Shop {
  /** Shop ID */
  id: string
  /** Shop domain (e.g., 'example.myshopify.com') */
  domain: string
  /** Shop name */
  name: string
  /** Shop email */
  email: string
  /** Shop plan name */
  plan: {
    displayName: string
  }
}

/**
 * Shopify GraphQL error structure.
 */
export interface GraphQLError {
  /** Error message */
  message: string
  /** Error locations in query */
  locations?: Array<{
    line: number
    column: number
  }>
  /** Error path */
  path?: string[]
  /** Additional error extensions */
  extensions?: Record<string, unknown>
}

/**
 * Standard Shopify user error structure.
 */
export interface UserError {
  /** Field that caused the error */
  field: string[]
  /** Human-readable error message */
  message: string
}
