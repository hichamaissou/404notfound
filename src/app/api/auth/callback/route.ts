import { NextRequest, NextResponse } from 'next/server'
import { validateShopDomain, exchangeCodeForToken } from '@/lib/auth/oauth'
import { createJWT } from '@/lib/auth/jwt'
import { db, shops, settings, subscriptions } from '@/lib/db'
import { eq } from 'drizzle-orm'
import type { InferInsertModel } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  // Verify state parameter
  const storedState = request.cookies.get('oauth_state')?.value
  if (!state || !storedState || state !== storedState) {
    return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 })
  }

  if (!shop || !code) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
  }

  if (!validateShopDomain(shop)) {
    return NextResponse.json({ error: 'Invalid shop domain' }, { status: 400 })
  }

  try {
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(shop, code)

    // Store or update shop in database
    const [shopRecord] = await db
      .insert(shops)
      .values({
        shopDomain: shop,
        accessToken: tokenData.access_token,
        scope: tokenData.scope,
      })
      .onConflictDoUpdate({
        target: shops.shopDomain,
        set: {
          accessToken: tokenData.access_token,
          scope: tokenData.scope,
          updatedAt: new Date(),
        },
      })
      .returning()

    // Create default settings if they don't exist
    await db
      .insert(settings)
      .values({
        shopId: shopRecord.id,
      })
      .onConflictDoNothing()

    // Create default subscription (trial) if it doesn't exist
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + parseInt(process.env.BILLING_TRIAL_DAYS || '14'))
    const planName = process.env.BILLING_PLAN_NAME ?? 'Pro';
    const priceAmount = process.env.BILLING_PRICE_AMOUNT ?? '14.00';
    const currency = process.env.BILLING_CURRENCY ?? 'EUR';

    const subscriptionData: InferInsertModel<typeof subscriptions> = {
      shopId: shopRecord.id,
      planName,
      priceAmount,
      currency,
      status: 'active', // Start with trial
      trialEndsAt,
    }

    await db
      .insert(subscriptions)
      .values(subscriptionData)
      .onConflictDoNothing()

    // Create JWT token
    const token = await createJWT({
      shopId: shopRecord.id,
      shopDomain: shop,
    })

    // Redirect to app with token
    const appUrl = `/?token=${token}&shop=${shop}`
    return NextResponse.redirect(new URL(appUrl, request.url))
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}
