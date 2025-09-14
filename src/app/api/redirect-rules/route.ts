import { NextRequest, NextResponse } from 'next/server'
import { db, shops, redirectRules } from '@/lib/db'
import { eq, asc } from 'drizzle-orm'

// GET - List all rules for a shop
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
    }

    // Get shop ID
    const shopRecord = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.shopDomain, shop))
      .limit(1)

    if (!shopRecord.length) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const shopId = shopRecord[0].id

    // Get all rules for this shop
    const rules = await db
      .select({
        id: redirectRules.id,
        pattern: redirectRules.pattern,
        replacement: redirectRules.replacement,
        flags: redirectRules.flags,
        enabled: redirectRules.enabled,
        priority: redirectRules.priority,
        createdAt: redirectRules.createdAt,
        updatedAt: redirectRules.updatedAt,
      })
      .from(redirectRules)
      .where(eq(redirectRules.shopId, shopId))
      .orderBy(asc(redirectRules.priority))

    return NextResponse.json({ rules })

  } catch (error) {
    console.error('Get rules error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get rules', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}

// POST - Create a new rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shop, pattern, replacement, flags, enabled = true, priority = 0 } = body

    if (!shop || !pattern || !replacement) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get shop ID
    const shopRecord = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.shopDomain, shop))
      .limit(1)

    if (!shopRecord.length) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const shopId = shopRecord[0].id

    // Test the regex pattern
    try {
      new RegExp(pattern, flags || 'g')
    } catch (regexError) {
      return NextResponse.json({ error: 'Invalid regex pattern' }, { status: 400 })
    }

    // Create rule
    const ruleId = crypto.randomUUID()
    await db.insert(redirectRules).values({
      id: ruleId,
      shopId,
      pattern,
      replacement,
      flags: flags || null,
      enabled,
      priority,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({ 
      success: true, 
      ruleId,
      message: 'Rule created successfully' 
    })

  } catch (error) {
    console.error('Create rule error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create rule', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}