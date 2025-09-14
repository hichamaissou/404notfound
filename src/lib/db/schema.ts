// src/lib/db/schema.ts
import {
  pgTable, uuid, text, timestamp, integer, boolean, jsonb, numeric, index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/* =========================
   CORE TABLES (alignées Supabase)
   ========================= */

/** shops */
export const shops = pgTable('shops', {
  id: uuid('id').primaryKey(),
  shopDomain: text('shop_domain').notNull().unique(),
  accessToken: text('access_token').notNull(),
  scope: text('scope').notNull(),
  isActive: boolean('is_active').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
}, (t) => ({
  shopDomainIdx: index('shops_shop_domain_idx').on(t.shopDomain),
}));

/** broken_urls */
export const brokenUrls = pgTable('broken_urls', {
  id: uuid('id').defaultRandom().primaryKey(),
  shopId: uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  hits: integer('hits').default(1).notNull(),
  firstSeen: timestamp('first_seen').defaultNow().notNull(),
  lastSeen: timestamp('last_seen').defaultNow().notNull(),
  suggestions: jsonb('suggestions'),
  isResolved: boolean('is_resolved').default(false),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  shopIdx: index('broken_urls_shop_id_idx').on(t.shopId),
  pathIdx: index('broken_urls_path_idx').on(t.path),
}));

/** redirects */
export const redirects = pgTable('redirects', {
  id: uuid('id').defaultRandom().primaryKey(),
  shopId: uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
  fromPath: text('from_path').notNull(),
  toPath: text('to_path').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  shopIdx: index('redirects_shop_id_idx').on(t.shopId),
  fromIdx: index('redirects_from_path_idx').on(t.fromPath),
}));

/** imports */
export const imports = pgTable('imports', {
  id: uuid('id').defaultRandom().primaryKey(),
  shopId: uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  status: text('status').notNull(), // processing/completed/failed
  totalRows: integer('total_rows').default(0),
  processedRows: integer('processed_rows').default(0),
  successRows: integer('success_rows').default(0),
  errorRows: integer('error_rows').default(0),
  errors: jsonb('errors'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  shopIdx: index('imports_shop_id_idx').on(t.shopId),
  statusIdx: index('imports_status_idx').on(t.status),
}));

/** settings */
export const settings = pgTable('settings', {
  id: uuid('id').primaryKey(),
  shopId: uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
  ignoreRules: jsonb('ignore_rules'),
  locales: jsonb('locales'),
  autoRefresh: boolean('auto_refresh').notNull(),
  digestEmail: boolean('digest_email').notNull(),
  digestFrequency: text('digest_frequency').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
}, (t) => ({
  shopIdx: index('settings_shop_id_idx').on(t.shopId),
}));

/** subscriptions */
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  shopId: uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
  planName: text('plan_name').notNull(),
  priceAmount: numeric('price_amount').notNull(),  // numeric(10,2) côté DB
  currency: text('currency').notNull(),
  status: text('status').notNull(),                // pending/active/cancelled/expired
  trialEndsAt: timestamp('trial_ends_at'),
  currentPeriodEnd: timestamp('current_period_end'),
  shopifySubscriptionId: text('shopify_subscription_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => ({
  shopIdx: index('subscriptions_shop_id_idx').on(t.shopId),
  statusIdx: index('subscriptions_status_idx').on(t.status),
}));


/* =========================
   AUDIT & AUTOMATION TABLES
   ========================= */

/** site_scans */
export const siteScans = pgTable('site_scans', {
  id: uuid('id').defaultRandom().primaryKey(),
  shopId: uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
  status: text('status').notNull(),  // queued|running|done|failed
  startedAt: timestamp('started_at').notNull(),
  finishedAt: timestamp('finished_at'),
  seeds: jsonb('seeds'),   // array d'URLs seed
  stats: jsonb('stats'),   // ex: { pages:1234, broken:23, chains:4, loops:1 }
  lastError: text('last_error'),
}, (t) => ({
  shopIdx: index('site_scans_shop_id_idx').on(t.shopId),
  statusIdx: index('site_scans_status_idx').on(t.status),
}));

/** scan_pages */
export const scanPages = pgTable('scan_pages', {
  id: uuid('id').defaultRandom().primaryKey(),
  scanId: uuid('scan_id').notNull().references(() => siteScans.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  statusCode: integer('status_code'),
  ok: boolean('ok').notNull().default(false),
  redirectedTo: text('redirected_to'),
  depth: integer('depth').notNull().default(0),
  contentType: text('content_type'),
  canonical: text('canonical'),
  issues: jsonb('issues'),     // [{type:'broken_link',to:'/x',...}, ...]
  fetchedAt: timestamp('fetched_at').defaultNow().notNull(),
}, (t) => ({
  scanIdx: index('scan_pages_scan_id_idx').on(t.scanId),
  urlIdx: index('scan_pages_url_idx').on(t.url),
  codeIdx: index('scan_pages_status_code_idx').on(t.statusCode),
}));

/** link_issues */
export const linkIssues = pgTable('link_issues', {
  id: uuid('id').defaultRandom().primaryKey(),
  scanId: uuid('scan_id').notNull().references(() => siteScans.id, { onDelete: 'cascade' }),
  fromUrl: text('from_url').notNull(),
  toUrl: text('to_url').notNull(),
  type: text('type').notNull(),      // broken_link|redirect_chain|redirect_loop|canonical_mismatch...
  details: jsonb('details'),
  firstSeen: timestamp('first_seen').defaultNow().notNull(),
  lastSeen: timestamp('last_seen').defaultNow().notNull(),
}, (t) => ({
  scanIdx: index('link_issues_scan_id_idx').on(t.scanId),
  typeIdx: index('link_issues_type_idx').on(t.type),
  toIdx: index('link_issues_to_url_idx').on(t.toUrl),
}));

/** redirect_rules (regex engine) */
export const redirectRules = pgTable('redirect_rules', {
  id: uuid('id').primaryKey(),
  shopId: uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
  pattern: text('pattern').notNull(),       // ex: ^/collections/(.*)-old$
  replacement: text('replacement').notNull(),  // /collections/$1
  flags: text('flags'),                     // i, g, etc.
  enabled: boolean('enabled').notNull(),
  priority: integer('priority').notNull(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
}, (t) => ({
  shopIdx: index('redirect_rules_shop_id_idx').on(t.shopId),
  enabledIdx: index('redirect_rules_enabled_idx').on(t.enabled),
  prioIdx: index('redirect_rules_priority_idx').on(t.priority),
}));

/** jobs (background queue) */
export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull(),       // crawl_page|process_sitemap|email_digest|...
  payload: jsonb('payload').notNull(),
  status: text('status').notNull().default('pending'), // pending|running|completed|failed
  runAfter: timestamp('run_after').notNull().defaultNow(),
  retries: integer('retries').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(3),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('jobs_status_idx').on(t.status),
  runAfterIdx: index('jobs_run_after_idx').on(t.runAfter),
  typeIdx: index('jobs_type_idx').on(t.type),
}));

/** alerts (emails/digests) */
export const alerts = pgTable('alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  shopId: uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),     // new_404s|redirect_chains|weekly_digest|...
  payload: jsonb('payload').notNull(),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
}, (t) => ({
  shopIdx: index('alerts_shop_id_idx').on(t.shopId),
  typeIdx: index('alerts_type_idx').on(t.type),
  sentIdx: index('alerts_sent_at_idx').on(t.sentAt),
}));