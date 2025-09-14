import { NextRequest, NextResponse } from 'next/server'

import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Test simple de connexion
    const result = await db.execute(`SELECT 1 as test`)
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      test: result,
      databaseUrl: process.env.DATABASE_URL ? 'present' : 'missing'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      databaseUrl: process.env.DATABASE_URL ? 'present' : 'missing',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
