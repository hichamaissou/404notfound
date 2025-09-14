import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromHeaders } from '@/lib/auth/jwt'
import { db, redirects, shops, brokenUrls } from '@/lib/db'
import { eq, desc, and } from 'drizzle-orm'
import { createShopifyAdminGraphQL } from '@/lib/shopify/admin-graphql'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromHeaders(request.headers)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shopRedirects = await db
      .select()
      .from(redirects)
      .where(eq(redirects.shopId, session.shopId))
      .orderBy(desc(redirects.createdAt))

    return NextResponse.json({ redirects: shopRedirects })
  } catch (error) {
    console.error('Error fetching redirects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromHeaders(request.headers)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { path, target } = await request.json()

    if (!path || !target) {
      return NextResponse.json({ error: 'Path and target are required' }, { status: 400 })
    }

    // Get shop details for Shopify API
    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.id, session.shopId))
      .limit(1)

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Create redirect in Shopify
    const shopifyAdmin = createShopifyAdminGraphQL(shop.shopDomain, shop.accessToken)
    const shopifyRedirect = await shopifyAdmin.createUrlRedirect({ path, target })

    // Store in local database
    const [localRedirect] = await db
      .insert(redirects)
      .values({
        shopId: session.shopId,
        shopifyId: shopifyRedirect.id,
        path,
        target,
        createdBy: 'manual',
      })
      .returning()

    // Mark corresponding broken URL as resolved
    await db
      .update(brokenUrls)
      .set({ resolved: true })
      .where(and(
        eq(brokenUrls.shopId, session.shopId),
        eq(brokenUrls.path, path)
      ))

    return NextResponse.json({ redirect: localRedirect })
  } catch (error) {
    console.error('Error creating redirect:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create redirect' 
    }, { status: 500 })
  }
}
