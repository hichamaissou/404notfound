import { eq } from 'drizzle-orm'

import { JWTPayload } from '@/lib/auth/jwt'
import { db, subscriptions } from '@/lib/db'

export interface BillingStatus {
  hasActiveSubscription: boolean
  isInTrial: boolean
  trialExpired: boolean
  needsUpgrade: boolean
}

export async function checkBillingStatus(shopId: string): Promise<BillingStatus> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.shopId, shopId))
    .limit(1)

  if (!subscription) {
    return {
      hasActiveSubscription: false,
      isInTrial: false,
      trialExpired: true,
      needsUpgrade: true,
    }
  }

  const now = new Date()
  const trialEndsAt = subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null
  const isInTrial = trialEndsAt && now < trialEndsAt
  const trialExpired = trialEndsAt && now >= trialEndsAt

  const hasActiveSubscription = subscription.status === 'active' && (
    !!isInTrial || // Still in trial
    !!subscription.currentPeriodEnd // Has paid billing
  )

  return {
    hasActiveSubscription,
    isInTrial: !!isInTrial,
    trialExpired: !!trialExpired && !subscription.currentPeriodEnd,
    needsUpgrade: !hasActiveSubscription,
  }
}

export async function requireProSubscription(session: JWTPayload): Promise<boolean> {
  const billing = await checkBillingStatus(session.shopId)
  return billing.hasActiveSubscription
}

// Features that require Pro subscription
export const PRO_FEATURES = {
  ADVANCED_CRAWLING: 'advanced_crawling',
  REGEX_RULES: 'regex_rules',
  BULK_IMPORT: 'bulk_import',
  WEEKLY_DIGEST: 'weekly_digest',
  API_ACCESS: 'api_access',
} as const

export async function hasFeatureAccess(
  shopId: string, 
  feature: string
): Promise<boolean> {
  const billing = await checkBillingStatus(shopId)
  
  // Basic features are always available
  const basicFeatures = ['basic_404_tracking', 'manual_redirects']
  if (basicFeatures.includes(feature)) {
    return true
  }
  
  // Pro features require active subscription
  return billing.hasActiveSubscription
}
