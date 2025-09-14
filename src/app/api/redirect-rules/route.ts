import { asc, eq } from 'drizzle-orm'
import { NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonWithRequestId } from '@/core/api/respond'
import { db, redirectRules, shops } from '@/lib/db'

// GET - List all rules for a shop
const QuerySchema = z.object({ shop: z.string().min(1) })

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.safeParse({ shop: searchParams.get('shop') })
    if (!parsed.success) {
      return jsonWithRequestId({ ok: false, error: 'Missing shop parameter' }, { status: 400 })
    }
    const { shop } = parsed.data

    // Get shop ID
    const shopRecord = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.shopDomain, shop))
      .limit(1)

    if (!shopRecord.length) {
      return jsonWithRequestId({ ok: false, error: 'Shop not found' }, { status: 404 })
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

    return jsonWithRequestId({ rules })

  } catch (error) {
    console.error('Get rules error:', error)
    return jsonWithRequestId(
      { ok: false, error: 'Failed to get rules', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Create a new rule
export async function POST(request: NextRequest) {
  try {
    const BodySchema = z.object({
      shop: z.string().min(1),
      pattern: z.string().min(1),
      replacement: z.string().min(1),
      flags: z.string().optional(),
      enabled: z.boolean().optional(),
      priority: z.number().int().optional(),
    })
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonWithRequestId({ ok: false, error: 'Invalid body', issues: parsed.error.flatten() }, { status: 400 })
    }
    const { shop, pattern, replacement, flags, enabled = true, priority = 0 } = parsed.data

    // Get shop ID
    const shopRecord = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.shopDomain, shop))
      .limit(1)

    if (!shopRecord.length) {
      return jsonWithRequestId({ ok: false, error: 'Shop not found' }, { status: 404 })
    }

    const shopId = shopRecord[0].id

    // Test the regex pattern
    try {
      // eslint-disable-next-line no-new
      new RegExp(pattern, flags || 'g')
    } catch {
      return jsonWithRequestId({ ok: false, error: 'Invalid regex pattern' }, { status: 400 })
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

    return jsonWithRequestId({ ok: true, ruleId })

  } catch (error) {
    console.error('Create rule error:', error)
    return jsonWithRequestId(
      { ok: false, error: 'Failed to create rule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
