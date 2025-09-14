import { NextRequest } from 'next/server'
import { z } from 'zod'

import { jsonWithRequestId } from '@/core/api/respond'
import { applyRules, type RedirectRule } from '@/lib/rules/redirectRules'

interface TestRequest {
  path: string
  rules: {
    pattern: string
    replacement: string
    flags?: string
    enabled: boolean
    priority: number
  }[]
}

export async function POST(request: NextRequest) {
  try {
    const Schema = z.object({
      path: z.string().min(1),
      rules: z.array(
        z.object({
          pattern: z.string().min(1),
          replacement: z.string().min(1),
          flags: z.string().optional(),
          enabled: z.boolean(),
          priority: z.number().int(),
        })
      ),
    })
    const parsed = Schema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonWithRequestId({ ok: false, error: 'Invalid body', issues: parsed.error.flatten() }, { status: 400 })
    }
    const { path, rules } = parsed.data

    // Convert rules to the expected format
    const redirectRules: RedirectRule[] = rules.map((rule, index) => ({
      id: `test-${index}`,
      pattern: rule.pattern,
      replacement: rule.replacement,
      flags: rule.flags || 'g',
      enabled: rule.enabled ?? true,
      priority: rule.priority ?? 100,
    }))

    // Apply rules to the path
    const result = applyRules(path, redirectRules)

    return jsonWithRequestId({ result, matched: result !== null, original: path, transformed: result || path })

  } catch (error) {
    console.error('Rule test error:', error)
    return jsonWithRequestId(
      { ok: false, error: 'Failed to test rules', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
