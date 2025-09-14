-- Simple migration without uuid-ossp extension
-- This uses PostgreSQL's built-in gen_random_uuid() function

-- Drop existing tables if they exist
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

-- Create shops table with built-in UUID generation
CREATE TABLE shops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_domain TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    scope TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX shops_shop_domain_idx ON shops(shop_domain);

-- Create settings table
CREATE TABLE settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE UNIQUE,
    digest_email BOOLEAN DEFAULT true,
    conversion_rate NUMERIC(5,4) DEFAULT 0.02,
    average_order_value NUMERIC(10,2) DEFAULT 60.00,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX settings_shop_id_idx ON settings(shop_id);

-- Create subscriptions table
CREATE TABLE subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Create other tables as needed
CREATE TABLE broken_urls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Success message
SELECT 'Tables created successfully!' as result;
