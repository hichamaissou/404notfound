import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromHeaders } from '@/lib/auth/jwt'
import { db, redirects, shops } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { createShopifyAdminGraphQL } from '@/lib/shopify/admin-graphql'

export async function PATCH(request: NextRequest, ctx: any) {
  try {
    const session = await getSessionFromHeaders(request.headers)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = ctx.params.id
    const { target } = await request.json()

    if (!target) {
      return NextResponse.json({ error: 'Target is required' }, { status: 400 })
    }

    // Get redirect and shop details
    const [redirect] = await db
      .select({
        redirect: redirects,
        shop: shops,
      })
      .from(redirects)
      .innerJoin(shops, eq(shops.id, redirects.shopId))
      .where(and(
        eq(redirects.id, id),
        eq(redirects.shopId, session.shopId)
      ))
      .limit(1)

    if (!redirect) {
      return NextResponse.json({ error: 'Redirect not found' }, { status: 404 })
    }

    // Note: Shopify doesn't support updating redirects, so we'd need to delete and recreate
    // For now, we'll just update locally

    // Update in local database
    const [updatedRedirect] = await db
      .update(redirects)
      .set({ 
        toPath: target,
        updatedAt: new Date(),
      })
      .where(eq(redirects.id, id))
      .returning()

    return NextResponse.json({ redirect: updatedRedirect })
  } catch (error) {
    console.error('Error updating redirect:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update redirect' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, ctx: any) {
  try {
    const session = await getSessionFromHeaders(request.headers)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = ctx.params.id

    // Get redirect and shop details
    const [redirect] = await db
      .select({
        redirect: redirects,
        shop: shops,
      })
      .from(redirects)
      .innerJoin(shops, eq(shops.id, redirects.shopId))
      .where(and(
        eq(redirects.id, id),
        eq(redirects.shopId, session.shopId)
      ))
      .limit(1)

    if (!redirect) {
      return NextResponse.json({ error: 'Redirect not found' }, { status: 404 })
    }

    // Note: In a real implementation, you would delete from Shopify here
    // For now, we'll just delete locally

    // Delete from local database
    await db
      .delete(redirects)
      .where(eq(redirects.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting redirect:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to delete redirect' 
    }, { status: 500 })
  }
}
