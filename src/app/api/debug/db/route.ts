import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const debugKey = searchParams.get('key')
  
  if (process.env.NODE_ENV === 'production' && debugKey !== process.env.DEBUG_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Test basic database connection
    const result = await db.execute(`SELECT 1 as test`)
    
    // Test if shops table exists and get its structure
    let tableInfo
    try {
      tableInfo = await db.execute(`
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'shops' 
        ORDER BY ordinal_position
      `)
    } catch (err) {
      tableInfo = { error: err instanceof Error ? err.message : 'Unknown error' }
    }

    // Test if uuid extension exists
    let uuidExtension
    try {
      uuidExtension = await db.execute(`
        SELECT * FROM pg_extension WHERE extname = 'uuid-ossp'
      `)
    } catch (err) {
      uuidExtension = { error: err instanceof Error ? err.message : 'Unknown error' }
    }

    return NextResponse.json({
      connection: 'success',
      testQuery: result,
      shopsTable: tableInfo,
      uuidExtension: uuidExtension,
      databaseUrl: process.env.DATABASE_URL ? 'present' : 'missing'
    })
  } catch (error) {
    return NextResponse.json({
      connection: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
