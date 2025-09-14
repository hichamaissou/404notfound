import { and, desc, eq, sql } from 'drizzle-orm'
import { NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonWithRequestId } from '@/core/api/respond'
import { db, linkIssues, scanPages, shops, siteScans } from '@/lib/db'

const QuerySchema = z.object({ shop: z.string().min(1) })

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.safeParse({ shop: searchParams.get('shop') })
    if (!parsed.success) {
      return jsonWithRequestId({ ok: false, error: 'Missing shop parameter' }, { status: 400 })
    }
    const { shop } = parsed.data

    // Get shop ID
    const shopRecord = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.shopDomain, shop))
      .limit(1)

    if (!shopRecord.length) {
      return jsonWithRequestId({ ok: false, error: 'Shop not found' }, { status: 404 })
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
    let summary: { pages: number; broken: number; chains: number } | null = null
    if (scans.length > 0) {
      const latestScanId = scans[0].id

      // Count pages scanned
      const pagesCount = await db
        .select({ count: sql`count(*)` })
        .from(scanPages)
        .where(eq(scanPages.scanId, latestScanId))

      // Count broken links
      const brokenLinksCount = await db
        .select({ count: sql`count(*)` })
        .from(linkIssues)
        .where(
          and(
            eq(linkIssues.scanId, latestScanId),
            eq(linkIssues.type, 'broken_link')
          )
        )

      // Count redirect chains
      const redirectChainsCount = await db
        .select({ count: sql`count(*)` })
        .from(linkIssues)
        .where(
          and(
            eq(linkIssues.scanId, latestScanId),
            eq(linkIssues.type, 'redirect_chain')
          )
        )

      summary = {
        pages: parseInt(String(pagesCount[0]?.count || 0), 10),
        broken: parseInt(String(brokenLinksCount[0]?.count || 0), 10),
        chains: parseInt(String(redirectChainsCount[0]?.count || 0), 10),
      }
    }

    return jsonWithRequestId({
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
    return jsonWithRequestId(
      { ok: false, error: 'Failed to get scan status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
