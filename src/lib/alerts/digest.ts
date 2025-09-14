import { db, shops, brokenUrls, redirects, settings, alerts } from '@/lib/db'
import { eq, gte, desc, and } from 'drizzle-orm'
import { sendEmail, generateWeeklyDigestEmail, generateAlertEmail } from './email'

export async function sendWeeklyDigests(): Promise<void> {
  console.log('Starting weekly digest generation...')

  // Get all shops with weekly digest enabled
  const shopsWithDigest = await db
    .select({
      shop: shops,
      settings: settings,
    })
    .from(shops)
    .innerJoin(settings, eq(settings.shopId, shops.id))
    .where(eq(settings.digestEmail, true))

  for (const { shop, settings: shopSettings } of shopsWithDigest) {
    try {
      await generateAndSendDigest(shop, shopSettings)
    } catch (error) {
      console.error(`Error generating digest for ${shop.shopDomain}:`, error)
    }
  }

  console.log(`Weekly digests completed for ${shopsWithDigest.length} shops`)
}

async function generateAndSendDigest(shop: any, shopSettings: any): Promise<void> {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  // Get statistics for the week
  const [new404s, totalBrokenUrls, weeklyRedirects] = await Promise.all([
    // New 404s this week
    db
      .select()
      .from(brokenUrls)
      .where(and(
        eq(brokenUrls.shopId, shop.id),
        gte(brokenUrls.firstSeen, weekAgo)
      )),
    
    // All broken URLs for total hits
    db
      .select()
      .from(brokenUrls)
      .where(eq(brokenUrls.shopId, shop.id)),
    
    // Redirects created this week
    db
      .select()
      .from(redirects)
      .where(and(
        eq(redirects.shopId, shop.id),
        gte(redirects.createdAt, weekAgo)
      ))
  ])

  // Get top broken URLs this week
  const topBrokenUrls = new404s
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 5)
    .map(url => ({
      path: url.path,
      hits: url.hits,
    }))

  // Calculate estimated revenue loss
  const conversionRate = parseFloat(shopSettings.conversionRate)
  const avgOrderValue = parseFloat(shopSettings.averageOrderValue)
  const estimatedRevenueLoss = totalBrokenUrls.reduce((sum, url) => {
    return sum + (url.isResolved ? 0 : url.hits * conversionRate * avgOrderValue)
  }, 0)

  const digestData = {
    shopDomain: shop.shopDomain,
    new404s: new404s.length,
    totalHits: totalBrokenUrls.reduce((sum, url) => sum + url.hits, 0),
    topBrokenUrls,
    fixedRedirects: weeklyRedirects.length,
    estimatedRevenueLoss,
  }

  // Generate and send email
  const emailHtml = generateWeeklyDigestEmail(digestData)
  
  // For now, we'll use the shop domain as email (in production, you'd get the actual email)
  const emailAddress = `admin@${shop.shopDomain}`
  
  const emailSent = await sendEmail({
    to: emailAddress,
    subject: `Weekly 404 Digest - ${shop.shopDomain}`,
    html: emailHtml,
  })

  // Record the alert
  if (emailSent) {
    await db
      .insert(alerts)
      .values({
        shopId: shop.id,
        type: 'weekly_digest',
        payload: digestData,
      })
  }

  console.log(`Digest sent for ${shop.shopDomain}: ${new404s.length} new 404s, ${weeklyRedirects.length} redirects created`)
}

export async function sendAlert(
  shopId: string,
  alertType: string,
  message: string,
  details?: any
): Promise<void> {
  try {
    // Get shop details
    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.id, shopId))
      .limit(1)

    if (!shop) {
      console.error(`Shop not found for alert: ${shopId}`)
      return
    }

    // Check if alerts are enabled
    const [shopSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.shopId, shopId))
      .limit(1)

    // For now, always send alerts (alertsEnabled was removed from new schema)
    // if (!shopSettings?.alertsEnabled) {
    //   console.log(`Alerts disabled for ${shop.shopDomain}`)
    //   return
    // }

    // Send alert email (simplified - in production you'd get the actual email)
    const emailAddress = `admin@${shop.shopDomain}`
    
    const emailSent = await sendEmail({
      to: emailAddress,
      subject: `Alert: ${alertType} - ${shop.shopDomain}`,
      html: generateAlertEmail({
        shopDomain: shop.shopDomain,
        alertType,
        message,
        details,
      }),
    })

    // Record the alert
    if (emailSent) {
      await db
        .insert(alerts)
        .values({
          shopId,
          type: alertType,
          payload: { message, details },
        })
    }

    console.log(`Alert sent for ${shop.shopDomain}: ${alertType}`)
  } catch (error) {
    console.error('Error sending alert:', error)
  }
}

// Helper function to generate alerts based on 404 patterns
export async function checkAndSendAlerts(): Promise<void> {
  console.log('Checking for alert conditions...')

  // Get all shops
  const allShops = await db
    .select()
    .from(shops)

  for (const shop of allShops) {
    try {
      // Check for sudden spike in 404s (last hour vs previous hour)
      const now = new Date()
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000)
      const previousHour = new Date(now.getTime() - 2 * 60 * 60 * 1000)

      const [recentUrls, previousUrls] = await Promise.all([
        db
          .select()
          .from(brokenUrls)
          .where(and(
            eq(brokenUrls.shopId, shop.id),
            gte(brokenUrls.lastSeen, lastHour)
          )),
        
        db
          .select()
          .from(brokenUrls)
          .where(and(
            eq(brokenUrls.shopId, shop.id),
            gte(brokenUrls.lastSeen, previousHour),
            gte(brokenUrls.firstSeen, lastHour)
          ))
      ])

      const recentHits = recentUrls.reduce((sum, url) => sum + url.hits, 0)
      const previousHits = previousUrls.reduce((sum, url) => sum + url.hits, 0)

      // Alert if 404 hits increased by 200% or more
      if (previousHits > 0 && recentHits > previousHits * 2) {
        await sendAlert(
          shop.id,
          'spike_404s',
          `Sudden spike in 404 errors detected: ${recentHits} hits in the last hour (${Math.round((recentHits / previousHits - 1) * 100)}% increase)`,
          {
            recentHits,
            previousHits,
            topUrls: recentUrls.slice(0, 5).map(u => u.path),
          }
        )
      }

    } catch (error) {
      console.error(`Error checking alerts for ${shop.shopDomain}:`, error)
    }
  }
}
