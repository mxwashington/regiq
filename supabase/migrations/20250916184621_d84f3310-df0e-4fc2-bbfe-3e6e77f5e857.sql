-- ================================================
-- FIX SECURITY DEFINER VIEWS - Remove Elevated Privileges
-- ================================================

-- Drop and recreate views without security definer to prevent privilege escalation
DROP VIEW IF EXISTS payment_security_audit;
DROP VIEW IF EXISTS regiq_security_status;
DROP VIEW IF EXISTS security_monitoring;

-- Recreate payment security audit view (non-privileged)
CREATE VIEW payment_security_audit AS
SELECT 
  tablename,
  policyname,
  permissive,
  cmd,
  CASE 
    WHEN qual LIKE '%user_id = auth.uid()%' THEN 'SECURE ✓'
    WHEN qual IS NULL THEN 'VULNERABLE - No restrictions ❌'
    WHEN qual LIKE '%admin%' OR qual LIKE '%service_role%' THEN 'ADMIN ACCESS - Review needed ⚠️'
    ELSE 'CUSTOM - Manual review needed ⚠️'
  END as security_status,
  qual as policy_condition
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('payment_logs', 'user_entitlements', 'subscribers')
ORDER BY tablename, security_status;

-- Enable RLS on the view (if needed)
ALTER VIEW payment_security_audit SET (security_invoker = true);

-- Recreate security status view (non-privileged)
CREATE VIEW regiq_security_status AS
WITH critical_tables AS (
  SELECT unnest(ARRAY[
    'profiles', 'payment_logs', 'api_keys', 'subscribers', 
    'user_preferences', 'alert_preferences', 'security_events',
    'admin_activities', 'user_entitlements'
  ]) as table_name
),
table_security AS (
  SELECT 
    ct.table_name,
    pg_tables.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count,
    bool_or(p.qual LIKE '%user_id = auth.uid()%') as has_user_isolation,
    bool_or(p.qual IS NULL) as has_unrestricted_policy,
    CASE 
      WHEN NOT pg_tables.rowsecurity THEN 'CRITICAL - RLS DISABLED ❌'
      WHEN bool_or(p.qual IS NULL) THEN 'HIGH RISK - Unrestricted access ❌'
      WHEN NOT bool_or(p.qual LIKE '%user_id = auth.uid()%') THEN 'MEDIUM RISK - No user isolation ⚠️'
      WHEN COUNT(p.policyname) = 0 THEN 'HIGH RISK - No policies ❌'
      ELSE 'SECURE ✓'
    END as security_level
  FROM critical_tables ct
  LEFT JOIN pg_tables ON pg_tables.tablename = ct.table_name AND pg_tables.schemaname = 'public'
  LEFT JOIN pg_policies p ON p.tablename = ct.table_name AND p.schemaname = 'public'
  GROUP BY ct.table_name, pg_tables.rowsecurity
)
SELECT 
  table_name,
  rls_enabled,
  policy_count,
  has_user_isolation,
  has_unrestricted_policy,
  security_level
FROM table_security
ORDER BY 
  CASE security_level
    WHEN 'CRITICAL - RLS DISABLED ❌' THEN 1
    WHEN 'HIGH RISK - Unrestricted access ❌' THEN 2
    WHEN 'HIGH RISK - No policies ❌' THEN 3
    WHEN 'MEDIUM RISK - No user isolation ⚠️' THEN 4
    ELSE 5
  END,
  table_name;

-- Enable security invoker on the view
ALTER VIEW regiq_security_status SET (security_invoker = true);

-- Recreate monitoring view (non-privileged) - simplified to avoid function calls
CREATE VIEW security_monitoring AS
SELECT 
  'RLS_STATUS' as check_type,
  table_name,
  CASE WHEN rls_enabled THEN 'PASS' ELSE 'FAIL' END as status,
  security_level as details
FROM regiq_security_status;

-- Enable security invoker on the monitoring view
ALTER VIEW security_monitoring SET (security_invoker = true);

-- ================================================
-- EXECUTE SECURITY FUNCTIONS TO APPLY FIXES
-- ================================================

-- Execute all security functions to apply the actual security fixes
SELECT check_profiles_security();
SELECT secure_payment_logs();
SELECT secure_api_keys();
SELECT secure_security_events();
SELECT secure_admin_activities();