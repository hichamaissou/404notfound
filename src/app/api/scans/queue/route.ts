import { NextRequest, NextResponse } from 'next/server'
import { db, shops, settings, siteScans } from '@/lib/db'
import { eq } from 'drizzle-orm'
import { createJob } from '@/lib/jobs/runner'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shop } = body

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
    }

    // Validate shop exists
    const shopRecord = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.shopDomain, shop))
      .limit(1)

    if (!shopRecord.length) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const shopId = shopRecord[0].id

    // Use default values for scan settings
    const maxPages = 1500
    const concurrency = 4

    // Create site scan record
    const scanId = crypto.randomUUID()
    await db.insert(siteScans).values({
      id: scanId,
      shopId,
      status: 'queued',
      startedAt: new Date(),
    })

    // Create crawl job
    await createJob('crawl_site', {
      shopDomain: shop,
      scanId,
      maxPages,
      concurrency,
    })

    console.log(`Queued scan for ${shop}: scanId=${scanId}, maxPages=${maxPages}, concurrency=${concurrency}`)

    return NextResponse.json({
      ok: true,
      scanId,
      maxPages,
      concurrency,
    })

  } catch (error) {
    console.error('Queue scan error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to queue scan', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}