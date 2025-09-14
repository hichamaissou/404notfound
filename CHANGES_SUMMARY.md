# Refactor Changes Summary

This document outlines all the structural changes made during the refactor to help maintainers and LLMs understand the new organization.

## New Folder Structure

### Core Infrastructure
- `src/config/env.ts` - Environment configuration with zod validation
- `src/core/errors.ts` - Application error classes and HTTP mapping
- `src/core/logger.ts` - Structured logging utilities
- `src/core/api/handler.ts` - Unified API handler wrapper

### Modules (Domain Logic)
- `src/modules/db/` - Database client and repositories
  - `client.ts` - Drizzle client configuration
  - `repo/shops.repo.ts` - Shop data operations
  - `repo/scans.repo.ts` - Scan data operations
  - `repo/jobs.repo.ts` - Background job operations
  - `repo/redirects.repo.ts` - Redirect CRUD operations
- `src/modules/auth/` - Authentication and OAuth
  - `oauth.ts` - Shopify OAuth flow
  - `cookies.ts` - Secure cookie management
- `src/modules/shopify/` - Shopify API integration
  - `admin.ts` - GraphQL Admin API client
  - `types.ts` - Shopify type definitions
- `src/modules/crawler/` - Web crawling functionality
  - `index.ts` - Main crawler implementation
  - `normalize.ts` - URL normalization utilities
- `src/modules/jobs/` - Background job system
  - `runner.ts` - Job execution engine
  - `types.ts` - Job payload definitions

### UI Layer
- `src/ui/components/` - Reusable UI components
  - `kpi-card.tsx` - KPI display component
  - `chart-card.tsx` - Chart.js wrapper component
  - `banner-error.tsx` - Error display component
- `src/ui/hooks/` - Custom React hooks
  - `useShop.ts` - Shop context management
  - `useFetchJson.ts` - Type-safe API requests

## Moved/Renamed Files

### Database Layer
- `src/lib/db/schema.ts` → `src/modules/db/schema.ts` (unchanged)
- `src/lib/db/index.ts` → `src/modules/db/client.ts` (refactored)

### Authentication
- `src/lib/auth/oauth.ts` → `src/modules/auth/oauth.ts` (refactored)
- Added: `src/modules/auth/cookies.ts` (new)

### Shopify Integration
- `src/lib/shopify/admin-graphql.ts` → `src/modules/shopify/admin.ts` (refactored)
- Added: `src/modules/shopify/types.ts` (new)

### Crawler & Jobs
- `src/lib/crawler/index.ts` → `src/modules/crawler/index.ts` (refactored)
- `src/lib/jobs/runner.ts` → `src/modules/jobs/runner.ts` (refactored)
- Added: `src/modules/crawler/normalize.ts` (new)
- Added: `src/modules/jobs/types.ts` (new)

### UI Components
- `src/components/Navigation.tsx` → Kept in place (page-specific)
- Added: `src/ui/components/` (new reusable components)
- Added: `src/ui/hooks/` (new custom hooks)

## Compatibility Layer

To maintain backward compatibility, the old `src/lib/` structure still exists but now re-exports from the new modules:

- `src/lib/db/index.ts` → Re-exports `src/modules/db/`
- `src/lib/auth/oauth.ts` → Re-exports `src/modules/auth/oauth.ts`

This ensures existing imports continue to work during the transition.

## Configuration Changes

### TypeScript
- Added strict type checking options
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitOverride: true`

### Package.json Scripts
- Added `typecheck` - TypeScript validation
- Added `lint` - ESLint with strict rules
- Added `format` - Prettier code formatting
- Added `build:ci` - Complete validation pipeline

### New Dependencies
- `@typescript-eslint/eslint-plugin` - TypeScript linting
- `eslint-plugin-simple-import-sort` - Import organization
- `eslint-plugin-unused-imports` - Dead code elimination
- `prettier` - Code formatting

## API Route Changes

### Unified Handler Pattern
All API routes now use the `withJson()` wrapper from `src/core/api/handler.ts`:

- Consistent error handling
- Request ID generation
- Structured logging
- Type-safe responses

### Example Migration
```typescript
// Before
export async function GET(request: NextRequest) {
  try {
    // logic
    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 })
  }
}

// After
export default withJson({
  GET: async (request) => {
    // logic (errors automatically handled)
    return data
  }
})
```

## Breaking Changes

### None for External APIs
- All public API routes maintain the same URLs
- Response formats remain identical
- OAuth flow unchanged
- App Proxy endpoints unchanged

### Internal Changes Only
- Import paths for internal modules
- Function signatures in some utilities
- Error handling patterns in services

## Migration Guide for Contributors

### Adding a New Feature
1. Create a new module in `src/modules/[feature]/`
2. Add repository in `src/modules/db/repo/[feature].repo.ts`
3. Add service in `src/modules/[feature]/service.ts`
4. Add API route using `withJson()` wrapper
5. Add UI components in `src/ui/components/`
6. Update module index files for exports

### Working with Existing Code
- Use the new import paths: `from '../../modules/db'`
- Follow the repository → service → API pattern
- Add JSDoc comments to all exported functions
- Use zod schemas for input validation
- Throw `AppError` subclasses for business errors

### Development Workflow
1. `npm run typecheck` - Validate TypeScript
2. `npm run lint` - Check code quality
3. `npm run format` - Apply consistent formatting
4. `npm run build` - Full build validation
