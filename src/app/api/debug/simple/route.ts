import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('Simple debug API called')
    
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
    }

    // Use direct database connection
    const { Pool } = await import('pg')
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })

    try {
      // Get shop ID
      const shopResult = await pool.query('SELECT id FROM shops WHERE shop_domain = $1 LIMIT 1', [shop])
      
      if (!shopResult.rows.length) {
        return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
      }
      
      const shopId = shopResult.rows[0].id

      // Get scans
      const scansResult = await pool.query(`
        SELECT id, status, started_at, finished_at, stats, last_error
        FROM site_scans 
        WHERE shop_id = $1
        ORDER BY started_at DESC
        LIMIT 10
      `, [shopId])
      
      // Get jobs
      const jobsResult = await pool.query(`
        SELECT id, type, status, payload, retries, max_retries, last_error, created_at, updated_at
        FROM jobs
        ORDER BY created_at DESC
        LIMIT 10
      `)

      await pool.end()

      return NextResponse.json({
        success: true,
        shop: {
          id: shopId,
          domain: shop
        },
        scans: scansResult.rows,
        jobs: jobsResult.rows,
        counts: {
          scans: scansResult.rows.length,
          jobs: jobsResult.rows.length
        }
      })

    } finally {
      await pool.end()
    }

  } catch (error) {
    console.error('Simple debug error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get debug data', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    )
  }
}
