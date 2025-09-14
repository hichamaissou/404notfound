import { and,desc, eq, sql } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { db, linkIssues,scanPages, shops, siteScans } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
    }

    // Get shop ID
    const shopRecord = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.shopDomain, shop))
      .limit(1)

    if (!shopRecord.length) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const shopId = shopRecord[0].id

    // Get last 5 scans
    const scans = await db
      .select({
        id: siteScans.id,
        status: siteScans.status,
        startedAt: siteScans.startedAt,
        finishedAt: siteScans.finishedAt,
        stats: siteScans.stats,
        lastError: siteScans.lastError,
      })
      .from(siteScans)
      .where(eq(siteScans.shopId, shopId))
      .orderBy(desc(siteScans.startedAt))
      .limit(5)

    // Get summary for the latest scan if exists
    let summary = null
    if (scans.length > 0) {
      const latestScanId = scans[0].id

      // Count pages scanned
      const pagesCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(scanPages)
        .where(eq(scanPages.scanId, latestScanId))

      // Count broken links
      const brokenLinksCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(linkIssues)
        .where(
          and(
            eq(linkIssues.scanId, latestScanId),
            eq(linkIssues.type, 'broken_link')
          )
        )

      // Count redirect chains
      const redirectChainsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(linkIssues)
        .where(
          and(
            eq(linkIssues.scanId, latestScanId),
            eq(linkIssues.type, 'redirect_chain')
          )
        )

      summary = {
        scanId: latestScanId,
        pages: pagesCount[0]?.count || 0,
        brokenLinks: brokenLinksCount[0]?.count || 0,
        redirectChains: redirectChainsCount[0]?.count || 0,
      }
    }

    return NextResponse.json({
      scans: scans.map(scan => ({
        id: scan.id,
        status: scan.status,
        startedAt: scan.startedAt,
        finishedAt: scan.finishedAt,
        stats: scan.stats,
        error: scan.lastError,
      })),
      summary,
    })

  } catch (error) {
    console.error('Scan status error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get scan status', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}
