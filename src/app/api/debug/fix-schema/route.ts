import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    console.log('Fixing site_scans schema...')
    
    // Check if site_scans table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'site_scans'
      )
    `)
    
    if (!tableExists.rows[0]?.exists) {
      return NextResponse.json({ 
        error: 'site_scans table does not exist',
        suggestion: 'Run /api/debug/create-tables first'
      }, { status: 404 })
    }
    
    // Check current schema
    const currentSchema = await db.execute(sql`
      SELECT 
        column_name, 
        data_type, 
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'site_scans' 
      AND column_name = 'id'
    `)
    
    console.log('Current schema:', currentSchema.rows[0])
    
    // Fix the schema if needed
    if (!currentSchema.rows[0]?.column_default) {
      await db.execute(sql`
        ALTER TABLE site_scans 
        ALTER COLUMN id SET DEFAULT gen_random_uuid()
      `)
      
      console.log('Fixed site_scans.id to use gen_random_uuid() default')
    }
    
    // Verify the fix
    const newSchema = await db.execute(sql`
      SELECT 
        column_name, 
        data_type, 
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'site_scans' 
      AND column_name = 'id'
    `)
    
    return NextResponse.json({
      success: true,
      message: 'Schema fixed successfully',
      before: currentSchema.rows[0],
      after: newSchema.rows[0],
      fixed: !currentSchema.rows[0]?.column_default
    })
    
  } catch (error) {
    console.error('Schema fix error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fix schema', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    )
  }
}
