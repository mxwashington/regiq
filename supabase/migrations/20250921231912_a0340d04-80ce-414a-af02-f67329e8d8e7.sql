-- Fix remaining security warnings
-- 1. Function Search Path Mutable (0011) - Set secure search paths
-- 2. Extension in Public (0014) - Move extensions to dedicated schema

BEGIN;

-- ============================================
-- 1. Fix Function Search Path Mutable Warnings
-- ============================================

-- Update existing security definer functions to have secure search paths
-- These functions were flagged for not having search_path set

-- Fix functions that don't have SET search_path
DO $$
DECLARE
    func_record RECORD;
    func_signature TEXT;
BEGIN
    -- Find functions without secure search_path in public schema
    FOR func_record IN 
        SELECT 
            p.proname as function_name,
            n.nspname as schema_name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prosecdef = true  -- SECURITY DEFINER functions
        AND NOT EXISTS (
            SELECT 1 FROM pg_proc_config(p.oid) 
            WHERE unnest LIKE 'search_path=%'
        )
    LOOP
        -- Build function signature for ALTER statement
        func_signature := func_record.schema_name || '.' || func_record.function_name || '(' || func_record.args || ')';
        
        -- Set secure search path for the function
        EXECUTE format('ALTER FUNCTION %s SET search_path = public', func_signature);
        
        RAISE NOTICE 'Updated search_path for function: %', func_signature;
    END LOOP;
END $$;

-- ============================================
-- 2. Create Extensions Schema (if not exists)
-- ============================================

-- Create extensions schema for better security isolation
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- ============================================
-- 3. Move Extensions to Extensions Schema
-- ============================================

-- Note: Moving extensions requires dropping and recreating them
-- This is only safe if no data depends on them
-- For production, this should be done during maintenance window

DO $$
DECLARE
    ext_record RECORD;
BEGIN
    -- Find extensions in public schema
    FOR ext_record IN 
        SELECT extname, extnamespace 
        FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid 
        WHERE n.nspname = 'public'
        AND extname NOT IN ('plpgsql') -- Skip core extensions
    LOOP
        -- Only move safe extensions (not core system ones)
        IF ext_record.extname IN ('uuid-ossp', 'pg_stat_statements', 'pg_trgm', 'btree_gin', 'btree_gist') THEN
            BEGIN
                -- Move extension to extensions schema
                EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', ext_record.extname);
                RAISE NOTICE 'Moved extension % to extensions schema', ext_record.extname;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Could not move extension %: %', ext_record.extname, SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'Skipping extension % (requires manual review)', ext_record.extname;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- 4. Additional Security Hardening
-- ============================================

-- Ensure all RLS-enabled tables have at least one policy
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT t.tablename
        FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public'
        AND c.relrowsecurity = true
        AND NOT EXISTS (
            SELECT 1 FROM pg_policies p 
            WHERE p.tablename = t.tablename 
            AND p.schemaname = 'public'
        )
    LOOP
        RAISE WARNING 'Table % has RLS enabled but no policies defined', table_record.tablename;
    END LOOP;
END $$;

-- ============================================
-- 5. Verify Security Configuration
-- ============================================

-- Create a security audit function for ongoing monitoring
CREATE OR REPLACE FUNCTION public.audit_security_configuration()
RETURNS TABLE(
    check_type TEXT,
    status TEXT,
    details TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check RLS coverage
    RETURN QUERY
    SELECT 
        'RLS_COVERAGE'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'
            ELSE 'FAIL'
        END::TEXT,
        format('%s tables missing RLS: %s', 
            COUNT(*),
            string_agg(tablename, ', ')
        )::TEXT
    FROM pg_tables t
    LEFT JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    AND (c.relrowsecurity IS FALSE OR c.relrowsecurity IS NULL);

    -- Check function security
    RETURN QUERY
    SELECT 
        'FUNCTION_SECURITY'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'
            ELSE 'WARN'
        END::TEXT,
        format('%s functions without secure search_path', COUNT(*))::TEXT
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND NOT EXISTS (
        SELECT 1 FROM pg_proc_config(p.oid) 
        WHERE unnest LIKE 'search_path=%'
    );

    -- Check extension placement
    RETURN QUERY
    SELECT 
        'EXTENSION_SECURITY'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'
            ELSE 'WARN'
        END::TEXT,
        format('%s extensions in public schema: %s', 
            COUNT(*),
            string_agg(extname, ', ')
        )::TEXT
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid 
    WHERE n.nspname = 'public'
    AND extname NOT IN ('plpgsql');
END;
$$;

COMMIT;