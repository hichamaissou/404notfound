import { NextRequest } from 'next/server'
import { jsonWithRequestId } from '@/core/api/respond'
import { logger } from '@/core/logger'
import { runPendingJobs } from '@/lib/jobs/runner'

export async function POST(request: NextRequest) {
  try {
    // Check Authorization header
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!authHeader || authHeader !== expectedAuth) {
      return jsonWithRequestId({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('Cron run pending jobs')
    
    // Run up to 15 pending jobs
    const result = await runPendingJobs(15)
    
    logger.info('Cron job completed', { processed: result.processed, errors: result.errors.length })
    return jsonWithRequestId({ ok: true, processed: result.processed, errors: result.errors })

  } catch (error) {
    console.error('Cron job error:', error)
    return jsonWithRequestId(
      { ok: false, error: 'Failed to run jobs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
