import { NextRequest, NextResponse } from 'next/server'
import { db, shops, siteScans } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
    }

    // Check if shop exists
    const shopRecord = await db
      .select({ id: shops.id, shopDomain: shops.shopDomain })
      .from(shops)
      .where(eq(shops.shopDomain, shop))
      .limit(1)

    if (!shopRecord.length) {
      return NextResponse.json({ 
        error: 'Shop not found',
        debug: {
          shop,
          shopsCount: await db.select().from(shops).then(r => r.length),
          allShops: await db.select({ domain: shops.shopDomain }).from(shops)
        }
      }, { status: 404 })
    }

    const shopId = shopRecord[0].id

    // Check existing scans
    const existingScans = await db
      .select({
        id: siteScans.id,
        status: siteScans.status,
        startedAt: siteScans.startedAt,
      })
      .from(siteScans)
      .where(eq(siteScans.shopId, shopId))
      .limit(5)

    return NextResponse.json({
      success: true,
      shop: {
        id: shopId,
        domain: shopRecord[0].shopDomain
      },
      existingScans,
      canCreateScan: true
    })

  } catch (error) {
    console.error('Scan test error:', error)
    return NextResponse.json(
      { 
        error: 'Scan test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    )
  }
}
