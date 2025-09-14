import { eq } from 'drizzle-orm'
import { NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonWithRequestId } from '@/core/api/respond'
import { db, redirectRules, shops } from '@/lib/db'

// PATCH - Update a rule
export async function PATCH(request: NextRequest, ctx: any) {
  try {
    const ruleId = ctx.params.id
    const BodySchema = z.object({
      shop: z.string().min(1),
      pattern: z.string().optional(),
      replacement: z.string().optional(),
      flags: z.string().optional().nullable(),
      enabled: z.boolean().optional(),
      priority: z.number().int().optional(),
    })
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonWithRequestId({ ok: false, error: 'Invalid body', issues: parsed.error.flatten() }, { status: 400 })
    }
    const { shop, pattern, replacement, flags, enabled, priority } = parsed.data

    // Resolve shop ID and assert rule ownership
    const [shopRec] = await db.select({ id: shops.id }).from(shops).where(eq(shops.shopDomain, shop)).limit(1)
    if (!shopRec) {
      return jsonWithRequestId({ ok: false, error: 'Shop not found' }, { status: 404 })
    }
    const [rule] = await db.select().from(redirectRules).where(eq(redirectRules.id, ruleId)).limit(1)
    if (!rule || rule.shopId !== shopRec.id) {
      return jsonWithRequestId({ ok: false, error: 'Rule not found' }, { status: 404 })
    }

    // Test the regex pattern if provided
    if (pattern) {
      try {
        new RegExp(pattern, flags || 'g')
      } catch (regexError) {
        return jsonWithRequestId({ ok: false, error: 'Invalid regex pattern' }, { status: 400 })
      }
    }

    const updateData: Partial<typeof redirectRules.$inferInsert> = {
      updatedAt: new Date(),
    }
    if (pattern !== undefined) updateData.pattern = pattern
    if (replacement !== undefined) updateData.replacement = replacement
    if (flags !== undefined) updateData.flags = flags || null
    if (enabled !== undefined) updateData.enabled = enabled
    if (priority !== undefined) updateData.priority = priority

    await db
      .update(redirectRules)
      .set(updateData)
      .where(eq(redirectRules.id, ruleId))

    return jsonWithRequestId({ ok: true })

  } catch (error) {
    console.error('Update rule error:', error)
    return jsonWithRequestId(
      { ok: false, error: 'Failed to update rule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a rule
export async function DELETE(request: NextRequest, ctx: any) {
  try {
    const ruleId = ctx.params.id
    const BodySchema = z.object({ shop: z.string().min(1) })
    const parsed = BodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonWithRequestId({ ok: false, error: 'Missing shop parameter' }, { status: 400 })
    }
    const { shop } = parsed.data

    const [shopRec] = await db.select({ id: shops.id }).from(shops).where(eq(shops.shopDomain, shop)).limit(1)
    if (!shopRec) {
      return jsonWithRequestId({ ok: false, error: 'Shop not found' }, { status: 404 })
    }
    const [rule] = await db.select().from(redirectRules).where(eq(redirectRules.id, ruleId)).limit(1)
    if (!rule || rule.shopId !== shopRec.id) {
      return jsonWithRequestId({ ok: false, error: 'Rule not found' }, { status: 404 })
    }

    await db.delete(redirectRules).where(eq(redirectRules.id, ruleId))

    return jsonWithRequestId({ ok: true })

  } catch (error) {
    console.error('Delete rule error:', error)
    return jsonWithRequestId(
      { ok: false, error: 'Failed to delete rule', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
