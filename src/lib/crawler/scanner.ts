import { db, siteScans, scanPages, linkIssues, jobs } from '@/lib/db'
import { eq, and, inArray } from 'drizzle-orm'
import { createShopifyAdminGraphQL } from '@/lib/shopify/admin-graphql'

interface CrawlJob {
  scanId: number
  url: string
  depth: number
  shopDomain: string
}

interface PageResult {
  url: string
  statusCode: number
  ok: boolean
  redirectedTo?: string
  contentType?: string
  canonical?: string
  links: string[]
  issues: string[]
}

export class WebScanner {
  private maxConcurrency = 5
  private maxPages = 5000
  private visitedUrls = new Set<string>()
  private processing = new Set<string>()

  async startScan(shopId: number, shopDomain: string, accessToken: string): Promise<number> {
    // Create scan record
    const [scan] = await db
      .insert(siteScans)
      .values({
        shopId,
        status: 'queued',
        seeds: [],
        stats: {},
      })
      .returning()

    // Generate seed URLs from Shopify resources
    const seeds = await this.generateSeedUrls(shopDomain, accessToken)
    
    // Update scan with seeds
    await db
      .update(siteScans)
      .set({ seeds })
      .where(eq(siteScans.id, scan.id))

    // Queue initial jobs
    for (const url of seeds.slice(0, 50)) { // Limit initial seeds
      await this.queueCrawlJob({
        scanId: scan.id,
        url,
        depth: 0,
        shopDomain,
      })
    }

    return scan.id
  }

  private async generateSeedUrls(shopDomain: string, accessToken: string): Promise<string[]> {
    const baseUrl = `https://${shopDomain}`
    const seeds = [baseUrl, `${baseUrl}/sitemap.xml`]

    try {
      const shopifyAdmin = createShopifyAdminGraphQL(shopDomain, accessToken)

      // Get products, collections, pages, blogs
      const [products, collections, pages, blogs] = await Promise.all([
        shopifyAdmin.getProducts(100),
        shopifyAdmin.getCollections(50),
        shopifyAdmin.getPages(50),
        shopifyAdmin.getBlogs(20),
      ])

      // Generate URLs
      products.forEach(product => {
        seeds.push(`${baseUrl}/products/${product.handle}`)
      })

      collections.forEach(collection => {
        seeds.push(`${baseUrl}/collections/${collection.handle}`)
      })

      pages.forEach(page => {
        seeds.push(`${baseUrl}/pages/${page.handle}`)
      })

      for (const blog of blogs) {
        seeds.push(`${baseUrl}/blogs/${blog.handle}`)
        
        // Get articles for each blog
        const articles = await shopifyAdmin.getArticles(blog.id, 20)
        articles.forEach(article => {
          seeds.push(`${baseUrl}/blogs/${blog.handle}/${article.handle}`)
        })
      }
    } catch (error) {
      console.error('Error generating seed URLs:', error)
    }

    return [...new Set(seeds)] // Dedupe
  }

  private async queueCrawlJob(job: CrawlJob): Promise<void> {
    await db
      .insert(jobs)
      .values({
        type: 'crawl_page',
        payload: job,
        status: 'pending',
      })
  }

  async processJobs(limit = 10): Promise<void> {
    const pendingJobs = await db
      .select()
      .from(jobs)
      .where(and(
        eq(jobs.type, 'crawl_page'),
        eq(jobs.status, 'pending')
      ))
      .limit(limit)

    if (pendingJobs.length === 0) {
      return
    }

    // Mark jobs as running
    await db
      .update(jobs)
      .set({ status: 'running', updatedAt: new Date() })
      .where(inArray(jobs.id, pendingJobs.map(j => j.id)))

    // Process jobs concurrently
    const promises = pendingJobs.map(job => this.processCrawlJob(job))
    await Promise.allSettled(promises)
  }

