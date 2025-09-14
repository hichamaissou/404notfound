import { NextRequest, NextResponse } from 'next/server'
import { validateShopDomain, buildAuthUrl, generateState } from '@/lib/auth/oauth'

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

  // Store state in a cookie for verification in callback
  const response = NextResponse.redirect(authUrl)
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300, // 5 minutes
  })

  return response
}
