import { NextRequest, NextResponse } from 'next/server'
import { db, redirectRules } from '@/lib/db'
import { eq } from 'drizzle-orm'

// PATCH - Update a rule
export async function PATCH(request: NextRequest, ctx: any) {
  try {
    const ruleId = ctx.params.id
    const body = await request.json()
    const { name, pattern, replacement, flags, enabled, priority } = body

    // Test the regex pattern if provided
    if (pattern) {
      try {
        new RegExp(pattern, flags || 'g')
      } catch (regexError) {
        return NextResponse.json({ error: 'Invalid regex pattern' }, { status: 400 })
      }
    }

    // Update rule
    const updateData: any = {
      updatedAt: new Date(),
    }
    
    if (name !== undefined) updateData.name = name
    if (pattern !== undefined) updateData.pattern = pattern
    if (replacement !== undefined) updateData.replacement = replacement
    if (flags !== undefined) updateData.flags = flags || null
    if (enabled !== undefined) updateData.enabled = enabled
    if (priority !== undefined) updateData.priority = priority

    await db
      .update(redirectRules)
      .set(updateData)
      .where(eq(redirectRules.id, ruleId))

    return NextResponse.json({ 
      success: true, 
      message: 'Rule updated successfully' 
    })

  } catch (error) {
    console.error('Update rule error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update rule', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}

// DELETE - Delete a rule
export async function DELETE(request: NextRequest, ctx: any) {
  try {
    const ruleId = ctx.params.id

    await db
      .delete(redirectRules)
      .where(eq(redirectRules.id, ruleId))

    return NextResponse.json({ 
      success: true, 
      message: 'Rule deleted successfully' 
    })

  } catch (error) {
    console.error('Delete rule error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete rule', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}
