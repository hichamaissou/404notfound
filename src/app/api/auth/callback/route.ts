import { NextRequest, NextResponse } from 'next/server'
import { validateShopDomain, exchangeCodeForToken } from '@/lib/auth/oauth'
import { createJWT } from '@/lib/auth/jwt'
import { db, shops, settings, subscriptions } from '@/lib/db'
import { eq } from 'drizzle-orm'
import type { InferInsertModel } from 'drizzle-orm'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const shop = searchParams.get('shop')
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  console.log('OAuth callback received:', { shop, code: code ? 'present' : 'missing', state: state ? 'present' : 'missing' })

  // Log all cookies for debugging
  const allCookies = request.cookies.getAll()
  console.log('All cookies received:', allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 10) + '...' })))

  // Verify state parameter
  const storedState = request.cookies.get('oauth_state')?.value
  console.log('State verification:', { 
    received: state, 
    stored: storedState,
    match: state === storedState,
    receivedLength: state?.length,
    storedLength: storedState?.length
  })
  
  if (!state || !storedState || state !== storedState) {
    console.error('State verification failed:', { received: state, stored: storedState })
    return NextResponse.json({ 
      error: 'Invalid state parameter', 
      debug: { 
        received: state, 
        stored: storedState,
        cookiesCount: allCookies.length,
        allCookieNames: allCookies.map(c => c.name)
      } 
    }, { status: 400 })
  }

  if (!shop || !code) {
    console.error('Missing required parameters:', { shop, code: code ? 'present' : 'missing' })
    return NextResponse.json({ error: 'Missing required parameters', debug: { shop, code: code ? 'present' : 'missing' } }, { status: 400 })
  }

  if (!validateShopDomain(shop)) {
    console.error('Invalid shop domain:', shop)
    return NextResponse.json({ error: 'Invalid shop domain', debug: { shop } }, { status: 400 })
  }

  try {
    console.log('Attempting token exchange for shop:', shop)
    // Exchange code for access token
    const tokenData = await exchangeCodeForToken(shop, code)
    console.log('Token exchange successful:', { scope: tokenData.scope })

    // Store or update shop in database
    console.log('Attempting to insert/update shop:', { shop, scope: tokenData.scope })
    
    let shopRecord
    try {
      // Generate UUID manually for the insert
      const shopId: string = crypto.randomUUID()
      
      const result = await db
        .insert(shops)
        .values({
          id: shopId,
          shopDomain: shop,
          accessToken: tokenData.access_token,
          scope: tokenData.scope,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
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
      
      shopRecord = result[0]
      console.log('Shop record created/updated:', { id: shopRecord.id, domain: shopRecord.shopDomain })
    } catch (dbError) {
      console.error('Database error details:', {
        error: dbError,
        message: dbError instanceof Error ? dbError.message : 'Unknown DB error',
        stack: dbError instanceof Error ? dbError.stack : undefined
      })
      throw new Error(`Database operation failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
    }

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
    const appUrl = `/embedded?token=${token}&shop=${shop}`
    return NextResponse.redirect(new URL(appUrl, request.url))
  } catch (error) {
    console.error('OAuth callback error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ 
      error: 'Authentication failed', 
      debug: { 
        message: errorMessage,
        type: error instanceof Error ? error.constructor.name : typeof error
      } 
    }, { status: 500 })
  }
}
