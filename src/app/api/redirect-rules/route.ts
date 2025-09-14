import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromHeaders } from '@/lib/auth/jwt'
import { db, redirectRules } from '@/lib/db'
import { eq, asc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromHeaders(request.headers)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rules = await db
      .select()
      .from(redirectRules)
      .where(eq(redirectRules.shopId, session.shopId))
      .orderBy(asc(redirectRules.priority), asc(redirectRules.id))

    return NextResponse.json({ rules })
  } catch (error) {
    console.error('Error fetching redirect rules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromHeaders(request.headers)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pattern, replacement, flags, priority } = await request.json()

    if (!pattern || !replacement) {
      return NextResponse.json({ error: 'Pattern and replacement are required' }, { status: 400 })
    }

    // Validate regex pattern
    try {
      new RegExp(pattern, flags || 'i')
    } catch (error) {
      return NextResponse.json({ error: 'Invalid regex pattern' }, { status: 400 })
    }

    const [rule] = await db
      .insert(redirectRules)
      .values({
        shopId: session.shopId,
        pattern,
        replacement,
        flags: flags || 'i',
        priority: priority || 100,
      })
      .returning()

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('Error creating redirect rule:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create rule' 
    }, { status: 500 })
  }
}
