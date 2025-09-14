import { desc,eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

import { getSessionFromHeaders } from '@/lib/auth/jwt'
import { db, imports } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromHeaders(request.headers)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const importRecords = await db
      .select()
      .from(imports)
      .where(eq(imports.shopId, session.shopId))
      .orderBy(desc(imports.createdAt))
      .limit(50)

    return NextResponse.json({ imports: importRecords })
  } catch (error) {
    console.error('Error fetching import status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
