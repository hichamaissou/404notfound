import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    console.log('Simple scan runner called')
    
    const body = await request.json()
    const { shop } = body

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
    }

    // Get shop ID
    const shopResult = await db.execute(sql`SELECT id FROM shops WHERE shop_domain = ${shop} LIMIT 1`)
    
    if (!shopResult.rows.length) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }
    
    const shopId = shopResult.rows[0].id

    // Create a simple scan that immediately shows results
    const scanId = crypto.randomUUID()
    
    // Create scan record
    await db.execute(sql`
      INSERT INTO site_scans (id, shop_id, status, started_at, finished_at, stats)
      VALUES (${scanId}, ${shopId}, 'done', NOW(), NOW(), ${JSON.stringify({
        pages: 5,
        broken: 2,
        chains: 1,
        loops: 0
      })})
    `)

    // Create some sample scan pages
    const samplePages = [
      { url: `https://${shop}/`, statusCode: 200, ok: true, depth: 0 },
      { url: `https://${shop}/products`, statusCode: 200, ok: true, depth: 1 },
      { url: `https://${shop}/collections`, statusCode: 200, ok: true, depth: 1 },
      { url: `https://${shop}/broken-link`, statusCode: 404, ok: false, depth: 1 },
      { url: `https://${shop}/old-page`, statusCode: 301, ok: false, depth: 1, redirectedTo: `https://${shop}/new-page` }
    ]

    for (const page of samplePages) {
      const pageId = crypto.randomUUID()
      await db.execute(sql`
        INSERT INTO scan_pages (id, scan_id, url, status_code, ok, redirected_to, depth, fetched_at)
        VALUES (${pageId}, ${scanId}, ${page.url}, ${page.statusCode}, ${page.ok}, ${page.redirectedTo || null}, ${page.depth}, NOW())
      `)
    }

    // Create some sample link issues
    const sampleIssues = [
      {
        fromUrl: `https://${shop}/`,
        toUrl: `https://${shop}/broken-link`,
        type: 'broken_link',
        details: { statusCode: 404 }
      },
      {
        fromUrl: `https://${shop}/`,
        toUrl: `https://${shop}/old-page`,
        type: 'redirect_chain',
        details: { statusCode: 301, redirectedTo: `https://${shop}/new-page` }
      }
    ]

    for (const issue of sampleIssues) {
      const issueId = crypto.randomUUID()
      await db.execute(sql`
        INSERT INTO link_issues (id, scan_id, from_url, to_url, type, details, first_seen, last_seen)
        VALUES (${issueId}, ${scanId}, ${issue.fromUrl}, ${issue.toUrl}, ${issue.type}, ${JSON.stringify(issue.details)}, NOW(), NOW())
      `)
    }

    console.log(`Simple scan completed for ${shop}: scanId=${scanId}`)

    return NextResponse.json({
      success: true,
      scanId,
      message: 'Simple scan completed with sample data',
      stats: {
        pages: 5,
        broken: 2,
        chains: 1
      }
    })

  } catch (error) {
    console.error('Simple scan error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to run simple scan', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
