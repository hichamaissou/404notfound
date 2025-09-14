import { NextRequest, NextResponse } from 'next/server'
import { db, shops, brokenUrls, redirects } from '@/lib/db'
import { eq, and } from 'drizzle-orm'
import { pathSimilarity } from '@/lib/algorithms/jaroWinkler'

interface AutoFixRequest {
  shop: string
  threshold?: number
  apply?: boolean
}

interface Suggestion {
  from: string
  to: string
  score: number
}

export async function POST(request: NextRequest) {
  try {
    const body: AutoFixRequest = await request.json()
    const { shop, threshold = 0.88, apply = false } = body

    if (!shop) {
      return NextResponse.json({ error: 'Missing shop parameter' }, { status: 400 })
    }

    // Validate shop exists
    const shopRecord = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.shopDomain, shop))
      .limit(1)

    if (!shopRecord.length) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const shopId = shopRecord[0].id

    // Get unresolved broken URLs
    const brokenPaths = await db
      .select({
        id: brokenUrls.id,
        path: brokenUrls.path,
        hits: brokenUrls.hits,
      })
      .from(brokenUrls)
      .where(
        and(
          eq(brokenUrls.shopId, shopId),
          eq(brokenUrls.isResolved, false)
        )
      )

    // Get existing redirect targets as candidates
    const existingRedirects = await db
      .select({
        toPath: redirects.toPath,
      })
      .from(redirects)
      .where(eq(redirects.shopId, shopId))

    const candidates = existingRedirects.map(r => r.toPath)
    
    // Add some common paths as candidates if we don't have many
    if (candidates.length < 10) {
      candidates.push(
        '/',
        '/products',
        '/collections',
        '/pages/about',
        '/pages/contact',
        '/blogs/news',
        '/cart',
        '/search'
      )
    }

    const suggestions: Suggestion[] = []

    // Find best matches for each broken URL
    for (const brokenUrl of brokenPaths) {
      let bestScore = 0
      let bestCandidate = ''

      for (const candidate of candidates) {
        const score = pathSimilarity(brokenUrl.path, candidate)
        
        if (score >= threshold && score > bestScore) {
          bestScore = score
          bestCandidate = candidate
        }
      }

      if (bestCandidate) {
        suggestions.push({
          from: brokenUrl.path,
          to: bestCandidate,
          score: bestScore,
        })
      }
    }

    // Sort suggestions by score (highest first)
    suggestions.sort((a, b) => b.score - a.score)

    // Apply suggestions if requested
    let appliedCount = 0
    if (apply && suggestions.length > 0) {
      for (const suggestion of suggestions) {
        try {
          // Create redirect
          await db.insert(redirects).values({
            id: crypto.randomUUID(),
            shopId,
            fromPath: suggestion.from,
            toPath: suggestion.to,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })

          // Mark broken URL as resolved
          await db
            .update(brokenUrls)
            .set({
              isResolved: true,
              resolvedAt: new Date(),
            })
            .where(
              and(
                eq(brokenUrls.shopId, shopId),
                eq(brokenUrls.path, suggestion.from)
              )
            )

          appliedCount++
        } catch (error) {
          console.error(`Failed to apply suggestion ${suggestion.from} -> ${suggestion.to}:`, error)
        }
      }
    }

    console.log(`Auto-fix for ${shop}: ${suggestions.length} suggestions, ${appliedCount} applied`)

    return NextResponse.json({
      count: suggestions.length,
      suggestions,
      applied: apply,
      appliedCount,
      threshold,
    })

  } catch (error) {
    console.error('Auto-fix error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate auto-fix suggestions', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    )
  }
}
