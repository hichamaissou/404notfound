import { NextRequest, NextResponse } from 'next/server'
import { runPendingJobs } from '@/lib/jobs/runner'

export async function GET(request: NextRequest) {
  try {
    console.log('Cron job runner called')
    
    // Verify this is a cron request (optional security)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Run pending jobs
    const result = await runPendingJobs(5) // Process up to 5 jobs at a time
    
    console.log('Cron job runner result:', result)
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString(),
      message: `Processed ${result.processed} jobs, ${result.errors.length} errors`
    })

  } catch (error) {
    console.error('Cron job runner error:', error)
    
    return NextResponse.json(
      { 
        error: 'Cron job failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}
