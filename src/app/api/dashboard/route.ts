import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonWithRequestId } from '@/core/api/respond'
import { logger } from '@/core/logger'
import { brokenUrls, db, shops } from '@/lib/db'

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

    // Get total 404s (resolved and unresolved)
    const totalUnresolved = await db
      .select({ count: sql`count(*)`, hits: sql`coalesce(sum(hits), 0)` })
      .from(brokenUrls)
      .where(
        and(
          eq(brokenUrls.shopId, shopId),
          eq(brokenUrls.isResolved, false)
        )
      )

    const totalResolved = await db
      .select({ count: sql`count(*)`, hits: sql`coalesce(sum(hits), 0)` })
      .from(brokenUrls)
      .where(
        and(
          eq(brokenUrls.shopId, shopId),
          eq(brokenUrls.isResolved, true)
        )
      )

    const unresolvedCount = parseInt(String(totalUnresolved[0]?.count || 0), 10)
    const resolvedCount = parseInt(String(totalResolved[0]?.count || 0), 10)
    const totalCount = unresolvedCount + resolvedCount

    // Calculate ROI (using constants: 2% conversion, 60€ AOV)
    const resolvedHits = Number(totalResolved[0]?.hits || 0)
    const estimatedROI = resolvedHits * 0.02 * 60

    // Get trend data (last 14 days)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const trendData = await db
      .select({
        date: sql`DATE(${brokenUrls.lastSeen})`,
        count: sql`count(*)`,
      })
      .from(brokenUrls)
      .where(
        and(
          eq(brokenUrls.shopId, shopId),
          gte(brokenUrls.lastSeen, fourteenDaysAgo)
        )
      )
      .groupBy(sql`DATE(${brokenUrls.lastSeen})`)
      .orderBy(sql`DATE(${brokenUrls.lastSeen})`)

    // Get top 5 broken paths
    const topBrokenPaths = await db
      .select({
        path: brokenUrls.path,
        hits: brokenUrls.hits,
        lastSeen: brokenUrls.lastSeen,
      })
      .from(brokenUrls)
      .where(
        and(
          eq(brokenUrls.shopId, shopId),
          eq(brokenUrls.isResolved, false)
        )
      )
      .orderBy(desc(brokenUrls.hits))
      .limit(5)

    // Format trend data for chart
    const trend: { date: string; hits: number }[] = []
    const today = new Date()
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayData = (trendData as any[]).find(d => String(d.date) === dateStr)
      trend.push({
        date: dateStr,
        hits: parseInt(String(dayData?.count || 0), 10),
      })
    }

    const response = {
      stats: {
        total: totalCount,
        resolved: resolvedCount,
        unresolved: unresolvedCount,
        estimatedRoi: Math.round(estimatedROI * 100) / 100,
      },
      recent: (await db
        .select({
          path: brokenUrls.path,
          hits: brokenUrls.hits,
          lastSeen: brokenUrls.lastSeen,
        })
        .from(brokenUrls)
        .where(eq(brokenUrls.shopId, shopId))
        .orderBy(desc(brokenUrls.lastSeen))
        .limit(10)).map((r) => ({ path: r.path, hits: r.hits, lastSeen: r.lastSeen })),
      trend,
      top: topBrokenPaths.map(p => ({ path: p.path, hits: p.hits })),
    }

    logger.debug('Dashboard computed', { shopId, total: response.stats.total })
    return jsonWithRequestId(response)

  } catch (error) {
    console.error('Dashboard API error:', error)
    return jsonWithRequestId(
      { ok: false, error: 'Failed to get dashboard data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
