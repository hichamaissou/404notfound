import { eq, sql } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { jsonWithRequestId } from '@/core/api/respond'
import { brokenUrls, db, shops } from '@/lib/db'
import { extractShopFromQuery, verifyAppProxySignature } from '@/lib/shopify/proxy'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query: Record<string, string> = {}
  
  // Convert URLSearchParams to plain object
  for (const [key, value] of searchParams.entries()) {
    query[key] = value
  }

  // Verify App Proxy signature. In development, allow missing/invalid HMAC.
  const isValid = verifyAppProxySignature(query)
  if (!isValid && process.env.NODE_ENV !== 'development') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const shopDomain = extractShopFromQuery(query)
  const path = query.path

  if (!shopDomain || !path) {
    return new NextResponse('Bad Request', { status: 400 })
  }

  try {
    // Find shop in database
    const [shop] = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.shopDomain, shopDomain))
      .limit(1)

    if (!shop) {
      // Shop not found, but don't expose this to prevent enumeration
      return new NextResponse('OK', { status: 200 })
    }

    // Upsert broken URL record
    await db
      .insert(brokenUrls)
      .values({
        shopId: shop.id,
        path: decodeURIComponent(path),
        hits: 1,
      })
      .onConflictDoUpdate({
        target: [brokenUrls.shopId, brokenUrls.path],
        set: {
          hits: sql`hits + 1`,
          lastSeen: new Date(),
        },
      })

    // Return a 1x1 transparent GIF
    const gifBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )

    return new NextResponse(gifBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': gifBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('Error tracking 404:', error)
    
    // Return success to avoid breaking the page
    const gifBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    )

    return new NextResponse(gifBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Content-Length': gifBuffer.length.toString(),
      },
    })
  }
}
