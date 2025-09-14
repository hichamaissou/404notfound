import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
    }

    // Get shop ID using raw SQL
    const shopResult = await db.execute(sql`SELECT id FROM shops WHERE shop_domain = ${shop} LIMIT 1`)
    
    if (!shopResult.rows.length) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }
    
    const shopId = shopResult.rows[0].id

    // Get last 5 scans using raw SQL
    const scansResult = await db.execute(sql`
      SELECT id, status, started_at, finished_at, stats, last_error
      FROM site_scans 
      WHERE shop_id = ${shopId}
      ORDER BY started_at DESC
      LIMIT 5
    `)

    // Get summary for latest scan
    let summary = null
    if (scansResult.rows.length > 0) {
      const latestScan = scansResult.rows[0]
      
      const [pagesResult, brokenLinksResult, redirectChainsResult] = await Promise.all([
        db.execute(sql`SELECT COUNT(*) as count FROM scan_pages WHERE scan_id = ${latestScan.id}`),
        db.execute(sql`SELECT COUNT(*) as count FROM link_issues WHERE scan_id = ${latestScan.id} AND type = 'broken_link'`),
        db.execute(sql`SELECT COUNT(*) as count FROM link_issues WHERE scan_id = ${latestScan.id} AND type = 'redirect_chain'`)
      ])

      summary = {
        scanId: latestScan.id,
        pages: parseInt(String(pagesResult.rows[0]?.count || '0')),
        brokenLinks: parseInt(String(brokenLinksResult.rows[0]?.count || '0')),
        redirectChains: parseInt(String(redirectChainsResult.rows[0]?.count || '0')),
      }
    }

    return NextResponse.json({
      scans: scansResult.rows.map(scan => ({
        id: scan.id,
        status: scan.status,
        startedAt: scan.started_at,
        finishedAt: scan.finished_at,
        stats: scan.stats,
        error: scan.last_error,
      })),
      summary,
    })

  } catch (error) {
    console.error('Get scan status error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get scan status', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}
