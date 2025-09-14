import { eq } from 'drizzle-orm'
import { NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonWithRequestId } from '@/core/api/respond'
import { logger } from '@/core/logger'
import { db, jobs, shops, siteScans } from '@/lib/db'
import { runPendingJobs } from '@/lib/jobs/runner'

const BodySchema = z.object({
  shop: z.string().min(1),
  dev: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonWithRequestId({ ok: false, error: 'Invalid body', issues: parsed.error.flatten() }, { status: 400 })
    }
    const { shop, dev } = parsed.data

    // Validate shop exists
    const shopRecord = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.shopDomain, shop))
      .limit(1)

    if (!shopRecord.length) {
      return jsonWithRequestId({ ok: false, error: 'Shop not found' }, { status: 404 })
    }

    const shopId = shopRecord[0].id
    const maxPages = 1500
    const concurrency = 4

    const scanId = crypto.randomUUID()
    await db.insert(siteScans).values({
      id: scanId,
      shopId,
      status: 'queued',
      startedAt: new Date(),
      seeds: [{ url: `https://${shop}` }],
      stats: {},
    })

    // Create crawl job directly (avoiding import issues)
    const jobId = crypto.randomUUID()
    await db.insert(jobs).values({
      id: jobId,
      type: 'crawl_site',
      payload: {
        shopDomain: shop,
        scanId,
        maxPages,
        concurrency,
      },
      status: 'pending',
      runAfter: new Date(),
      retries: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    // In development mode, allow immediate processing when dev flag provided
    if (process.env.NODE_ENV === 'development' && dev === true) {
      try {
        const result = await runPendingJobs(1)
        logger.info('Dev immediate job run', { scanId, jobId, processed: result.processed })
      } catch (e) {
        logger.warn('Dev immediate job run failed', { scanId, jobId, error: e instanceof Error ? e.message : String(e) })
      }
    }

    logger.info('Queued scan', { shop, shopId, scanId, jobId, maxPages, concurrency })

    return jsonWithRequestId({ ok: true, scanId, jobId, maxPages, concurrency })

  } catch (error) {
    console.error('Queue scan error:', error)
    return jsonWithRequestId(
      {
        ok: false,
        error: 'Failed to queue scan',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
