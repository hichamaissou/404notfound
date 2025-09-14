export interface GraphQLResponse<T = any> {
  data?: T
  errors?: Array<{
    message: string
    locations?: Array<{ line: number; column: number }>
    path?: string[]
  }>
  extensions?: any
}

export interface UrlRedirect {
  id: string
  path: string
  target: string
}

export interface UrlRedirectInput {
  path: string
  target: string
}

export class ShopifyAdminGraphQL {
  private shopDomain: string
  private accessToken: string
  private apiVersion: string

  constructor(shopDomain: string, accessToken: string, apiVersion = '2025-07') {
    this.shopDomain = shopDomain
    this.accessToken = accessToken
    this.apiVersion = apiVersion
  }

  private async request<T = any>(query: string, variables?: any): Promise<T> {
    const url = `https://${this.shopDomain}/admin/api/${this.apiVersion}/graphql.json`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
    }

    const result: GraphQLResponse<T> = await response.json()

    if (result.errors && result.errors.length > 0) {
      throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`)
    }

    if (!result.data) {
      throw new Error('No data returned from GraphQL request')
    }

    return result.data
  }

  async createUrlRedirect(input: UrlRedirectInput): Promise<UrlRedirect> {
    const query = `
      mutation urlRedirectCreate($urlRedirect: UrlRedirectInput!) {
        urlRedirectCreate(urlRedirect: $urlRedirect) {
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

    const response = await this.request(query, { urlRedirect: input })
    
    if (response.urlRedirectCreate.userErrors.length > 0) {
      const errors = response.urlRedirectCreate.userErrors.map((e: any) => e.message).join(', ')
      throw new Error(`Failed to create redirect: ${errors}`)
    }

    return response.urlRedirectCreate.urlRedirect
  }

  async deleteUrlRedirect(id: string): Promise<boolean> {
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

    const response = await this.request(query, { id })
    
    if (response.urlRedirectDelete.userErrors.length > 0) {
      const errors = response.urlRedirectDelete.userErrors.map((e: any) => e.message).join(', ')
      throw new Error(`Failed to delete redirect: ${errors}`)
    }

    return !!response.urlRedirectDelete.deletedUrlRedirectId
  }

  async getUrlRedirects(first = 50, after?: string): Promise<{
    edges: Array<{ node: UrlRedirect; cursor: string }>
    pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean }
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
            cursor
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
          }
        }
      }
    `

    const response = await this.request(query, { first, after })
    return response.urlRedirects
  }

  async getProducts(first = 50): Promise<Array<{ handle: string; id: string }>> {
    const query = `
      query products($first: Int!) {
        products(first: $first) {
          edges {
            node {
              id
              handle
            }
          }
        }
      }
    `

    const response = await this.request(query, { first })
    return response.products.edges.map((edge: any) => edge.node)
  }

  async getCollections(first = 50): Promise<Array<{ handle: string; id: string }>> {
    const query = `
      query collections($first: Int!) {
        collections(first: $first) {
          edges {
            node {
              id
              handle
            }
          }
        }
      }
    `

    const response = await this.request(query, { first })
    return response.collections.edges.map((edge: any) => edge.node)
  }

  async getPages(first = 50): Promise<Array<{ handle: string; id: string }>> {
    const query = `
      query pages($first: Int!) {
        pages(first: $first) {
          edges {
            node {
              id
              handle
            }
          }
        }
      }
    `

    const response = await this.request(query, { first })
    return response.pages.edges.map((edge: any) => edge.node)
  }

  async getBlogs(first = 50): Promise<Array<{ handle: string; id: string }>> {
    const query = `
      query blogs($first: Int!) {
        blogs(first: $first) {
          edges {
            node {
              id
              handle
            }
          }
        }
      }
    `

    const response = await this.request(query, { first })
    return response.blogs.edges.map((edge: any) => edge.node)
  }

  async getArticles(blogId: string, first = 50): Promise<Array<{ handle: string; id: string }>> {
    const query = `
      query articles($blogId: ID!, $first: Int!) {
        blog(id: $blogId) {
          articles(first: $first) {
            edges {
              node {
                id
                handle
              }
            }
          }
        }
      }
    `

    const response = await this.request(query, { blogId, first })
    return response.blog?.articles?.edges?.map((edge: any) => edge.node) || []
  }
}

export function createShopifyAdminGraphQL(shopDomain: string, accessToken: string): ShopifyAdminGraphQL {
  return new ShopifyAdminGraphQL(shopDomain, accessToken)
}
