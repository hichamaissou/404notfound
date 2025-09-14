import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Only allow in development or with debug key
  const { searchParams } = new URL(request.url)
  const debugKey = searchParams.get('key')
  
  if (process.env.NODE_ENV === 'production' && debugKey !== process.env.DEBUG_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    env: process.env.NODE_ENV,
    config: {
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? 'present' : 'missing',
      SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? 'present' : 'missing',
      SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES || 'missing',
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL || 'missing',
      DATABASE_URL: process.env.DATABASE_URL ? 'present' : 'missing',
      JWT_SECRET: process.env.JWT_SECRET ? 'present' : 'missing',
    },
    urls: {
      authUrl: `${process.env.SHOPIFY_APP_URL}/api/auth`,
      callbackUrl: `${process.env.SHOPIFY_APP_URL}/api/auth/callback`,
    }
  })
}
