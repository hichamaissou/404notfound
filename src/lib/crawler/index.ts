import { db, siteScans, scanPages, linkIssues } from '@/lib/db'
import { eq, sql } from 'drizzle-orm'

interface CrawlOptions {
  shopDomain: string
  scanId: string
  maxPages: number
  concurrency: number
  userAgent?: string
}

interface CrawlJob {
  url: string
  depth: number
}

interface CrawlResult {
  url: string
  statusCode: number
  ok: boolean
  redirectedTo?: string
  contentType?: string
  depth: number
}

/**
 * Sleep utility for throttling requests
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Normalize URL to absolute URL
 */
function normalizeUrl(url: string, baseUrl: string): string {
  try {
    return new URL(url, baseUrl).href
  } catch {
    return url
  }
}

/**
 * Check if URL is internal to the shop domain
 */
function isInternalUrl(url: string, shopDomain: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname === shopDomain || urlObj.hostname === `www.${shopDomain}`
  } catch {
    return false
  }
}

/**
 * Extract links from HTML content
 */
function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = []
  
  // Simple regex to extract href attributes from <a> tags
  const linkRegex = /<a[^>]+href\s*=\s*["']([^"']+)["'][^>]*>/gi
  let match
  
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1]
    if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      const absoluteUrl = normalizeUrl(href, baseUrl)
      if (absoluteUrl !== baseUrl) {
        links.push(absoluteUrl)
      }
    }
  }
  
  return [...new Set(links)] // Remove duplicates
}

/**
 * Fetch a single URL and return crawl result
 */
async function fetchUrl(url: string, userAgent: string, depth: number): Promise<CrawlResult> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'manual', // Handle redirects manually
    })

    const contentType = response.headers.get('content-type') || undefined
    const location = response.headers.get('location')
    
    return {
      url,
      statusCode: response.status,
      ok: response.ok,
      redirectedTo: location ? normalizeUrl(location, url) : undefined,
      contentType,
      depth,
    }
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error)
    return {
      url,
      statusCode: 0,
      ok: false,
      depth,
    }
  }
}

/**
 * Process crawl result and extract new URLs if it's HTML
 */
async function processCrawlResult(
  result: CrawlResult, 
  scanId: string, 
  shopDomain: string,
  userAgent: string
): Promise<string[]> {
  // Insert scan page result
  await db.insert(scanPages).values({
    id: crypto.randomUUID(),
    scanId,
    url: result.url,
    statusCode: result.statusCode,
    ok: result.ok,
    redirectedTo: result.redirectedTo,
    depth: result.depth,
    contentType: result.contentType,
    fetchedAt: new Date(),
  })

  // Insert link issues for broken links
  if (result.statusCode >= 400) {
    await db.insert(linkIssues).values({
      id: crypto.randomUUID(),
      scanId,
      fromUrl: result.url,
      toUrl: result.url,
      type: 'broken_link',
      statusCode: result.statusCode,
      createdAt: new Date(),
    })
  }

  // Insert link issues for redirects
  if (result.statusCode >= 300 && result.statusCode < 400 && result.redirectedTo) {
    await db.insert(linkIssues).values({
      id: crypto.randomUUID(),
      scanId,
      fromUrl: result.url,
      toUrl: result.redirectedTo,
      type: 'redirect_chain',
      statusCode: result.statusCode,
      createdAt: new Date(),
    })
  }

  // Extract links from HTML content if successful
  const newUrls: string[] = []
  
  if (result.ok && result.contentType?.includes('text/html')) {
    try {
      const response = await fetch(result.url, {
        method: 'GET',
        headers: { 'User-Agent': userAgent },
      })
      
      if (response.ok) {
        const html = await response.text()
        const extractedLinks = extractLinks(html, result.url)
        
        for (const link of extractedLinks) {
          if (isInternalUrl(link, shopDomain)) {
            newUrls.push(link)
          }
        }
      }
    } catch (error) {
      console.error(`Failed to extract links from ${result.url}:`, error)
    }
  }

  return newUrls
}

/**
 * Polite BFS crawler implementation
 */
export async function crawlSite(options: CrawlOptions): Promise<void> {
  const { shopDomain, scanId, maxPages, concurrency, userAgent = 'RedirectWatch/1.0' } = options
  
  console.log(`Starting crawl for ${shopDomain}, scanId: ${scanId}, maxPages: ${maxPages}`)
  
  try {
    // Mark scan as running
    await db
      .update(siteScans)
      .set({ 
        status: 'running',
        startedAt: new Date(),
      })
      .where(eq(siteScans.id, scanId))

    const startUrl = `https://${shopDomain}/`
    const queue: CrawlJob[] = [{ url: startUrl, depth: 0 }]
    const visited = new Set<string>()
    const processing = new Set<string>()
    
    let pagesScanned = 0
    const workers: Promise<void>[] = []
    
    // Worker function to process URLs from queue
    const worker = async (): Promise<void> => {
      while (queue.length > 0 && pagesScanned < maxPages) {
        const job = queue.shift()
        if (!job || visited.has(job.url) || processing.has(job.url) || job.depth > 3) {
          continue
        }
        
        processing.add(job.url)
        visited.add(job.url)
        pagesScanned++
        
        console.log(`Crawling ${job.url} (depth: ${job.depth}, pages: ${pagesScanned}/${maxPages})`)
        
        try {
          const result = await fetchUrl(job.url, userAgent, job.depth)
          const newUrls = await processCrawlResult(result, scanId, shopDomain, userAgent)
          
          // Add new URLs to queue if we haven't reached max depth
          if (job.depth < 3) {
            for (const url of newUrls) {
              if (!visited.has(url) && !processing.has(url)) {
                queue.push({ url, depth: job.depth + 1 })
              }
            }
          }
          
          // Throttle requests
          await sleep(50)
        } catch (error) {
          console.error(`Error processing ${job.url}:`, error)
        } finally {
          processing.delete(job.url)
        }
      }
    }
    
    // Start concurrent workers
    for (let i = 0; i < concurrency; i++) {
      workers.push(worker())
    }
    
    // Wait for all workers to complete
    await Promise.all(workers)
    
    // Calculate final stats
    const pagesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(scanPages)
      .where(eq(scanPages.scanId, scanId))
    
    const brokenLinksCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(linkIssues)
      .where(eq(linkIssues.scanId, scanId))
    
    const stats = {
      pagesScanned: pagesCount[0]?.count || 0,
      brokenLinks: brokenLinksCount[0]?.count || 0,
    }
    
    // Mark scan as completed
    await db
      .update(siteScans)
      .set({
        status: 'done',
        finishedAt: new Date(),
        stats,
      })
      .where(eq(siteScans.id, scanId))
    
    console.log(`Crawl completed for ${shopDomain}:`, stats)
    
  } catch (error) {
    console.error(`Crawl failed for ${shopDomain}:`, error)
    
    // Mark scan as failed
    await db
      .update(siteScans)
      .set({
        status: 'failed',
        finishedAt: new Date(),
        lastError: error instanceof Error ? error.message : 'Unknown error',
      })
      .where(eq(siteScans.id, scanId))
    
    throw error
  }
}
