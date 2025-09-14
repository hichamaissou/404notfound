-- Migration script to update schema to UUID
-- This should be run manually on Supabase

-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (WARNING: This will delete all data)
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS imports CASCADE;
DROP TABLE IF EXISTS redirect_rules CASCADE;
DROP TABLE IF EXISTS redirects CASCADE;
DROP TABLE IF EXISTS link_audits CASCADE;
DROP TABLE IF EXISTS scans CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS broken_urls CASCADE;
DROP TABLE IF EXISTS shops CASCADE;

-- Recreate shops table with UUID
CREATE TABLE shops (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_domain TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    scope TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX shops_shop_domain_idx ON shops(shop_domain);

-- Recreate other tables with UUID references
CREATE TABLE broken_urls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    hits INTEGER DEFAULT 1 NOT NULL,
    first_seen TIMESTAMP DEFAULT NOW() NOT NULL,
    last_seen TIMESTAMP DEFAULT NOW() NOT NULL,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    suggested_redirect TEXT,
    response_code INTEGER,
    referrer TEXT,
    user_agent TEXT
);

CREATE INDEX broken_urls_shop_id_idx ON broken_urls(shop_id);
CREATE INDEX broken_urls_path_idx ON broken_urls(path);
CREATE INDEX broken_urls_is_resolved_idx ON broken_urls(is_resolved);

CREATE TABLE settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE UNIQUE,
    digest_email BOOLEAN DEFAULT true,
    conversion_rate NUMERIC(5,4) DEFAULT 0.02,
    average_order_value NUMERIC(10,2) DEFAULT 60.00,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX settings_shop_id_idx ON settings(shop_id);

CREATE TABLE subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    price_amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    trial_ends_at TIMESTAMP,
    current_period_end TIMESTAMP,
    shopify_subscription_id TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX subscriptions_shop_id_idx ON subscriptions(shop_id);
CREATE INDEX subscriptions_status_idx ON subscriptions(status);

CREATE TABLE redirects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    from_path TEXT NOT NULL,
    to_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX redirects_shop_id_idx ON redirects(shop_id);
CREATE INDEX redirects_from_path_idx ON redirects(from_path);

CREATE TABLE redirect_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pattern TEXT NOT NULL,
    replacement TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX redirect_rules_shop_id_idx ON redirect_rules(shop_id);
CREATE INDEX redirect_rules_is_active_idx ON redirect_rules(is_active);

CREATE TABLE scans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP,
    total_urls INTEGER DEFAULT 0,
    scanned_urls INTEGER DEFAULT 0,
    broken_urls_found INTEGER DEFAULT 0,
    error_message TEXT
);

CREATE INDEX scans_shop_id_idx ON scans(shop_id);
CREATE INDEX scans_status_idx ON scans(status);

CREATE TABLE link_audits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    status_code INTEGER,
    response_time INTEGER,
    is_broken BOOLEAN DEFAULT false,
    redirect_chain JSONB,
    canonical_issues JSONB,
    last_checked TIMESTAMP DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX link_audits_shop_id_idx ON link_audits(shop_id);
CREATE INDEX link_audits_is_broken_idx ON link_audits(is_broken);

CREATE TABLE imports (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    success_rows INTEGER DEFAULT 0,
    error_rows INTEGER DEFAULT 0,
    errors JSONB,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX imports_shop_id_idx ON imports(shop_id);
CREATE INDEX imports_status_idx ON imports(status);

CREATE TABLE alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX alerts_shop_id_idx ON alerts(shop_id);
CREATE INDEX alerts_is_read_idx ON alerts(is_read);
