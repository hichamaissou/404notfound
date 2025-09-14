# Architecture Overview

## System Design

Redirect Watch is a Shopify embedded app built with Next.js 15, TypeScript, and Drizzle ORM. The app follows a clean architecture pattern with clear separation of concerns.

### Core Modules

```
src/
├── config/           # Environment configuration with zod validation
├── core/             # Cross-cutting concerns (errors, logging, API handler)
├── modules/          # Domain-specific business logic
├── ui/               # Reusable UI components and hooks
└── app/              # Next.js App Router (routes only)
```

### Module Structure

Each domain module follows a consistent pattern:

- **Repository Layer**: Database operations with type safety
- **Service Layer**: Business logic and external API integration
- **Types**: TypeScript interfaces and schemas
- **Index**: Barrel exports for clean imports

Example module structure:
```
modules/auth/
├── oauth.ts          # OAuth flow implementation
├── cookies.ts        # Secure cookie management
├── index.ts          # Barrel exports
└── types.ts          # Auth-related types
```

## Data Flow

### OAuth Flow Sequence

1. **Initiate OAuth**: `/api/auth` → Redirect to Shopify
2. **OAuth Callback**: `/api/auth/callback` → Verify & exchange token
3. **Store Credentials**: Save shop + token in database
4. **Redirect to App**: Embedded app with authenticated session

### App Proxy Flow

1. **404 Detection**: Customer hits non-existent page
2. **Proxy Request**: Shopify sends request to `/api/proxy/track`
3. **HMAC Verification**: Validate request authenticity
4. **Record 404**: Store broken URL in database
5. **Return Response**: 404 page or redirect

### Crawler & Jobs Lifecycle

1. **Queue Scan**: User triggers scan → Create `site_scans` + `jobs` records
2. **Job Runner**: Cron/manual trigger → Process pending jobs
3. **Crawl Execution**: BFS crawl with politeness (50ms delays)
4. **Record Results**: Store pages, issues, and statistics
5. **Mark Complete**: Update scan status and notify user

## Database Schema

### Core Tables

- **shops**: Store shop credentials and metadata
- **redirects**: URL redirect mappings
- **broken_urls**: 404 error tracking
- **site_scans**: Crawl scan records
- **jobs**: Background job queue

### Relationships

```
shops (1) → (*) redirects
shops (1) → (*) broken_urls
shops (1) → (*) site_scans
site_scans (1) → (*) scan_pages
site_scans (1) → (*) link_issues
```

## Security Considerations

### OAuth Security

- **State Parameter**: CSRF protection with secure random state
- **HMAC Verification**: Validate all Shopify requests
- **Secure Cookies**: `httpOnly`, `secure`, `sameSite: 'none'`
- **Token Encryption**: Access tokens encrypted in production

### API Security

- **Input Validation**: Zod schemas for all API inputs
- **Error Handling**: Consistent error responses without data leaks
- **Request Logging**: Structured logging with request IDs
- **Rate Limiting**: Built-in Next.js protections

### Embedded App Security

- **CSP Headers**: `frame-ancestors` restrictions
- **App Bridge**: Secure communication with Shopify admin
- **No External Dependencies**: Minimal attack surface

## Scalability Design

### Database

- **Connection Pooling**: PostgreSQL connection management
- **UUID Primary Keys**: Distributed-friendly identifiers
- **Indexes**: Optimized queries on common access patterns

### Background Jobs

- **Async Processing**: Non-blocking job execution
- **Retry Logic**: Exponential backoff for failed jobs
- **Concurrency Control**: Configurable parallel execution

### Caching Strategy

- **Static Generation**: Pre-rendered pages where possible
- **API Response Caching**: Conditional based on data freshness
- **Client-Side Caching**: React hooks with stale-while-revalidate

## Monitoring & Observability

### Logging

- **Structured Logs**: JSON format for production
- **Request Tracing**: Unique request IDs
- **Error Context**: Full stack traces with sanitized data

### Health Checks

- **Database Connectivity**: Connection pool status
- **External Services**: Shopify API availability
- **Job Queue**: Background processing health

### Metrics

- **Performance**: API response times
- **Business**: Scan completion rates, error detection
- **Infrastructure**: Memory usage, connection counts
