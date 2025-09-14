# Redirect Watch - Rolls-Royce Edition 🚀

A premium Shopify embedded app for 404 tracking and redirect management, built with Next.js 15, Polaris, and Drizzle ORM.

**Recently Refactored** - Clean architecture with domain modules, type safety, and maintainable code structure.

## Features

### 🎯 **Core Features**
- **Real-time 404 Capture** - Track broken links via App Proxy
- **Advanced Link Audit** - Discover broken links, redirect chains, and canonical issues
- **Smart Auto-fix** - AI-powered suggestions using Jaro-Winkler similarity
- **Regex Rules Engine** - Pattern-based redirect automation with simulator
- **Bulk CSV Import** - Mass redirect creation with DropZone
- **ROI Dashboard** - Revenue impact tracking with charts
- **Weekly Digests** - Automated email reports

### 🏗️ **Rolls-Royce Upgrade**
- **Polite BFS Crawler** - Respectful site scanning (1,500 pages, 4 workers)
- **Background Job System** - Async processing with retry logic
- **Advanced Analytics** - Trend charts and KPI tracking
- **Intelligent Matching** - Jaro-Winkler algorithm for auto-suggestions
- **Pattern Simulator** - Test regex rules before applying
- **Onboarding Flow** - Guided setup for new users

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **UI**: Shopify Polaris + Chart.js + React Chart.js 2
- **Database**: PostgreSQL (Supabase) + Drizzle ORM with UUID primary keys
- **Auth**: OAuth 2.0 + JWT + App Bridge v3
- **Deployment**: Vercel with cron jobs
- **Email**: Resend (optional)
- **Quality**: ESLint + Prettier + Strict TypeScript

## Architecture

### Folder Structure
```
src/
├── config/           # Environment configuration (zod validated)
├── core/             # Cross-cutting concerns (errors, logging, API)
├── modules/          # Domain-specific business logic
│   ├── auth/         # OAuth flow and cookie management
│   ├── db/           # Database client and repositories
│   ├── shopify/      # Shopify Admin API integration
│   ├── crawler/      # Web crawling functionality
│   └── jobs/         # Background job system
├── ui/               # Reusable components and hooks
└── app/              # Next.js routes (unchanged URLs)
```

### Key Principles
- **Clean Architecture**: Domain modules with clear boundaries
- **Type Safety**: Strict TypeScript with zod validation
- **Error Handling**: Consistent error responses with request tracing
- **Observability**: Structured logging with request IDs

## Development

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Shopify Partner account

### Setup
```bash
# Clone and install
git clone <repository>
cd redirect-watch
npm install

# Environment setup
cp .env.example .env.local
# Fill in your environment variables

# Database setup
npm run db:push

# Development server
npm run dev
```

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run typecheck` - TypeScript validation
- `npm run lint` - Code quality checks
- `npm run format` - Code formatting
- `npm run build:ci` - Full validation pipeline

### Adding New Features

1. **Create Module**: Add to `src/modules/[feature]/`
2. **Repository Layer**: Database operations in `src/modules/db/repo/`
3. **Service Layer**: Business logic in `src/modules/[feature]/service.ts`
4. **API Routes**: Use `withJson()` wrapper for consistency
5. **UI Components**: Reusable components in `src/ui/components/`
6. **Documentation**: JSDoc comments on all exports

## Environment Variables

### Required
```env
# Shopify App Configuration
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_SCOPES=read_products,write_online_store_navigation,read_content
SHOPIFY_APP_URL=https://your-app.vercel.app

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# JWT
JWT_SECRET=your_jwt_secret

# Cron Protection
CRON_SECRET=your_secure_cron_secret
```

### Optional
```env
# Email Alerts (Future Use)
RESEND_API_KEY=your_resend_key
ALERTS_TO=admin@yourstore.com,manager@yourstore.com

# Billing
BILLING_PLAN_NAME=Pro
BILLING_PRICE_AMOUNT=14.00
BILLING_CURRENCY=EUR
BILLING_TRIAL_DAYS=14

# Debug
DEBUG_KEY=your_debug_key
```

## Installation & Setup

### 1. Clone & Install
```bash
git clone https://github.com/your-username/redirect-watch.git
cd redirect-watch
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 3. Database Setup
```bash
# Push schema to Supabase
npm run db:push
```

### 4. Development
```bash
npm run dev
```

### 5. Production Deployment
```bash
# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard
```

## API Endpoints

