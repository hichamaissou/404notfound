import { and, eq, lte } from 'drizzle-orm'

import { crawlSite } from '@/lib/crawler'
import { db, jobs, siteScans } from '@/lib/db'

interface JobPayload {
  [key: string]: any
}

interface CrawlSitePayload {
  shopDomain: string
  scanId: string
  maxPages: number
  concurrency: number
}

/**
 * Calculate backoff delay for retries (exponential backoff)
 */
function calculateBackoffDelay(retries: number): number {
  // 1 minute, 2 minutes, 4 minutes, 8 minutes, etc.
  return Math.min(60000 * Math.pow(2, retries), 30 * 60000) // Cap at 30 minutes
}

/**
 * Process a single job based on its type
 */
async function processJob(job: {
  id: string
  type: string
  payload: JobPayload
  retries: number
  maxRetries: number
}): Promise<void> {
  console.log(`Processing job ${job.id} of type ${job.type}`)
  
  try {
    switch (job.type) {
      case 'crawl_site': {
        const payload = job.payload as CrawlSitePayload
        
        // Set site scan status to running before starting crawler
        await db
          .update(siteScans)
          .set({ 
            status: 'running',
            startedAt: new Date(),
          })
          .where(eq(siteScans.id, payload.scanId))
        
        // Run the crawler
        await crawlSite({
          shopDomain: payload.shopDomain,
          scanId: payload.scanId,
          maxPages: payload.maxPages,
          concurrency: payload.concurrency,
        })
        
        // Mark job as completed
        await db
          .update(jobs)
          .set({
            status: 'completed',
            updatedAt: new Date(),
          })
          .where(eq(jobs.id, job.id))
        
        console.log(`Job ${job.id} completed successfully`)
        break
      }
      
      default:
        throw new Error(`Unknown job type: ${job.type}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Job ${job.id} failed:`, errorMessage)
    
    const newRetries = job.retries + 1
    
    if (newRetries >= job.maxRetries) {
      // Mark as failed if max retries exceeded
      await db
        .update(jobs)
        .set({
          status: 'failed',
          lastError: errorMessage,
          retries: newRetries,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job.id))
      
      console.log(`Job ${job.id} marked as failed after ${newRetries} retries`)
    } else {
      // Reschedule with backoff
      const backoffMs = calculateBackoffDelay(newRetries)
      const runAfter = new Date(Date.now() + backoffMs)
      
      await db
        .update(jobs)
        .set({
          status: 'pending',
          retries: newRetries,
          lastError: errorMessage,
          runAfter,
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job.id))
      
      console.log(`Job ${job.id} rescheduled after ${backoffMs}ms (retry ${newRetries}/${job.maxRetries})`)
    }
    
    throw error
  }
}

/**
 * Run pending jobs up to the specified maximum
 */
export async function runPendingJobs(max: number = 10): Promise<{ processed: number; errors: string[] }> {
  console.log(`Running up to ${max} pending jobs`)
  
  const errors: string[] = []
  let processed = 0
  
  try {
    // Select pending jobs that are ready to run
    const pendingJobs = await db
      .select({
        id: jobs.id,
        type: jobs.type,
        payload: jobs.payload,
        retries: jobs.retries,
        maxRetries: jobs.maxRetries,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.status, 'pending'),
          lte(jobs.runAfter, new Date())
        )
      )
      .limit(max)
    
    console.log(`Found ${pendingJobs.length} pending jobs`)
    
    // Process each job
    for (const job of pendingJobs) {
      try {
        // Mark job as running
        await db
          .update(jobs)
          .set({
            status: 'running',
            updatedAt: new Date(),
          })
          .where(eq(jobs.id, job.id))
        
        // Process the job
        await processJob({
          ...job,
          payload: job.payload as JobPayload
        })
        processed++
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push(`Job ${job.id}: ${errorMessage}`)
      }
    }
    
    console.log(`Job runner completed: ${processed} processed, ${errors.length} errors`)
    
    return { processed, errors }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Job runner failed:', errorMessage)
    errors.push(`Job runner: ${errorMessage}`)
    
    return { processed, errors }
  }
}

/**
 * Create a new job
 */
export async function createJob(
  type: string,
  payload: JobPayload,
  runAfter: Date = new Date(),
  maxRetries: number = 3
): Promise<string> {
  const jobId = crypto.randomUUID()
  
  await db.insert(jobs).values({
    id: jobId,
    type,
    payload,
    status: 'pending',
    runAfter,
    retries: 0,
    maxRetries,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  
  console.log(`Created job ${jobId} of type ${type}`)
  return jobId
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string) {
  const job = await db
    .select({
      id: jobs.id,
      type: jobs.type,
      status: jobs.status,
      retries: jobs.retries,
      maxRetries: jobs.maxRetries,
      lastError: jobs.lastError,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1)
  
  return job[0] || null
}
