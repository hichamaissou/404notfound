import { NextRequest, NextResponse } from 'next/server'
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
    const body: TestRequest = await request.json()
    const { path, rules } = body

    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
    }

    if (!rules || !Array.isArray(rules)) {
      return NextResponse.json({ error: 'Missing or invalid rules array' }, { status: 400 })
    }

    // Convert rules to the expected format
    const redirectRules: RedirectRule[] = rules.map((rule, index) => ({
      id: `test-${index}`,
      pattern: rule.pattern,
      replacement: rule.replacement,
      flags: rule.flags,
      enabled: rule.enabled,
      priority: rule.priority,
    }))

    // Apply rules to the path
    const result = applyRules(path, redirectRules)

    return NextResponse.json({
      result,
      matched: result !== null,
      original: path,
      transformed: result || path,
    })

  } catch (error) {
    console.error('Rule test error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to test rules', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}
