/**
 * Shopify Admin GraphQL API client.
 * Provides typed interfaces for common Shopify operations without external dependencies.
 */

import { env } from '../../config/env'
import { ExternalServiceError } from '../../core/errors'
import { logger } from '../../core/logger'
import type { UrlRedirect, UrlRedirectInput } from './types'

/**
 * Makes an authenticated GraphQL request to Shopify Admin API.
 * 
 * @param shopDomain - The shop's domain (e.g., 'example.myshopify.com')
 * @param accessToken - OAuth access token for the shop
 * @param query - GraphQL query or mutation string
 * @param variables - Optional variables for the GraphQL operation
 * @returns Parsed JSON response from Shopify
 * @throws ExternalServiceError if the request fails
 */
export async function adminFetch(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<any> {
  const url = `https://${shopDomain}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      logger.error('Shopify API request failed', {
        shopDomain,
        status: response.status,
        error: errorText,
      })
      throw new ExternalServiceError(`Shopify API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.errors && data.errors.length > 0) {
      logger.error('Shopify GraphQL errors', {
        shopDomain,
        errors: data.errors,
      })
      throw new ExternalServiceError(`GraphQL errors: ${data.errors[0].message}`)
    }
    
    return data.data
  } catch (error) {
    if (error instanceof ExternalServiceError) {
      throw error
    }
    
    logger.error('Shopify API request error', {
      shopDomain,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    
    throw new ExternalServiceError('Failed to communicate with Shopify API')
  }
}

/**
 * Creates a URL redirect in Shopify.
 * 
 * @param shopDomain - The shop's domain
 * @param accessToken - OAuth access token
 * @param redirect - Redirect data (path and target)
 * @returns Created redirect object from Shopify
 */
export async function createUrlRedirect(
  shopDomain: string,
  accessToken: string,
  redirect: UrlRedirectInput
): Promise<UrlRedirect> {
  const query = `
    mutation urlRedirectCreate($redirect: UrlRedirectInput!) {
      urlRedirectCreate(urlRedirect: $redirect) {
        urlRedirect {
          id
          path
          target
        }
        userErrors {
          field
          message
        }
      }
    }
  `
  
  const data = await adminFetch(shopDomain, accessToken, query, { redirect })
  
  if (data.urlRedirectCreate.userErrors.length > 0) {
    const error = data.urlRedirectCreate.userErrors[0]
    throw new ExternalServiceError(`Shopify redirect creation failed: ${error.message}`)
  }
  
  return data.urlRedirectCreate.urlRedirect
}

/**
 * Deletes a URL redirect from Shopify.
 * 
 * @param shopDomain - The shop's domain
 * @param accessToken - OAuth access token
 * @param redirectId - Shopify redirect ID (gid://shopify/UrlRedirect/123)
 * @returns Success status
 */
export async function deleteUrlRedirect(
  shopDomain: string,
  accessToken: string,
  redirectId: string
): Promise<boolean> {
  const query = `
    mutation urlRedirectDelete($id: ID!) {
      urlRedirectDelete(id: $id) {
        deletedUrlRedirectId
        userErrors {
          field
          message
        }
      }
    }
  `
  
  const data = await adminFetch(shopDomain, accessToken, query, { id: redirectId })
  
  if (data.urlRedirectDelete.userErrors.length > 0) {
    const error = data.urlRedirectDelete.userErrors[0]
    throw new ExternalServiceError(`Shopify redirect deletion failed: ${error.message}`)
  }
  
  return Boolean(data.urlRedirectDelete.deletedUrlRedirectId)
}

/**
 * Lists URL redirects from Shopify with pagination.
 * 
 * @param shopDomain - The shop's domain
 * @param accessToken - OAuth access token
 * @param first - Number of redirects to fetch (max 250)
 * @param after - Cursor for pagination
 * @returns Paginated list of redirects
 */
export async function listUrlRedirects(
  shopDomain: string,
  accessToken: string,
  first = 50,
  after?: string
): Promise<{
  redirects: UrlRedirect[]
  hasNextPage: boolean
  endCursor?: string
}> {
  const query = `
    query urlRedirects($first: Int!, $after: String) {
      urlRedirects(first: $first, after: $after) {
        edges {
          node {
            id
            path
            target
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `
  
  const data = await adminFetch(shopDomain, accessToken, query, { first, after })
  
  return {
    redirects: data.urlRedirects.edges.map((edge: any) => edge.node),
    hasNextPage: data.urlRedirects.pageInfo.hasNextPage,
    endCursor: data.urlRedirects.pageInfo.endCursor,
  }
}
