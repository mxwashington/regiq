-- RegIQ Critical Security Fixes - Properly Secured
-- Run this in a single transaction to ensure atomicity

BEGIN;

-- ============================================
-- 1. SEARCH CACHE - Proper user isolation
-- ============================================
ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "search_cache_public_access" ON search_cache;
DROP POLICY IF EXISTS "System can manage search cache" ON search_cache;
DROP POLICY IF EXISTS "Admins can view search cache" ON search_cache;
DROP POLICY IF EXISTS "search_cache_system_only" ON search_cache;

-- Add user_id column if it doesn't exist
ALTER TABLE search_cache ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Users can only see their own cache entries
CREATE POLICY "search_cache_user_isolation" ON search_cache
FOR ALL
USING (auth.uid() = user_id OR user_id IS NULL)
WITH CHECK (auth.uid() = user_id);

-- Service role bypass for system operations (cron jobs, etc)
-- Note: Service role automatically bypasses RLS in Supabase

-- ============================================
-- 2. SYSTEM SETTINGS - Security admins only
-- ============================================
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Edge functions can manage system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins only can manage system settings" ON system_settings;

-- Only security admins can access system settings
CREATE POLICY "system_settings_security_admins_only" ON system_settings
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  has_admin_permission(auth.uid(), 'security_admin')
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_admin_permission(auth.uid(), 'security_admin')
);

-- ============================================
-- 3. ALERTS - Subscription-based access
-- ============================================
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alerts_public_access" ON alerts;
DROP POLICY IF EXISTS "alerts_authenticated_with_valid_subscription" ON alerts;

-- Active subscribers and admins can view alerts
CREATE POLICY "alerts_active_subscribers" ON alerts
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Admin access
    is_admin(auth.uid()) OR
    -- Active subscription (not trial)
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.subscription_status = 'active'
    ) OR
    -- Trial users get limited access (last 7 days only)
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.trial_ends_at > now()
      AND alerts.created_at > now() - interval '7 days'
    )
  )
);

-- ============================================
-- 4. PLAN FEATURES - Authenticated users only
-- ============================================
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Plan features are viewable by all authenticated users" ON plan_features;
DROP POLICY IF EXISTS "plan_features_authenticated_only" ON plan_features;

-- Any logged-in user can see plan features (for pricing page)
CREATE POLICY "plan_features_authenticated_only" ON plan_features
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ============================================
-- 5. DATA SOURCES - Admin access only
-- ============================================
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view data sources" ON data_sources;
DROP POLICY IF EXISTS "Admins can manage data sources" ON data_sources;
DROP POLICY IF EXISTS "data_sources_admin_only" ON data_sources;

-- Only admins can access data sources
CREATE POLICY "data_sources_admin_only" ON data_sources
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  is_admin(auth.uid())
);

-- ============================================
-- 6. SUPPLIERS - Professional tier only
-- ============================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view suppliers with proper authorization" ON suppliers;
DROP POLICY IF EXISTS "Admins can manage suppliers" ON suppliers;
DROP POLICY IF EXISTS "suppliers_enterprise_subscribers_only" ON suppliers;

-- Professional subscribers and admins can view suppliers
CREATE POLICY "suppliers_professional_tier" ON suppliers
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    -- Admin access
    is_admin(auth.uid()) OR
    -- Professional tier subscribers
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.subscription_plan = 'professional'
      AND p.subscription_status = 'active'
    )
  )
);

-- ============================================
-- 7. CUSTOM DATA SOURCES - User isolation
-- ============================================
ALTER TABLE custom_data_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can access custom data sources for processing" ON custom_data_sources;
DROP POLICY IF EXISTS "Users can manage their own custom data sources" ON custom_data_sources;
DROP POLICY IF EXISTS "custom_data_sources_owner_only" ON custom_data_sources;

-- Users can only access their own custom data sources
CREATE POLICY "custom_data_sources_owner_only" ON custom_data_sources
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 8. PERFORMANCE OPTIMIZATION - Create indexes
-- ============================================

-- Index for frequent subscription checks
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_lookup
ON profiles(user_id, subscription_status, subscription_plan)
WHERE subscription_status = 'active';

-- Index for trial checks
CREATE INDEX IF NOT EXISTS idx_profiles_trial_status
ON profiles(user_id, trial_ends_at)
WHERE trial_ends_at > now();

-- ============================================
-- 9. AUDIT - Verify all RLS is enabled
-- ============================================
DO $$
DECLARE
  missing_rls TEXT;
BEGIN
  SELECT string_agg(tablename, ', ') INTO missing_rls
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN (
    'search_cache', 'system_settings', 'alerts',
    'plan_features', 'data_sources', 'suppliers',
    'custom_data_sources'
  )
  AND tablename NOT IN (
    SELECT tablename
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    WHERE t.schemaname = 'public'
    AND c.relrowsecurity = true
  );

  IF missing_rls IS NOT NULL THEN
    RAISE WARNING 'Tables still missing RLS: %', missing_rls;
  END IF;
END $$;

COMMIT;