-- Fix settings table to match Drizzle schema
-- This script updates the settings table to have the correct columns

-- Drop and recreate settings table
DROP TABLE IF EXISTS settings CASCADE;

CREATE TABLE settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    ignore_rules JSONB,
    locales JSONB,
    auto_refresh BOOLEAN NOT NULL,
    digest_email BOOLEAN NOT NULL,
    digest_frequency TEXT NOT NULL,
    conversion_rate NUMERIC(5,4) DEFAULT 0.02,
    average_order_value NUMERIC(10,2) DEFAULT 60.00,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE(shop_id)
);

-- Create index
CREATE INDEX settings_shop_id_idx ON settings(shop_id);

-- Success message
SELECT 'Settings table fixed successfully!' as result;
