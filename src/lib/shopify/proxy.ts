import crypto from 'crypto'

export function verifyAppProxySignature(query: Record<string, string>): boolean {
  const { signature, ...params } = query

  if (!signature) {
    return false
  }

  // Sort parameters and create canonical query string
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')

  // Calculate HMAC
  const calculatedSignature = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
    .update(sortedParams)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(calculatedSignature),
    Buffer.from(signature)
  )
}

export function extractShopFromQuery(query: Record<string, string>): string | null {
  const shop = query.shop
  if (!shop || !shop.endsWith('.myshopify.com')) {
    return null
  }
  return shop
}
