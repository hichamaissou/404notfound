import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromHeaders } from '@/lib/auth/jwt'
import { db, subscriptions, shops } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromHeaders(request.headers)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get shop details
    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.id, session.shopId))
      .limit(1)

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // In test mode, simulate successful subscription
    if (process.env.BILLING_TEST_MODE === 'true') {
      const currentPeriodEnd = new Date()
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1) // Next month

      await db
        .update(subscriptions)
        .set({
          status: 'active',
          shopifySubscriptionId: 'test_subscription_' + Date.now(),
          currentPeriodEnd,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.shopId, session.shopId))

      return NextResponse.json({
        success: true,
        message: 'Subscription activated (test mode)',
        confirmationUrl: null,
      })
    }

    // In production, you would create a Shopify recurring charge here
    const chargeData = {
      recurring_application_charge: {
        name: process.env.BILLING_PLAN_NAME || 'Pro',
        price: process.env.BILLING_PRICE_AMOUNT || '14.00',
        currency: process.env.BILLING_CURRENCY || 'EUR',
        return_url: `${process.env.SHOPIFY_APP_URL}/?billing=success`,
        trial_days: parseInt(process.env.BILLING_TRIAL_DAYS || '14'),
        test: process.env.BILLING_TEST_MODE === 'true',
      },
    }

    const response = await fetch(`https://${shop.shopDomain}/admin/api/${process.env.SHOPIFY_API_VERSION}/recurring_application_charges.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': shop.accessToken,
      },
      body: JSON.stringify(chargeData),
    })

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.statusText}`)
    }

    const result = await response.json()
    const charge = result.recurring_application_charge

    // Update subscription with charge ID
    await db
      .update(subscriptions)
      .set({
        shopifySubscriptionId: charge.id.toString(),
        status: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.shopId, session.shopId))

    return NextResponse.json({
      success: true,
      confirmationUrl: charge.confirmation_url,
      chargeId: charge.id,
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create subscription' 
    }, { status: 500 })
  }
}
