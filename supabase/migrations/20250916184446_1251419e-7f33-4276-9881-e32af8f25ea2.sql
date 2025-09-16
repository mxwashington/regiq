-- ================================================
-- FIX SECURITY WARNINGS - Update Functions with Secure Search Paths
-- ================================================

-- Fix function search paths to prevent SQL injection attacks
CREATE OR REPLACE FUNCTION check_profiles_security()
RETURNS void 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  policy_count integer;
BEGIN
  -- Count how many SELECT policies exist that don't check user_id
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'SELECT'
  AND (qual IS NULL OR qual NOT LIKE '%user_id%');
  
  IF policy_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % potentially insecure SELECT policies on profiles table', policy_count;
    RAISE NOTICE 'Manual review required - check for policies that allow cross-user data access';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION secure_payment_logs()
RETURNS void 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure RLS is enabled
  ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
  
  -- Add extra protection policy if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'payment_logs' 
    AND policyname = 'payment_logs_financial_isolation'
  ) THEN
    EXECUTE 'CREATE POLICY "payment_logs_financial_isolation" ON payment_logs FOR ALL USING (user_id = auth.uid())';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION secure_api_keys()
RETURNS void 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Enable RLS
  ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
  
  -- Add rate limiting awareness to RLS
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'api_keys' 
    AND policyname = 'api_keys_enhanced_security'
  ) THEN
    -- Policy that includes usage tracking for security
    EXECUTE 'CREATE POLICY "api_keys_enhanced_security" ON api_keys FOR ALL USING (user_id = auth.uid() AND (rate_limit_per_hour > 0 OR usage_count >= 0))';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION audit_email_exposure()
RETURNS TABLE(
  table_name text,
  policy_name text,
  has_email_column boolean,
  security_status text,
  recommendation text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::text,
    COALESCE(p.policyname, 'NO RLS POLICY')::text as policy_name,
    EXISTS(
      SELECT 1 FROM information_schema.columns c 
      WHERE c.table_name = t.table_name 
      AND c.column_name ILIKE '%email%'
    ) as has_email_column,
    CASE 
      WHEN p.policyname IS NULL THEN 'VULNERABLE - No RLS'
      WHEN p.qual LIKE '%user_id = auth.uid()%' THEN 'SECURE'
      WHEN p.qual IS NULL THEN 'VULNERABLE - No restrictions'
      ELSE 'NEEDS REVIEW'
    END::text as security_status,
    CASE 
      WHEN p.policyname IS NULL AND EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name ILIKE '%email%') 
        THEN 'URGENT: Enable RLS on table with email data'
      WHEN p.qual IS NULL AND EXISTS(SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.column_name ILIKE '%email%')
        THEN 'URGENT: Add user_id restriction to email-containing table'
      ELSE 'Review policy restrictions'
    END::text as recommendation
  FROM information_schema.tables t
  LEFT JOIN pg_policies p ON p.tablename = t.table_name AND p.schemaname = 'public'
  WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND EXISTS(
    SELECT 1 FROM information_schema.columns c 
    WHERE c.table_name = t.table_name 
    AND (c.column_name ILIKE '%email%' OR c.column_name ILIKE '%user_id%')
  )
  ORDER BY security_status, t.table_name;
END;
$$;

CREATE OR REPLACE FUNCTION secure_security_events()
RETURNS void 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
  
  -- Users can only see their own security events
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'security_events' 
    AND policyname = 'security_events_user_isolation'
  ) THEN
    EXECUTE 'CREATE POLICY "security_events_user_isolation" ON security_events FOR SELECT USING (user_id = auth.uid())';
  END IF;
  
  -- Prevent users from modifying security events (audit integrity)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'security_events' 
    AND policyname = 'security_events_no_user_modifications'
  ) THEN
    EXECUTE 'CREATE POLICY "security_events_no_user_modifications" ON security_events FOR INSERT WITH CHECK (false)';
    EXECUTE 'CREATE POLICY "security_events_no_user_updates" ON security_events FOR UPDATE USING (false)';
    EXECUTE 'CREATE POLICY "security_events_no_user_deletes" ON security_events FOR DELETE USING (false)';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION secure_admin_activities()
RETURNS void 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  ALTER TABLE admin_activities ENABLE ROW LEVEL SECURITY;
  
  -- Only admins can see admin activities
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'admin_activities' 
    AND policyname = 'admin_activities_admin_only'
  ) THEN
    EXECUTE 'CREATE POLICY "admin_activities_admin_only" ON admin_activities FOR ALL USING (
      EXISTS(
        SELECT 1 FROM profiles 
        WHERE profiles.user_id = auth.uid() 
        AND profiles.is_admin = true
      )
    )';
  END IF;
END;
$$;