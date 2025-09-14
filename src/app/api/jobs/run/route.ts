import { NextRequest, NextResponse } from 'next/server'

import { runPendingJobs } from '@/lib/jobs/runner'

export async function POST(request: NextRequest) {
  try {
    console.log('Running pending jobs...')
    
    const { searchParams } = new URL(request.url)
    const max = parseInt(searchParams.get('max') || '10')
    
    const result = await runPendingJobs(max)
    
    console.log('Job runner result:', result)
    
    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      message: `Processed ${result.processed} jobs, ${result.errors.length} errors`
    })

  } catch (error) {
    console.error('Job runner error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to run jobs', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    )
  }
}
