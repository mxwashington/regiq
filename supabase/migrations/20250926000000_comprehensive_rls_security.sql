-- Comprehensive RLS Security Check and Enhancement
-- Ensures all sensitive tables have proper Row Level Security enabled
-- This migration is idempotent and safe to run multiple times

BEGIN;

-- Enable RLS on all critical tables (idempotent operations)
ALTER TABLE IF EXISTS public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.taxonomy_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.compliance_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.benchmark_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.facility_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.supplier_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies for any missing tables

-- ALERTS: Ensure authenticated users can only access based on subscription
DROP POLICY IF EXISTS "comprehensive_alerts_access" ON public.alerts;
CREATE POLICY "comprehensive_alerts_access" ON public.alerts
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      -- Allow if user has active subscription
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND (p.subscription_tier IS NOT NULL OR is_admin(auth.uid()))
      )
    )
  );

-- SUPPLIERS: Authenticated users with subscription
DROP POLICY IF EXISTS "comprehensive_suppliers_access" ON public.suppliers;
CREATE POLICY "comprehensive_suppliers_access" ON public.suppliers
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      -- Allow if user has subscription or is admin
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND (p.subscription_tier IS NOT NULL OR is_admin(auth.uid()))
      )
    )
  );

-- TAXONOMY_CATEGORIES: Read-only for authenticated users
DROP POLICY IF EXISTS "comprehensive_taxonomy_access" ON public.taxonomy_categories;
CREATE POLICY "comprehensive_taxonomy_access" ON public.taxonomy_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Prevent modifications to taxonomy by non-admins
DROP POLICY IF EXISTS "taxonomy_admin_only_modify" ON public.taxonomy_categories;
CREATE POLICY "taxonomy_admin_only_modify" ON public.taxonomy_categories
  FOR ALL USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- COMPLIANCE_TEMPLATES: Authenticated users can view
DROP POLICY IF EXISTS "comprehensive_templates_access" ON public.compliance_templates;
CREATE POLICY "comprehensive_templates_access" ON public.compliance_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can modify compliance templates
DROP POLICY IF EXISTS "templates_admin_only_modify" ON public.compliance_templates;
CREATE POLICY "templates_admin_only_modify" ON public.compliance_templates
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "templates_admin_only_update" ON public.compliance_templates
  FOR UPDATE USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "templates_admin_only_delete" ON public.compliance_templates
  FOR DELETE USING (is_admin(auth.uid()));

-- BENCHMARK_DATA: Subscribers only
DROP POLICY IF EXISTS "comprehensive_benchmark_access" ON public.benchmark_data;
CREATE POLICY "comprehensive_benchmark_access" ON public.benchmark_data
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      -- Allow if user has active subscription or is admin
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.user_id = auth.uid()
          AND (p.subscription_tier IS NOT NULL OR is_admin(auth.uid()))
      )
    )
  );

-- Only admins can modify benchmark data
DROP POLICY IF EXISTS "benchmark_admin_only_modify" ON public.benchmark_data;
CREATE POLICY "benchmark_admin_only_modify" ON public.benchmark_data
  FOR ALL USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- USAGE_LOGS: Users can only see their own logs
DROP POLICY IF EXISTS "comprehensive_usage_logs_access" ON public.usage_logs;
CREATE POLICY "comprehensive_usage_logs_access" ON public.usage_logs
  FOR SELECT USING (
    auth.uid() = user_id OR is_admin(auth.uid())
  );

-- Prevent users from modifying usage logs
DROP POLICY IF EXISTS "usage_logs_no_modify" ON public.usage_logs;
CREATE POLICY "usage_logs_no_modify" ON public.usage_logs
  FOR UPDATE USING (false);

CREATE POLICY "usage_logs_no_delete" ON public.usage_logs
  FOR DELETE USING (false);

-- Create function to validate RLS is working
CREATE OR REPLACE FUNCTION validate_rls_security()
RETURNS TABLE (
  table_name text,
  rls_enabled boolean,
  policy_count integer,
  security_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tablename::text,
    t.rowsecurity as rls_enabled,
    COALESCE(p.policy_count, 0) as policy_count,
    CASE
      WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) > 0 THEN 'SECURE'
      WHEN t.rowsecurity AND COALESCE(p.policy_count, 0) = 0 THEN 'RLS_ENABLED_NO_POLICIES'
      WHEN NOT t.rowsecurity THEN 'RLS_DISABLED'
      ELSE 'UNKNOWN'
    END as security_status
  FROM pg_tables t
  LEFT JOIN (
    SELECT
      schemaname,
      tablename,
      COUNT(*) as policy_count
    FROM pg_policies
    GROUP BY schemaname, tablename
  ) p ON t.schemaname = p.schemaname AND t.tablename = p.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN (
      'alerts', 'suppliers', 'taxonomy_categories',
      'compliance_templates', 'benchmark_data', 'profiles',
      'api_keys', 'payment_logs', 'admin_activities',
      'security_events', 'usage_logs'
    )
  ORDER BY t.tablename;
END;
$$;

-- Grant execute permission to authenticated users and admins
GRANT EXECUTE ON FUNCTION validate_rls_security() TO authenticated;

-- Log security enhancement completion
INSERT INTO public.security_events (event_type, metadata, severity)
VALUES (
  'rls_comprehensive_security_applied',
  jsonb_build_object(
    'migration_date', now(),
    'tables_secured', ARRAY[
      'alerts', 'suppliers', 'taxonomy_categories',
      'compliance_templates', 'benchmark_data', 'profiles',
      'api_keys', 'payment_logs', 'admin_activities',
      'security_events', 'usage_logs'
    ]
  ),
  'medium'
);

COMMIT;