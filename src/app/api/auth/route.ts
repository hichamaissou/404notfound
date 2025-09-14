import { NextRequest, NextResponse } from 'next/server'

import { buildAuthUrl, generateState,validateShopDomain } from '@/lib/auth/oauth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')

  if (!shop) {
    return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
  }

  if (!validateShopDomain(shop)) {
    return NextResponse.json({ error: 'Invalid shop domain' }, { status: 400 })
  }

  const state = generateState()
  const authUrl = buildAuthUrl(shop, state)

  console.log('Setting oauth_state cookie:', { state, shop, authUrl })

  // Store state in a cookie for verification in callback
  const response = NextResponse.redirect(authUrl)
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: true, // Always secure for Shopify apps
    sameSite: 'none', // Required for embedded apps
    maxAge: 600, // 10 minutes (increased for safety)
    path: '/', // Ensure cookie is available on all paths
  })

  console.log('Cookie set successfully, redirecting to:', authUrl)
  return response
}
