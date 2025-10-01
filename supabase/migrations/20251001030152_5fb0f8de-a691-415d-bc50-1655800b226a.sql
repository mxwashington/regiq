-- Fix data_freshness table to accept string source names
-- Step 1: Drop foreign key if exists
ALTER TABLE public.data_freshness 
DROP CONSTRAINT IF EXISTS fk_data_freshness_source;

-- Step 2: Ensure column is text type
ALTER TABLE public.data_freshness 
ALTER COLUMN source_name TYPE text;

-- Step 3: Clean up any invalid source names (replace special chars with underscores)
UPDATE public.data_freshness
SET source_name = regexp_replace(source_name, '[^A-Za-z0-9_-]', '_', 'g')
WHERE source_name !~ '^[A-Za-z0-9_-]+$';

-- Step 4: Add performance index
CREATE INDEX IF NOT EXISTS idx_data_freshness_source_name 
ON public.data_freshness(source_name);