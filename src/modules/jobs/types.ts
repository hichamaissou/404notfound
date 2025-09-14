/**
 * Type definitions for background job system.
 * Provides strong typing for job payloads and execution context.
 */

/**
 * Base interface for all job payloads.
 */
export interface BaseJobPayload {
  [key: string]: unknown
}

/**
 * Payload for site crawling jobs.
 */
export interface CrawlSitePayload extends BaseJobPayload {
  /** Shop domain to crawl */
  shopDomain: string
  /** UUID of the scan record */
  scanId: string
  /** Maximum number of pages to crawl */
  maxPages: number
  /** Number of concurrent requests */
  concurrency: number
  /** Optional custom user agent */
  userAgent?: string
}

/**
 * Payload for email digest jobs.
 */
export interface EmailDigestPayload extends BaseJobPayload {
  /** Shop ID to generate digest for */
  shopId: string
  /** Email address to send to */
  email: string
  /** Digest period (weekly, monthly) */
  period: 'weekly' | 'monthly'
}

/**
 * Union type of all possible job payloads.
 */
export type JobPayload = CrawlSitePayload | EmailDigestPayload

/**
 * Job execution context passed to job handlers.
 */
export interface JobContext {
  /** Job ID for logging and tracking */
  jobId: string
  /** Current retry attempt (0 for first attempt) */
  attempt: number
  /** Maximum retries allowed */
  maxRetries: number
  /** Job creation timestamp */
  createdAt: Date
}

/**
 * Result of job execution.
 */
export interface JobResult {
  /** Whether the job completed successfully */
  success: boolean
  /** Optional result data */
  data?: unknown
  /** Error message if job failed */
  error?: string
  /** Whether the job should be retried on failure */
  retry?: boolean
}

/**
 * Job handler function signature.
 */
export type JobHandler<T extends BaseJobPayload = BaseJobPayload> = (
  payload: T,
  context: JobContext
) => Promise<JobResult>

/**
 * Map of job types to their handlers.
 */
export interface JobHandlers {
  crawl_site: JobHandler<CrawlSitePayload>
  email_digest: JobHandler<EmailDigestPayload>
}

/**
 * Job status enumeration.
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed'
