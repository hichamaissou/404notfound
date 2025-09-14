import { NextRequest, NextResponse } from 'next/server'
import { validateShopDomain } from '@/lib/auth/oauth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
  }

  if (!validateShopDomain(shop)) {
    return NextResponse.json({ error: 'Invalid shop domain' }, { status: 400 })
  }

  const baseAppUrl = (process.env.SHOPIFY_APP_URL || '').replace(/\/+$/, '');
  const redirectUri = `${baseAppUrl}/api/auth/callback`;

  const state = crypto.randomUUID()
  const scope = process.env.SCOPES || 'read_products'
  const nonce = crypto.randomUUID()

  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_API_KEY || '',
    scope,
    redirect_uri: redirectUri,
    state,
    'grant_options[]': 'per-user',
  })

  const authUrl = `https://${shop}/admin/oauth/authorize?${params.toString()}`

  const response = NextResponse.redirect(authUrl)
  response.cookies.set('oauth_state', state, { httpOnly: true, sameSite: 'lax' })
  response.cookies.set('oauth_nonce', nonce, { httpOnly: true, sameSite: 'lax' })

  return response
}
