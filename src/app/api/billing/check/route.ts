import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromHeaders } from '@/lib/auth/jwt'
import { db, subscriptions } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromHeaders(request.headers)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get subscription details
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.shopId, session.shopId))
      .limit(1)

    if (!subscription) {
      return NextResponse.json({
        hasActiveSubscription: false,
        trialExpired: true,
        needsSubscription: true,
      })
    }

    const now = new Date()
    const trialEndsAt = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null
    const isInTrial = trialEndsAt && now < trialEndsAt
    const trialExpired = trialEndsAt && now >= trialEndsAt

    const hasActiveSubscription = subscription.status === 'active' && (
      isInTrial || // Still in trial
      subscription.billingOn // Has paid billing
    )

    return NextResponse.json({
      hasActiveSubscription,
      isInTrial,
      trialExpired: trialExpired && !subscription.billingOn,
      trialEndsAt: subscription.trialEndsAt,
      status: subscription.status,
      planName: subscription.planName,
      price: subscription.price,
      currency: subscription.currency,
      needsSubscription: !hasActiveSubscription,
    })
  } catch (error) {
    console.error('Error checking billing status:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to check billing status' 
    }, { status: 500 })
  }
}
