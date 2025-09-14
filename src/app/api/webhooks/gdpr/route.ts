import { NextRequest, NextResponse } from 'next/server'
import { verifyHmac } from '@/lib/auth/oauth'
import { db, shops, brokenUrls, redirects, imports, subscriptions, settings, alerts } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    // Get raw body for HMAC verification
    const body = await request.text()
    const hmacHeader = request.headers.get('x-shopify-hmac-sha256')

    if (!hmacHeader || !verifyHmac(body, hmacHeader)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = JSON.parse(body)
    const { topic, shop_domain } = payload

    console.log(`GDPR webhook received: ${topic} for ${shop_domain}`)

    switch (topic) {
      case 'customers/data_request':
        // Handle customer data request
        await handleCustomerDataRequest(payload)
        break

      case 'customers/redact':
        // Handle customer data deletion
        await handleCustomerRedact(payload)
        break

      case 'shop/redact':
        // Handle shop data deletion
        await handleShopRedact(payload)
        break

      default:
        console.log(`Unknown GDPR webhook topic: ${topic}`)
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Error processing GDPR webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleCustomerDataRequest(payload: any): Promise<void> {
  // For this app, we don't store customer-specific data
  // We only track URLs and redirects, not customer information
  console.log('Customer data request - no customer data stored in this app')
}

async function handleCustomerRedact(payload: any): Promise<void> {
  // For this app, we don't store customer-specific data
  // No action needed
  console.log('Customer redact - no customer data to redact in this app')
}

async function handleShopRedact(payload: any): Promise<void> {
  const shopDomain = payload.shop_domain

  try {
    // Find the shop
    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.shopDomain, shopDomain))
      .limit(1)

    if (!shop) {
      console.log(`Shop not found for redaction: ${shopDomain}`)
      return
    }

    // Delete all shop data
    await Promise.all([
      db.delete(alerts).where(eq(alerts.shopId, shop.id)),
      db.delete(settings).where(eq(settings.shopId, shop.id)),
      db.delete(subscriptions).where(eq(subscriptions.shopId, shop.id)),
      db.delete(imports).where(eq(imports.shopId, shop.id)),
      db.delete(redirects).where(eq(redirects.shopId, shop.id)),
      db.delete(brokenUrls).where(eq(brokenUrls.shopId, shop.id)),
    ])

    // Finally delete the shop record
    await db.delete(shops).where(eq(shops.id, shop.id))

    console.log(`Shop data redacted for: ${shopDomain}`)
  } catch (error) {
    console.error(`Error redacting shop data for ${shopDomain}:`, error)
  }
}
