import {desc, eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { getSessionFromHeaders } from '@/lib/auth/jwt'
import { brokenUrls, db, settings } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromHeaders(request.headers)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get broken URLs for the shop
    const urls = await db
      .select()
      .from(brokenUrls)
      .where(eq(brokenUrls.shopId, session.shopId))
      .orderBy(desc(brokenUrls.hits), desc(brokenUrls.lastSeen))
      .limit(100)

    // Get shop settings for ROI calculation
    const [shopSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.shopId, session.shopId))
      .limit(1)

    // For now, use default values since settings schema changed
    const conversionRate = 0.02
    const avgOrderValue = 60

    // Calculate stats
    const stats = {
      total404s: urls.length,
      totalHits: urls.reduce((sum: number, url: any) => sum + url.hits, 0),
      resolvedCount: urls.filter((url: any) => url.isResolved).length,
      weeklyNew: urls.filter((url: any) => {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        return new Date(url.firstSeen) > weekAgo
      }).length,
      estimatedRevenueLoss: urls.reduce((sum: number, url: any) => {
        return sum + (url.isResolved ? 0 : url.hits * conversionRate * avgOrderValue)
      }, 0),
    }

    return NextResponse.json({
      stats,
      brokenUrls: urls,
    })
  } catch (error) {
    console.error('Error fetching broken URLs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
