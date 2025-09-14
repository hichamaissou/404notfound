import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    console.log('Debug scans API called')
    
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
    }

    // Get shop ID first
    const shopResult = await db.execute(sql`
      SELECT id FROM shops WHERE shop_domain = ${shop} LIMIT 1
    `)
    
    if (!shopResult.rows.length) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }
    
    const shopId = shopResult.rows[0].id

    // Get all scans for this shop
    const scansResult = await db.execute(sql`
      SELECT id, status, started_at, finished_at, stats, last_error
      FROM site_scans 
      WHERE shop_id = ${shopId}
      ORDER BY started_at DESC
      LIMIT 10
    `)
    
    // Get all jobs
    const jobsResult = await db.execute(sql`
      SELECT id, type, status, payload, retries, max_retries, last_error, created_at, updated_at
      FROM jobs
      ORDER BY created_at DESC
      LIMIT 10
    `)

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

  } catch (error) {
    console.error('Debug scans error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get debug scans', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    )
  }
}