### Scan Management
```bash
# Queue a new scan
curl -X POST https://your-app.vercel.app/api/scans/queue \
  -H 'Content-Type: application/json' \
  -d '{"shop":"your-shop.myshopify.com"}'

# Run pending jobs (cron)
curl -X POST https://your-app.vercel.app/api/scans/run \
  -H 'Authorization: Bearer YOUR_CRON_SECRET'

# Check scan status
curl https://your-app.vercel.app/api/scans/status?shop=your-shop.myshopify.com
```

### Auto-fix Suggestions
```bash
# Preview suggestions
curl -X POST https://your-app.vercel.app/api/redirects/auto \
  -H 'Content-Type: application/json' \
  -d '{"shop":"your-shop.myshopify.com","threshold":0.88,"apply":false}'

# Apply suggestions
curl -X POST https://your-app.vercel.app/api/redirects/auto \
  -H 'Content-Type: application/json' \
  -d '{"shop":"your-shop.myshopify.com","threshold":0.88,"apply":true}'
```

### Regex Rules Testing
```bash
# Test regex patterns
curl -X POST https://your-app.vercel.app/api/redirect-rules/test \
  -H 'Content-Type: application/json' \
  -d '{
    "path": "/old-product/example",
    "rules": [{
      "pattern": "^/old-product/(.+)$",
      "replacement": "/products/$1",
      "flags": "g",
      "enabled": true,
      "priority": 1
    }]
  }'
```

## Vercel Cron Configuration

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/scans/run",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/scans/run", 
      "schedule": "0 6 * * *"
    }
  ]
}
```

Or set up in Vercel Dashboard:
- **Every 5 minutes**: `POST /api/scans/run` with `Authorization: Bearer ${CRON_SECRET}`
- **Daily at 06:00 UTC**: `POST /api/scans/run` with `Authorization: Bearer ${CRON_SECRET}`

## Architecture

### Database Schema (UUID-based)
- `shops` - Store information and access tokens
- `broken_urls` - Captured 404 errors with hit counts
- `redirects` - Manual and auto-generated redirects
- `redirect_rules` - Regex patterns for automation
- `site_scans` - Crawl job status and metadata
- `scan_pages` - Individual page results
- `link_issues` - Discovered problems (broken links, redirects)
- `jobs` - Background task queue
- `subscriptions` - Billing and trial management
- `settings` - Per-shop configuration
- `imports` - CSV upload tracking
- `alerts` - Email notification log

### Job System
```typescript
// Queue a crawl job
await createJob('crawl_site', {
  shopDomain: 'shop.myshopify.com',
  scanId: 'uuid',
  maxPages: 1500,
  concurrency: 4
})

// Process jobs (called by cron)
await runPendingJobs(15)
```

### Auto-fix Algorithm
Uses Jaro-Winkler similarity to match broken URLs with existing redirect targets:
- **95%+ confidence**: Excellent match
- **90-94%**: Very good match  
- **85-89%**: Good match
- **80-84%**: Fair match

## User Interface

### Navigation
- **Dashboard** - KPIs, trends, and quick actions
- **Scans** - Site crawl management and history
- **Rules** - Regex pattern management with simulator
- **Auto-fix** - AI-powered redirect suggestions

### Dashboard Features
- Real-time 404 counts and resolution rates
- Estimated ROI calculations (2% conversion, €60 AOV)
- 14-day trend charts using Chart.js
- Top 5 broken paths with hit counts
- One-click scan initiation

### Onboarding Flow
New users see guided setup:
1. **Add 404 Tracking** - Theme snippet installation
2. **Run First Scan** - Discover existing issues
3. **Create Redirects** - Manual or auto-fix options

## Security

- **OAuth 2.0** with state parameter validation
- **JWT tokens** for session management
- **CRON_SECRET** protection for job endpoints
- **CSP headers** for iframe security
- **Cookie security** with `sameSite: 'none'`, `secure: true`

## Performance

- **Polite Crawling** - 50ms delays between requests
- **Concurrent Workers** - 4 parallel crawlers maximum
- **Page Limits** - 1,500 pages per scan
- **Depth Limits** - Maximum 3 levels deep
- **Retry Logic** - Exponential backoff for failed jobs

## Monitoring

### Job Status
```bash
# Check job queue
curl https://your-app.vercel.app/api/debug/db?key=your_debug_key
```

### Scan Progress
```bash
# Real-time scan status
curl https://your-app.vercel.app/api/scans/status?shop=shop.myshopify.com
```

## Support & Documentation

- **Setup Guide**: https://help.redirectwatch.com/setup
- **API Reference**: https://help.redirectwatch.com/api
- **Troubleshooting**: https://help.redirectwatch.com/troubleshooting

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

**Redirect Watch** - Turn your 404s into revenue opportunities! 💰