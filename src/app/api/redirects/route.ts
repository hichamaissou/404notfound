import { and,desc, eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { getSessionFromHeaders } from '@/lib/auth/jwt'
import { brokenUrls,db, redirects, shops } from '@/lib/db'
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
        fromPath: path,
        toPath: target,
      })
      .returning()

    // Mark corresponding broken URL as resolved
    await db
      .update(brokenUrls)
      .set({ isResolved: true, resolvedAt: new Date() })
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
