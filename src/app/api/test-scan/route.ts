import { NextRequest, NextResponse } from 'next/server'
import { db, shops, siteScans, jobs } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    console.log('Test scan API called')
    
    const body = await request.json()
    const { shop } = body

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
    }

    // Test database connection
    console.log('Testing database connection...')
    const dbTest = await db.select().from(shops).limit(1)
    console.log('Database connection OK, shops count:', dbTest.length)

    // Test shop validation
    console.log('Testing shop validation...')
    const shopRecord = await db
      .select({ id: shops.id, shopDomain: shops.shopDomain })
      .from(shops)
      .where(eq(shops.shopDomain, shop))
      .limit(1)

    console.log('Shop validation result:', shopRecord)

    if (!shopRecord.length) {
      return NextResponse.json({ 
        error: 'Shop not found',
        debug: {
          requestedShop: shop,
          availableShops: await db.select({ domain: shops.shopDomain }).from(shops)
        }
      }, { status: 404 })
    }

    const shopId = shopRecord[0].id

    // Test table access
    console.log('Testing table access...')
    
    // Test siteScans table
    const scansCount = await db.select().from(siteScans).where(eq(siteScans.shopId, shopId))
    console.log('Existing scans for shop:', scansCount.length)

    // Test jobs table
    const jobsCount = await db.select().from(jobs).limit(1)
    console.log('Jobs table accessible, count:', jobsCount.length)

    return NextResponse.json({
      success: true,
      shop: {
        id: shopId,
        domain: shopRecord[0].shopDomain
      },
      database: {
        connected: true,
        shopsCount: dbTest.length,
        scansCount: scansCount.length,
        jobsAccessible: true
      },
      message: 'All tests passed! Scan should work now.'
    })

  } catch (error) {
    console.error('Test scan error:', error)
    
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    )
  }
}
