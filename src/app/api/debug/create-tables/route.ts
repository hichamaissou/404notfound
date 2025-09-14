import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const debugKey = searchParams.get('key')
  
  // Allow access without key for initial setup
  const allowAccess = debugKey === 'setup' || debugKey === process.env.DEBUG_KEY || !process.env.DEBUG_KEY
  
  if (process.env.NODE_ENV === 'production' && !allowAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('Creating tables if they don\'t exist...')

    // Enable UUID extension
    await db.execute(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
    console.log('✅ UUID extension enabled')

    // Create shops table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS shops (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        shop_domain TEXT NOT NULL UNIQUE,
        access_token TEXT NOT NULL,
        scope TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)
    console.log('✅ Shops table created')

    // Create index
    await db.execute(`CREATE INDEX IF NOT EXISTS shops_shop_domain_idx ON shops(shop_domain)`)
    console.log('✅ Shops index created')

    // Create settings table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE UNIQUE,
        digest_email BOOLEAN DEFAULT true,
        conversion_rate NUMERIC(5,4) DEFAULT 0.02,
        average_order_value NUMERIC(10,2) DEFAULT 60.00,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)
    console.log('✅ Settings table created')

    // Create subscriptions table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        plan_name TEXT NOT NULL,
        price_amount NUMERIC(10,2) NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        trial_ends_at TIMESTAMP,
        current_period_end TIMESTAMP,
        shopify_subscription_id TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `)
    console.log('✅ Subscriptions table created')

    // Create indexes
    await db.execute(`CREATE INDEX IF NOT EXISTS settings_shop_id_idx ON settings(shop_id)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS subscriptions_shop_id_idx ON subscriptions(shop_id)`)
    await db.execute(`CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status)`)
    console.log('✅ All indexes created')

    return NextResponse.json({
      success: true,
      message: 'Tables created successfully',
      tables: ['shops', 'settings', 'subscriptions']
    })

  } catch (error) {
    console.error('Error creating tables:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
