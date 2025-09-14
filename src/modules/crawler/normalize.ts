/**
 * URL normalization and HTML parsing utilities for web crawling.
 * Handles URL resolution, internal link detection, and link extraction.
 */

import { URL } from 'url'

/**
 * Normalizes a URL relative to a base URL.
 * Handles relative URLs, fragments, and query parameters.
 * 
 * @param url - URL to normalize (can be relative or absolute)
 * @param baseUrl - Base URL for resolving relative URLs
 * @returns Normalized absolute URL
 */
export function normalizeUrl(url: string, baseUrl: string): string {
  try {
    const resolved = new URL(url, baseUrl)
    
    // Remove fragment identifier
    resolved.hash = ''
    
    // Normalize trailing slash for consistency
    if (resolved.pathname.endsWith('/') && resolved.pathname.length > 1) {
      resolved.pathname = resolved.pathname.slice(0, -1)
    }
    
    return resolved.toString()
  } catch {
    // Invalid URL, return original
    return url
  }
}

/**
 * Checks if a URL is internal to the given domain.
 * 
 * @param url - URL to check
 * @param domain - Domain to compare against (e.g., 'example.myshopify.com')
 * @returns True if URL is internal to the domain
 */
export function isInternalUrl(url: string, domain: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.hostname === domain
  } catch {
    return false
  }
}

/**
 * Extracts all links from HTML content.
 * Finds href attributes in anchor tags and normalizes them.
 * 
 * @param html - HTML content to parse
 * @param baseUrl - Base URL for resolving relative links
 * @returns Array of normalized absolute URLs
 */
export function extractLinksFromHtml(html: string, baseUrl: string): string[] {
  const links: string[] = []
  
  // Simple regex to find href attributes
  // In production, consider using a proper HTML parser like cheerio
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi
  let match
  
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1]
    
    if (!href) {
      continue
    }
    
    // Skip non-HTTP links
    if (href.startsWith('mailto:') || 
        href.startsWith('tel:') || 
        href.startsWith('javascript:') ||
        href.startsWith('#')) {
      continue
    }
    
    const normalizedUrl = normalizeUrl(href, baseUrl)
    
    // Avoid duplicates
    if (!links.includes(normalizedUrl)) {
      links.push(normalizedUrl)
    }
  }
  
  return links
}

/**
 * Extracts the canonical URL from HTML if present.
 * 
 * @param html - HTML content to parse
 * @param baseUrl - Base URL for resolving relative canonical URLs
 * @returns Canonical URL or null if not found
 */
export function extractCanonicalUrl(html: string, baseUrl: string): string | null {
  const canonicalRegex = /<link[^>]+rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["']/i
  const match = canonicalRegex.exec(html)
  
  if (match && match[1]) {
    return normalizeUrl(match[1], baseUrl)
  }
  
  return null
}

/**
 * Checks if a URL should be excluded from crawling.
 * Filters out common non-content URLs like admin, API, assets, etc.
 * 
 * @param url - URL to check
 * @returns True if URL should be excluded
 */
export function shouldExcludeUrl(url: string): boolean {
  const excludePatterns = [
    '/admin',
    '/api/',
    '/apps/',
    '/cdn/',
    '/assets/',
    '/static/',
    '.css',
    '.js',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.ico',
    '.pdf',
    '.zip',
    '.xml',
    '.json',
    'sitemap',
    'robots.txt',
  ]
  
  const lowercaseUrl = url.toLowerCase()
  
  return excludePatterns.some(pattern => lowercaseUrl.includes(pattern))
}
