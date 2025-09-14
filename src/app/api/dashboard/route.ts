import { NextRequest, NextResponse } from 'next/server'
import { db, shops, brokenUrls } from '@/lib/db'
import { eq, and, gte, sql } from 'drizzle-orm'

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

    // Get total 404s (resolved and unresolved)
    const totalUnresolved = await db
      .select({ count: sql<number>`count(*)`, hits: sql<number>`sum(hits)` })
      .from(brokenUrls)
      .where(
        and(
          eq(brokenUrls.shopId, shopId),
          eq(brokenUrls.isResolved, false)
        )
      )

    const totalResolved = await db
      .select({ count: sql<number>`count(*)`, hits: sql<number>`sum(hits)` })
      .from(brokenUrls)
      .where(
        and(
          eq(brokenUrls.shopId, shopId),
          eq(brokenUrls.isResolved, true)
        )
      )

    const unresolvedCount = totalUnresolved[0]?.count || 0
    const resolvedCount = totalResolved[0]?.count || 0
    const totalCount = unresolvedCount + resolvedCount
    const resolvedRate = totalCount > 0 ? (resolvedCount / totalCount) * 100 : 0

    // Calculate ROI (using constants: 2% conversion, 60€ AOV)
    const resolvedHits = totalResolved[0]?.hits || 0
    const estimatedROI = resolvedHits * 0.02 * 60

    // Get trend data (last 14 days)
    const fourteenDaysAgo = new Date()
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

    const trendData = await db
      .select({
        date: sql<string>`DATE(first_seen)`,
        count: sql<number>`count(*)`,
      })
      .from(brokenUrls)
      .where(
        and(
          eq(brokenUrls.shopId, shopId),
          gte(brokenUrls.firstSeen, fourteenDaysAgo)
        )
      )
      .groupBy(sql`DATE(first_seen)`)
      .orderBy(sql`DATE(first_seen)`)

    // Get top 5 broken paths
    const topBrokenPaths = await db
      .select({
        path: brokenUrls.path,
        hits: brokenUrls.hits,
        firstSeen: brokenUrls.firstSeen,
      })
      .from(brokenUrls)
      .where(
        and(
          eq(brokenUrls.shopId, shopId),
          eq(brokenUrls.isResolved, false)
        )
      )
      .orderBy(sql`${brokenUrls.hits} DESC`)
      .limit(5)

    // Format trend data for chart
    const trend = []
    const today = new Date()
    for (let i = 13; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayData = trendData.find(d => d.date === dateStr)
      trend.push({
        date: dateStr,
        count: dayData?.count || 0,
      })
    }

    return NextResponse.json({
      stats: {
        totalUnresolved: unresolvedCount,
        totalResolved: resolvedCount,
        resolvedRate: Math.round(resolvedRate * 100) / 100,
        estimatedROI: Math.round(estimatedROI * 100) / 100,
      },
      trend,
      topBrokenPaths: topBrokenPaths.map(path => ({
        path: path.path,
        hits: path.hits,
        firstSeen: path.firstSeen,
      })),
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get dashboard data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}
