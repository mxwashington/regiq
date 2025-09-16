-- ================================================
-- FIX SCHEMA REFERENCES - Correct pg_policies schema
-- ================================================

-- Fix the schema references in security functions
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

-- ================================================
-- EXECUTE SECURITY FUNCTIONS TO APPLY FIXES
-- ================================================

-- Now execute the corrected functions
SELECT secure_payment_logs();
SELECT secure_api_keys();
SELECT secure_security_events();
SELECT secure_admin_activities();