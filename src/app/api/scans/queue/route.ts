import { NextRequest, NextResponse } from 'next/server'
import { db, shops, siteScans, jobs } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    console.log('Queue scan API called')
    
    const body = await request.json()
    const { shop } = body

    console.log('Request body:', { shop })

    if (!shop) {
      console.log('Missing shop parameter')
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
    }

    // Validate shop exists
    console.log('Validating shop:', shop)
    const shopRecord = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.shopDomain, shop))
      .limit(1)

    console.log('Shop record found:', shopRecord)

    if (!shopRecord.length) {
      console.log('Shop not found in database')
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const shopId = shopRecord[0].id
    console.log('Shop ID:', shopId)

    // Use default values for scan settings
    const maxPages = 1500
    const concurrency = 4

    // Create site scan record using raw SQL to avoid Drizzle issues
    console.log('Creating site scan...')
    
    const scanId = crypto.randomUUID()
    console.log('Using scan ID:', scanId)
    
    await db.execute(sql`
      INSERT INTO site_scans (id, shop_id, status, started_at)
      VALUES (${scanId}, ${shopId}, 'queued', ${new Date().toISOString()})
    `)
    
    console.log('Site scan created successfully')

    // Create crawl job directly (avoiding import issues)
    const jobId = crypto.randomUUID()
    console.log('Creating job with ID:', jobId)
    
    await db.insert(jobs).values({
      id: jobId,
      type: 'crawl_site',
      payload: {
        shopDomain: shop,
        scanId,
        maxPages,
        concurrency,
      },
      status: 'pending',
      runAfter: new Date(),
      retries: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    console.log('Job created successfully')

    console.log(`Queued scan for ${shop}: scanId=${scanId}, jobId=${jobId}, maxPages=${maxPages}, concurrency=${concurrency}`)

    return NextResponse.json({
      ok: true,
      scanId,
      jobId,
      maxPages,
      concurrency,
    })

  } catch (error) {
    console.error('Queue scan error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    return NextResponse.json(
      { 
        error: 'Failed to queue scan', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    )
  }
}