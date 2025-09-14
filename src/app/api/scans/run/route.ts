import { NextRequest, NextResponse } from 'next/server'
import { runPendingJobs } from '@/lib/jobs/runner'

export async function POST(request: NextRequest) {
  try {
    // Check Authorization header
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!authHeader || authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Running pending jobs via cron')
    
    // Run up to 15 pending jobs
    const result = await runPendingJobs(15)
    
    console.log(`Cron job completed: ${result.processed} processed, ${result.errors.length} errors`)
    
    return NextResponse.json({
      ok: true,
      processed: result.processed,
      errors: result.errors,
    })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { 
        ok: false,
        error: 'Failed to run jobs', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}