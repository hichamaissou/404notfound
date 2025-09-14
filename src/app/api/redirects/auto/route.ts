import { and, desc, eq } from 'drizzle-orm'
import { NextRequest } from 'next/server'
import { z } from 'zod'

import { pathSimilarity } from '@/lib/algorithms/jaroWinkler'
import { jsonWithRequestId } from '@/core/api/respond'
import { brokenUrls, db, redirects, scanPages, shops, siteScans } from '@/lib/db'

interface Suggestion {
  from: string
  to: string
  score: number
}

export async function POST(request: NextRequest) {
  try {
    const Schema = z.object({
      shop: z.string().min(1),
      threshold: z.number().min(0.5).max(1).optional(),
      apply: z.boolean().optional(),
    })
    const parsed = Schema.safeParse(await request.json())
    if (!parsed.success) {
      return jsonWithRequestId({ ok: false, error: 'Invalid body', issues: parsed.error.flatten() }, { status: 400 })
    }
    const { shop, threshold = 0.88, apply = false } = parsed.data

    // Validate shop exists
    const shopRecord = await db
      .select({ id: shops.id })
      .from(shops)
      .where(eq(shops.shopDomain, shop))
      .limit(1)

    if (!shopRecord.length) {
      return jsonWithRequestId({ ok: false, error: 'Shop not found' }, { status: 404 })
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

    const candidates = new Set<string>(existingRedirects.map(r => r.toPath))

    // Include candidates from latest finished scan OK pages (HTML or 2xx)
    const [latestDoneScan] = await db
      .select({ id: siteScans.id })
      .from(siteScans)
      .where(and(eq(siteScans.shopId, shopId), eq(siteScans.status, 'done')))
      .orderBy(desc(siteScans.startedAt))
      .limit(1)

    if (latestDoneScan) {
      const okPages = await db
        .select({ url: scanPages.url, status: scanPages.statusCode, contentType: scanPages.contentType })
        .from(scanPages)
        .where(eq(scanPages.scanId, latestDoneScan.id))

      for (const p of okPages) {
        const isOk = (p.status ?? 0) >= 200 && (p.status ?? 0) < 300
        const isHtml = p.contentType?.includes('text/html')
        if (isOk || isHtml) {
          try {
            const u = new URL(p.url)
            candidates.add(u.pathname)
          } catch {
            // ignore invalid
          }
        }
      }
    }
    
    // Add some common paths as candidates if we don't have many
    if (candidates.size < 10) {
      ;[
        '/',
        '/products',
        '/collections',
        '/pages/about',
        '/pages/contact',
        '/blogs/news',
        '/cart',
        '/search'
      ].forEach((c) => candidates.add(c))
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

    console.log(`Autofix suggestions: ${suggestions.length}, applied: ${appliedCount}`)

    return jsonWithRequestId({ count: suggestions.length, suggestions, applied: apply, appliedCount, threshold })

  } catch (error) {
    console.error('Auto-fix error:', error)
    return jsonWithRequestId(
      { ok: false, error: 'Failed to generate auto-fix suggestions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
