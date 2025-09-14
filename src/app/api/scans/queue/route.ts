import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromHeaders } from '@/lib/auth/jwt'
import { db, shops, siteScans } from '@/lib/db'
import { eq, desc } from 'drizzle-orm'
import { WebScanner } from '@/lib/crawler/scanner'

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromHeaders(request.headers)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if there's already a running scan
    const [existingScan] = await db
      .select()
      .from(siteScans)
      .where(eq(siteScans.shopId, session.shopId))
      .orderBy(desc(siteScans.startedAt))
      .limit(1)

    if (existingScan && (existingScan.status === 'queued' || existingScan.status === 'running')) {
      return NextResponse.json({ 
        error: 'A scan is already in progress',
        scanId: existingScan.id,
      }, { status: 409 })
    }

    // Get shop details
    const [shop] = await db
      .select()
      .from(shops)
      .where(eq(shops.id, session.shopId))
      .limit(1)

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Start new scan
    const scanner = new WebScanner()
    const scanId = await scanner.startScan(session.shopId, shop.shopDomain, shop.accessToken)

    // Mark scan as running
    await db
      .update(siteScans)
      .set({ status: 'running' })
      .where(eq(siteScans.id, scanId))

    return NextResponse.json({
      scanId,
      message: 'Scan queued successfully',
    })
  } catch (error) {
    console.error('Error queueing scan:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to queue scan' 
    }, { status: 500 })
  }
}
