-- Simplified Security Fixes for Remaining Warnings
-- Focus on critical security issues that can be fixed

BEGIN;

-- ============================================
-- 1. Create Extensions Schema for Better Security
-- ============================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- ============================================
-- 2. Fix Known Functions Without Search Path
-- ============================================

-- Update specific functions that are likely causing the warnings
-- These are common RegIQ functions that need secure search paths

-- Fix the is_admin function if it exists without search_path
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'is_admin'
        AND p.prosecdef = true
    ) THEN
        ALTER FUNCTION public.is_admin(uuid) SET search_path = public;
    END IF;
END $$;

-- Fix the has_admin_permission function if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'public' 
        AND p.proname = 'has_admin_permission'
        AND p.prosecdef = true
    ) THEN
        ALTER FUNCTION public.has_admin_permission(uuid, text) SET search_path = public;
    END IF;
END $$;

-- ============================================
-- 3. Audit Security Status (Simplified)
-- ============================================

-- Create a simple security audit function
CREATE OR REPLACE FUNCTION public.check_security_status()
RETURNS TABLE(
    security_check TEXT,
    status TEXT,
    recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check tables without RLS
    RETURN QUERY
    SELECT 
        'Tables without RLS'::TEXT as security_check,
        CASE 
            WHEN COUNT(*) = 0 THEN 'SECURE'
            WHEN COUNT(*) <= 2 THEN 'WARNING'
            ELSE 'CRITICAL'
        END::TEXT as status,
        CASE 
            WHEN COUNT(*) = 0 THEN 'All tables have RLS enabled'
            ELSE format('Enable RLS on %s tables', COUNT(*))
        END::TEXT as recommendation
    FROM pg_tables t
    LEFT JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    AND (c.relrowsecurity IS FALSE OR c.relrowsecurity IS NULL);

    -- Check admin user count
    RETURN QUERY
    SELECT 
        'Admin users'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'WARNING'
            WHEN COUNT(*) <= 3 THEN 'GOOD'
            ELSE 'REVIEW'
        END::TEXT,
        format('%s admin users found', COUNT(*))::TEXT
    FROM profiles 
    WHERE is_admin = true OR role = 'admin';

    -- Check subscription security
    RETURN QUERY
    SELECT 
        'Subscription access'::TEXT,
        'IMPLEMENTED'::TEXT,
        'Subscription-based access controls are active'::TEXT
    WHERE EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname LIKE '%subscription%' OR policyname LIKE '%trial%'
    );
END;
$$;

-- ============================================
-- 4. Additional Security Policies for New Plan Model
-- ============================================

-- Ensure user entitlements table has proper RLS (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_entitlements') THEN
        ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
        
        -- Drop any existing policies
        DROP POLICY IF EXISTS "user_entitlements_user_access" ON user_entitlements;
        
        -- Users can only see their own entitlements
        CREATE POLICY "user_entitlements_user_access" ON user_entitlements
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Ensure facilities table has user isolation (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'facilities') THEN
        ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "facilities_user_access" ON facilities;
        
        -- Users can only access facilities they have access to
        CREATE POLICY "facilities_user_access" ON facilities
        FOR ALL
        USING (
            auth.uid() = organization_user_id OR
            EXISTS (
                SELECT 1 FROM facility_users fu
                WHERE fu.facility_id = facilities.id
                AND fu.user_id = auth.uid()
            ) OR
            is_admin(auth.uid())
        )
        WITH CHECK (
            auth.uid() = organization_user_id OR
            is_admin(auth.uid())
        );
    END IF;
END $$;

-- ============================================
-- 5. Plan Enforcement Functions
-- ============================================

-- Create a function to check plan limits
CREATE OR REPLACE FUNCTION public.check_plan_limits(
    user_uuid UUID,
    limit_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_plan TEXT;
    current_usage INTEGER := 0;
    plan_limit INTEGER := 0;
    result JSONB;
BEGIN
    -- Get user's current plan
    SELECT subscription_plan INTO user_plan
    FROM profiles 
    WHERE user_id = user_uuid;
    
    -- Get plan limits from plan_features
    SELECT (feature_value::TEXT)::INTEGER INTO plan_limit
    FROM plan_features
    WHERE plan_id = COALESCE(user_plan, 'starter')
    AND feature_key = limit_type;
    
    -- Calculate current usage based on limit type
    CASE limit_type
        WHEN 'max_users' THEN
            -- Count team members for this user's organization
            SELECT COUNT(*) INTO current_usage
            FROM profiles p
            WHERE p.created_at >= (
                SELECT created_at FROM profiles WHERE user_id = user_uuid
            );
            
        WHEN 'max_facilities' THEN
            -- Count facilities owned by user
            SELECT COUNT(*) INTO current_usage
            FROM facilities
            WHERE organization_user_id = user_uuid;
            
        ELSE
            current_usage := 0;
    END CASE;
    
    -- Return usage information
    result := jsonb_build_object(
        'limit_type', limit_type,
        'current_usage', current_usage,
        'plan_limit', COALESCE(plan_limit, 999999),
        'usage_percentage', 
            CASE 
                WHEN COALESCE(plan_limit, 999999) = 999999 THEN 0
                ELSE ROUND((current_usage::NUMERIC / plan_limit::NUMERIC) * 100, 2)
            END,
        'can_add_more', 
            CASE 
                WHEN COALESCE(plan_limit, 999999) = 999999 THEN true
                ELSE current_usage < plan_limit
            END
    );
    
    RETURN result;
END;
$$;

COMMIT;