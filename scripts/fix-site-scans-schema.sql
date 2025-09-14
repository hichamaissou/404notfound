-- Fix site_scans table schema to use default UUID generation
-- This script fixes the issue where site_scans.id was not using defaultRandom()

-- First, check if the table exists and has the wrong schema
DO $$
BEGIN
    -- Check if site_scans table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_scans') THEN
        -- Check if the id column doesn't have a default
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'site_scans' 
            AND column_name = 'id' 
            AND column_default IS NOT NULL
        ) THEN
            -- Add default to the id column
            ALTER TABLE site_scans ALTER COLUMN id SET DEFAULT gen_random_uuid();
            
            RAISE NOTICE 'Fixed site_scans.id column to use gen_random_uuid() default';
        ELSE
            RAISE NOTICE 'site_scans.id already has a default value';
        END IF;
    ELSE
        RAISE NOTICE 'site_scans table does not exist yet';
    END IF;
END $$;

-- Verify the fix
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'site_scans' 
AND column_name = 'id';
