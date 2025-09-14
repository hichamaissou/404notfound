# Redirect Watch

A **Vercel-ready** Shopify embedded app for real-time 404 tracking, link auditing, and redirect management. Built with **Next.js 15 (App Router) + TypeScript + Polaris** and **Drizzle ORM on Postgres (Supabase)**.

## Features

### Core Functionality
- **Real-time 404 Tracking**: Capture 404 errors via App Proxy beacon
- **Advanced Link Audit**: Crawl and analyze your store for broken links, redirect chains, and SEO issues
- **Smart Redirect Suggestions**: AI-powered suggestions with one-click redirect creation via Shopify Admin GraphQL
- **Regex Rules Engine**: Pattern-based URL mapping with live simulator
- **Bulk CSV Import**: DropZone interface for importing redirects in bulk
- **ROI Dashboard**: Estimated revenue loss calculations and KPI tracking

### Advanced Features
- **Link Issue Detection**: Broken links, redirect chains, loops, canonical mismatches, trailing slashes
- **Weekly Digest**: Automated email reports with key metrics
- **Alert System**: Real-time notifications for 404 spikes
- **Billing Integration**: Pro subscription (€14/month) with 14-day trial
- **GDPR Compliance**: Full data redaction webhooks

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Shopify Polaris
- **Backend**: Next.js API Routes, Drizzle ORM
- **Database**: PostgreSQL (Supabase)
- **Authentication**: OAuth 2.0 + JWT (jose)
- **Shopify Integration**: App Bridge v3, Admin GraphQL API
- **Email**: Resend (optional)
- **Deployment**: Vercel

## Quick Start

### 1. Local Development

```bash
# Clone and install dependencies
git clone <your-repo>
cd redirect-watch
npm install

# Set up environment variables (see .env.local.example)
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### 2. GitHub Setup

```bash
git init
git add -A
git commit -m "init Redirect Watch"
git branch -M main
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

### 3. Vercel Deployment

