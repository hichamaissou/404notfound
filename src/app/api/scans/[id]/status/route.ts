import { and, count,eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { getSessionFromHeaders } from '@/lib/auth/jwt'
import { db, jobs,linkIssues, scanPages, siteScans } from '@/lib/db'

export async function GET(request: NextRequest, ctx: any) {
  try {
    const session = await getSessionFromHeaders(request.headers)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const scanId = ctx.params.id

    // Get scan details
    const [scan] = await db
      .select()
      .from(siteScans)
      .where(and(
        eq(siteScans.id, scanId),
        eq(siteScans.shopId, session.shopId)
      ))
      .limit(1)

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    // Get scan statistics
    const [pagesCount] = await db
      .select({ count: count() })
      .from(scanPages)
      .where(eq(scanPages.scanId, scanId))

    const [issuesCount] = await db
      .select({ count: count() })
      .from(linkIssues)
      .where(eq(linkIssues.scanId, scanId))

    const [pendingJobsCount] = await db
      .select({ count: count() })
      .from(jobs)
      .where(and(
        eq(jobs.type, 'crawl_page'),
        eq(jobs.status, 'pending')
      ))

    // Get recent issues
    const recentIssues = await db
      .select()
      .from(linkIssues)
      .where(eq(linkIssues.scanId, scanId))
      .limit(10)

    return NextResponse.json({
      scan: {
        ...scan,
        pagesScanned: pagesCount.count,
        issuesFound: issuesCount.count,
        pendingJobs: pendingJobsCount.count,
      },
      recentIssues,
    })
  } catch (error) {
    console.error('Error fetching scan status:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch scan status' 
    }, { status: 500 })
  }
}
