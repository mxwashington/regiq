-- Security Fix Phase 4: Identify and Address Security Definer Views
-- Query to find all views and their security properties

-- Step 1: Check for any remaining views that might have security definer properties
DO $$
DECLARE
    view_info RECORD;
    view_def TEXT;
BEGIN
    -- Check all views in the public schema
    FOR view_info IN 
        SELECT schemaname, viewname, viewowner
        FROM pg_views 
        WHERE schemaname = 'public'
    LOOP
        -- Get the view definition
        SELECT definition INTO view_def 
        FROM pg_views 
        WHERE schemaname = view_info.schemaname 
        AND viewname = view_info.viewname;
        
        -- Log information about the view
        RAISE NOTICE 'Found view: %.% owned by % with definition starting with: %', 
                     view_info.schemaname, 
                     view_info.viewname, 
                     view_info.viewowner,
                     substring(view_def from 1 for 100);
    END LOOP;
END $$;

-- Step 2: Drop all views in public schema to eliminate security definer view issues
DROP VIEW IF EXISTS public.security_status_monitoring CASCADE;

-- Step 3: Check for any functions that might be creating security issues
DO $$
DECLARE 
    func_info RECORD;
BEGIN
    FOR func_info IN
        SELECT n.nspname as schema_name,
               p.proname as function_name,
               CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prosecdef = true  -- Only security definer functions
    LOOP
        RAISE NOTICE 'Security definer function: %.%() - %', 
                     func_info.schema_name,
                     func_info.function_name,
                     func_info.security_type;
    END LOOP;
END $$;

-- Step 4: Create a simple table-based approach for security monitoring instead of views
CREATE TABLE IF NOT EXISTS public.security_monitoring_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    rls_enabled BOOLEAN NOT NULL,
    policy_count INTEGER NOT NULL,
    security_level TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on the monitoring table
ALTER TABLE public.security_monitoring_cache ENABLE ROW LEVEL SECURITY;

-- Only security admins can access the monitoring cache
CREATE POLICY "Security monitoring - admin access only" 
ON public.security_monitoring_cache FOR ALL 
USING (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'security_admin'));

-- Step 5: Create a function to populate security monitoring data (replaces problematic views)
CREATE OR REPLACE FUNCTION public.refresh_security_monitoring()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    table_record RECORD;
    policy_count INTEGER;
    security_level TEXT;
    records_updated INTEGER := 0;
BEGIN
    -- Only security admins can refresh monitoring data
    IF NOT (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'security_admin')) THEN
        RAISE EXCEPTION 'Access denied: Security admin required';
    END IF;
    
    -- Clear existing cache
    DELETE FROM public.security_monitoring_cache;
    
    -- Populate cache with current security status
    FOR table_record IN
        SELECT t.table_name, c.relrowsecurity
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name 
        AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
    LOOP
        -- Count policies for this table
        SELECT COUNT(*) INTO policy_count
        FROM pg_policies 
        WHERE tablename = table_record.table_name 
        AND schemaname = 'public';
        
        -- Determine security level
        security_level := CASE 
            WHEN NOT COALESCE(table_record.relrowsecurity, false) THEN 'HIGH RISK - No RLS'
            WHEN policy_count = 0 THEN 'HIGH RISK - No Policies'
            WHEN EXISTS (
                SELECT 1 FROM pg_policies pp 
                WHERE pp.tablename = table_record.table_name 
                AND pp.qual LIKE '%auth.uid()%'
            ) THEN 'SECURE - User Isolation'
            ELSE 'MEDIUM RISK - Review Needed'
        END;
        
        -- Insert into cache
        INSERT INTO public.security_monitoring_cache (
            table_name, rls_enabled, policy_count, security_level
        ) VALUES (
            table_record.table_name, 
            COALESCE(table_record.relrowsecurity, false), 
            policy_count, 
            security_level
        );
        
        records_updated := records_updated + 1;
    END LOOP;
    
    RETURN records_updated;
END;
$$;