  private async processCrawlJob(job: any): Promise<void> {
    const crawlJob = job.payload as CrawlJob
    
    try {
      if (this.visitedUrls.has(crawlJob.url) || this.processing.has(crawlJob.url)) {
        await this.markJobCompleted(job.id)
        return
      }

      this.processing.add(crawlJob.url)
      
      // Check if scan is still active
      const [scan] = await db
        .select()
        .from(siteScans)
        .where(eq(siteScans.id, crawlJob.scanId))
        .limit(1)

      if (!scan || scan.status !== 'running') {
        await this.markJobCompleted(job.id)
        return
      }

      // Crawl the page
      const result = await this.crawlPage(crawlJob.url, crawlJob.shopDomain)
      this.visitedUrls.add(crawlJob.url)

      // Save page result
      await db
        .insert(scanPages)
        .values({
          scanId: crawlJob.scanId,
          url: crawlJob.url,
          statusCode: result.statusCode,
          ok: result.ok,
          redirectedTo: result.redirectedTo,
          depth: crawlJob.depth,
          contentType: result.contentType,
          canonical: result.canonical,
          issues: result.issues,
        })

      // Process found links
      if (result.ok && crawlJob.depth < 3) {
        for (const link of result.links.slice(0, 20)) {
          if (!this.visitedUrls.has(link) && this.isSameDomain(link, crawlJob.shopDomain)) {
            await this.queueCrawlJob({
              scanId: crawlJob.scanId,
              url: link,
              depth: crawlJob.depth + 1,
              shopDomain: crawlJob.shopDomain,
            })
          }
        }
      }

      // Record link issues
      for (const issue of result.issues) {
        await db
          .insert(linkIssues)
          .values({
            scanId: crawlJob.scanId,
            fromUrl: crawlJob.url,
            toUrl: result.redirectedTo || crawlJob.url,
            type: issue,
            details: {},
          })
          .onConflictDoUpdate({
            target: [linkIssues.scanId, linkIssues.fromUrl, linkIssues.toUrl, linkIssues.type],
            set: {
              lastSeen: new Date(),
            },
          })
      }

      await this.markJobCompleted(job.id)
    } catch (error) {
      console.error('Error processing crawl job:', error)
      await this.markJobFailed(job.id, error instanceof Error ? error.message : 'Unknown error')
    } finally {
      this.processing.delete(crawlJob.url)
    }
  }

  private async crawlPage(url: string, shopDomain: string): Promise<PageResult> {
    const result: PageResult = {
      url,
      statusCode: 0,
      ok: false,
      links: [],
      issues: [],
    }

    try {
      // First try HEAD request
      const headResponse = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Redirect Watch Crawler/1.0',
        },
        redirect: 'manual',
      })

      result.statusCode = headResponse.status
      result.ok = headResponse.ok
      result.contentType = headResponse.headers.get('content-type') || undefined

      // Handle redirects
      if (headResponse.status >= 300 && headResponse.status < 400) {
        const location = headResponse.headers.get('location')
        if (location) {
          result.redirectedTo = this.resolveUrl(location, url)
          result.issues.push('redirect_chain')
        }
      }

      // If not OK, record the issue
      if (!headResponse.ok) {
        if (headResponse.status === 404) {
          result.issues.push('broken_link')
        } else if (headResponse.status >= 500) {
          result.issues.push('server_error')
        }
      }

      // For HTML pages, get content to extract links
      if (result.ok && result.contentType?.includes('text/html')) {
        const getResponse = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Redirect Watch Crawler/1.0',
          },
        })

        if (getResponse.ok) {
          const html = await getResponse.text()
          result.links = this.extractLinks(html, url)
          result.canonical = this.extractCanonical(html)

          // Check for canonical issues
          if (result.canonical && result.canonical !== url) {
            result.issues.push('canonical_mismatch')
          }
        }
      }
    } catch (error) {
      result.issues.push('fetch_error')
      console.error(`Error crawling ${url}:`, error)
    }

    return result
  }

  private extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = []
    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
    let match

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1]
      if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        const resolvedUrl = this.resolveUrl(href, baseUrl)
        if (resolvedUrl) {
          links.push(resolvedUrl)
        }
      }
    }

    return [...new Set(links)]
  }

  private extractCanonical(html: string): string | undefined {
    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i)
    return canonicalMatch ? canonicalMatch[1] : undefined
  }

  private resolveUrl(url: string, base: string): string {
    try {
      return new URL(url, base).href
    } catch {
      return ''
    }
  }

  private isSameDomain(url: string, shopDomain: string): boolean {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname === shopDomain || urlObj.hostname.endsWith('.myshopify.com')
    } catch {
      return false
    }
  }

  private async markJobCompleted(jobId: number): Promise<void> {
    await db
      .update(jobs)
      .set({ status: 'completed', updatedAt: new Date() })
      .where(eq(jobs.id, jobId))
  }

  private async markJobFailed(jobId: number, error: string): Promise<void> {
    await db
      .update(jobs)
      .set({ 
        status: 'failed', 
        lastError: error,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
  }
}
