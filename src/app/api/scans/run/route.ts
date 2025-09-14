import { NextRequest, NextResponse } from 'next/server'
import { WebScanner } from '@/lib/crawler/scanner'
import { db, siteScans, jobs } from '@/lib/db'
import { eq, and, count } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    // This endpoint processes queued scan jobs
    // It's designed to be called by Vercel Cron every 5 minutes
    
    const scanner = new WebScanner()
    
    // Process up to 50 jobs in this run (serverless-safe)
    await scanner.processJobs(50)

    // Check for completed scans
    await checkCompletedScans()

    return NextResponse.json({
      message: 'Jobs processed successfully',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error processing scan jobs:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process jobs' 
    }, { status: 500 })
  }
}

async function checkCompletedScans(): Promise<void> {
  // Find running scans
  const runningScans = await db
    .select()
    .from(siteScans)
    .where(eq(siteScans.status, 'running'))

  for (const scan of runningScans) {
    // Count pending jobs for this scan
    const [pendingJobsCount] = await db
      .select({ count: count() })
      .from(jobs)
      .where(and(
        eq(jobs.type, 'crawl_page'),
        eq(jobs.status, 'pending'),
        eq(jobs.payload, scan.id) // This is a simplified check
      ))

    if (pendingJobsCount.count === 0) {
      // No more pending jobs, mark scan as done
      await db
        .update(siteScans)
        .set({ 
          status: 'done',
          finishedAt: new Date(),
          stats: {
            completedAt: new Date().toISOString(),
            // Add more stats here if needed
          },
        })
        .where(eq(siteScans.id, scan.id))
    }
  }
}
