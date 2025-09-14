import crypto from 'crypto'

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex')
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex')
}

export function buildAuthUrl(shop: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_API_KEY!,
    scope: process.env.SHOPIFY_SCOPES!,
    redirect_uri: `${process.env.SHOPIFY_APP_URL}/api/auth/callback`,
    state,
    'grant_options[]': 'offline', // For offline access tokens
  })

  return `https://${shop}/admin/oauth/authorize?${params.toString()}`
}

export function validateShopDomain(shop: string): boolean {
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$/
  return shopRegex.test(shop)
}

export async function exchangeCodeForToken(shop: string, code: string): Promise<{
  access_token: string
  scope: string
}> {
  const requestBody = {
    client_id: process.env.SHOPIFY_API_KEY,
    client_secret: process.env.SHOPIFY_API_SECRET,
    code,
  }

  console.log('Token exchange request:', { 
    shop, 
    url: `https://${shop}/admin/oauth/access_token`,
    client_id: process.env.SHOPIFY_API_KEY ? 'present' : 'missing',
    client_secret: process.env.SHOPIFY_API_SECRET ? 'present' : 'missing',
    code: code ? 'present' : 'missing'
  })

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Token exchange failed:', { 
      status: response.status, 
      statusText: response.statusText, 
      body: errorText 
    })
    throw new Error(`OAuth token exchange failed: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const tokenData = await response.json()
  console.log('Token exchange response received:', { hasAccessToken: !!tokenData.access_token, scope: tokenData.scope })
  return tokenData
}

export function verifyHmac(data: string, hmac: string): boolean {
  const calculatedHmac = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
    .update(data)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(calculatedHmac),
    Buffer.from(hmac)
  )
}
