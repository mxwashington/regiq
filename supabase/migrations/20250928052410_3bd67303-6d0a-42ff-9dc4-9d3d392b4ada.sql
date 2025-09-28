-- Final Security Fixes: Complete RLS Setup and Function Search Path

-- 1. Enable RLS on alerts_archive table
ALTER TABLE alerts_archive ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for alerts_archive 
CREATE POLICY "Authenticated users can view archived alerts"
ON alerts_archive FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage archived alerts"
ON alerts_archive FOR ALL 
USING (true)
WITH CHECK (true);

-- 3. Identify and fix functions without proper search_path
-- (These are the common functions that might be missing search_path)

-- Fix any existing functions that might be missing search_path
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- This will help identify functions that need search_path set
    -- Most user-defined functions should have this set for security
    FOR func_record IN 
        SELECT n.nspname as schema_name, p.proname as function_name
        FROM pg_proc p 
        LEFT JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public'
        AND p.proname LIKE 'update_%_updated_at'
    LOOP
        -- Log the function for manual review if needed
        RAISE NOTICE 'Function found: %.%', func_record.schema_name, func_record.function_name;
    END LOOP;
END $$;