1. Import your GitHub repository to Vercel
2. Framework Preset: **Next.js**
3. Root Directory: **/** (repository root)
4. Add all environment variables from `.env.local`
5. Deploy
6. Copy the Vercel URL → Update `SHOPIFY_APP_URL` in environment variables → Redeploy

#### Optional: Vercel Cron Job
Add a Vercel Cron job to process crawl jobs:
```json
{
  "crons": [
    {
      "path": "/api/scans/run",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### 4. Shopify Partner Dashboard

1. **App URL**: `https://<your-vercel-app>.vercel.app/`
2. **Allowed redirection URLs**: `https://<your-vercel-app>.vercel.app/api/auth/callback`
3. **App Proxy Settings**:
   - Subpath prefix: `apps`
   - Subpath: `redirect-watch`  
   - Proxy URL: `https://<your-vercel-app>.vercel.app/api/proxy/track`
4. **App Scopes**: `write_online_store_navigation,read_online_store_navigation,read_products,read_content`

### 5. Theme Integration

Add this snippet to your theme's `404.liquid` template:

```liquid
<img alt="" aria-hidden="true" width="1" height="1" style="display:none"
     src="/apps/redirect-watch/track?path={{ request.path | url_encode }}">
```

## Environment Variables

```bash
# Shopify App Credentials
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_SCOPES=write_online_store_navigation,read_online_store_navigation,read_products,read_content
SHOPIFY_APP_URL=https://your-vercel-app.vercel.app
SHOPIFY_API_VERSION=2025-07

# Public (exposed to client)
NEXT_PUBLIC_SHOPIFY_API_KEY=your_api_key

# Security
ENCRYPTION_KEY=your_32_char_hex_key

# Database
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require

# Billing
BILLING_CURRENCY=EUR
BILLING_PLAN_NAME=Pro
BILLING_PRICE_AMOUNT=14.00
BILLING_TRIAL_DAYS=14
BILLING_TEST_MODE=true

# Optional Email (Resend)
RESEND_API_KEY=your_resend_key

# Environment
NODE_ENV=development
LOG_LEVEL=info
```

## Project Structure

```
src/
├── app/
│   ├── (embedded)/          # Embedded app routes
│   │   ├── layout.tsx       # App Bridge + Polaris setup
│   │   └── page.tsx         # Main dashboard
│   ├── api/                 # API routes
│   │   ├── auth/            # OAuth flow
│   │   ├── billing/         # Subscription management
│   │   ├── broken-urls/     # 404 tracking
│   │   ├── imports/         # CSV import status
│   │   ├── proxy/           # App Proxy tracking
│   │   ├── redirects/       # Redirect CRUD
│   │   ├── redirect-rules/  # Regex rules
│   │   ├── scans/           # Link auditing
│   │   └── webhooks/        # GDPR compliance
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Install page
├── components/
│   ├── Dashboard.tsx        # Main dashboard with tabs
│   ├── RedirectManagement.tsx  # Redirect & rules UI
│   └── CSVImport.tsx        # Bulk import interface
├── lib/
│   ├── alerts/              # Email & digest system
│   ├── auth/                # JWT & OAuth helpers
│   ├── billing/             # Subscription middleware
│   ├── crawler/             # Link audit engine
│   ├── db/                  # Drizzle schema & connection
│   └── shopify/             # Admin GraphQL & proxy
└── ...
```

## API Documentation

### Core Endpoints

- `GET /api/broken-urls` - List 404 errors with stats
- `POST /api/redirects` - Create redirect
- `DELETE /api/redirects/[id]` - Delete redirect
- `POST /api/redirects/bulk` - Bulk CSV import
- `GET /api/redirect-rules` - List regex rules
- `POST /api/redirect-rules` - Create regex rule

### Scanning System

- `POST /api/scans/queue` - Start link audit
- `POST /api/scans/run` - Process scan jobs (for cron)
- `GET /api/scans/[id]/status` - Check scan progress

### Billing & Auth

- `GET /api/billing/check` - Check subscription status
- `POST /api/billing/subscribe` - Create subscription
- `GET /api/auth?shop=example.myshopify.com` - Start OAuth
- `GET /api/auth/callback` - OAuth callback

## Database Schema

### Core Tables
- `shops` - Store installations
- `broken_urls` - 404 tracking data
- `redirects` - Redirect management
- `imports` - CSV import history
- `settings` - Per-shop configuration
- `subscriptions` - Billing information

### Audit System
- `site_scans` - Scan sessions
- `scan_pages` - Individual page results
- `link_issues` - Detected problems
- `redirect_rules` - Regex patterns
- `jobs` - Background job queue
- `alerts` - Notification history

## Development Notes

### Key Design Decisions

1. **App Bridge v3**: Uses core `createApp()` without React provider for better compatibility
2. **No GraphQL Client**: Direct fetch to Admin GraphQL for simpler dependency management
3. **Serverless-Safe Crawling**: Job queue system processes in small chunks
4. **HMAC Verification**: All App Proxy requests verified with Shopify signature
5. **Polaris Latest**: Uses `tone` props and `DropZone.FileUpload` pattern

### Security Features

- JWT tokens with `jose` library
- App Proxy HMAC verification
- OAuth state parameter validation
- GDPR webhook signature verification
- Rate limiting on crawler (5-10 concurrent)

### Performance Optimizations

- Database indexes on frequently queried columns
- Pagination on large datasets
- Concurrent job processing with limits
- Deduplication of crawled URLs
- Background processing for imports

## Testing

```bash
# Build check
npm run build

# Database migration
npm run db:push

# Test 404 tracking
curl "https://your-app.vercel.app/api/proxy/track?shop=test.myshopify.com&path=/test-404&signature=..."
```

## Deployment Checklist

- [ ] Environment variables configured in Vercel
- [ ] Database schema pushed to production
- [ ] Shopify App URLs updated with Vercel domain
- [ ] App Proxy configured correctly
- [ ] GDPR webhooks endpoints added
- [ ] Optional: Vercel Cron job configured
- [ ] Optional: Resend API key for emails

## Troubleshooting

### Common Issues

1. **"Unexpected token '<'"**: API routes returning HTML instead of JSON
   - Check authentication headers
   - Verify environment variables

2. **App Proxy not working**: 
   - Verify HMAC signature calculation
   - Check proxy URL configuration in Partner Dashboard

3. **OAuth loop**:
   - Ensure callback URL matches exactly
   - Check state parameter validation

4. **Database connection**:
   - Verify DATABASE_URL format
   - Check Supabase connection limits

### Debug Mode

Set `LOG_LEVEL=debug` for verbose logging.

## License

MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please use GitHub Issues.
