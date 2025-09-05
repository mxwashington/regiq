-- Phase 2: API Security Enhancement & Phase 3: Database Hardening

-- Phase 2: Enhanced API Key Security
-- Update API keys table policies for enhanced security
DROP POLICY IF EXISTS "Enterprise users can view their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Enterprise users can update their own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can manage their own API keys" ON public.api_keys;

-- Create comprehensive API key security policy
CREATE POLICY "secure_api_key_access" ON public.api_keys
FOR ALL
USING (
  (user_id = auth.uid()) OR 
  (
    is_admin(auth.uid()) AND 
    has_admin_permission(auth.uid(), 'super_admin') AND
    secure_api_key_access()
  )
)
WITH CHECK (
  (user_id = auth.uid()) OR 
  (
    is_admin(auth.uid()) AND 
    has_admin_permission(auth.uid(), 'super_admin')
  )
);

-- Enhanced rate limiting for API operations
CREATE OR REPLACE FUNCTION check_api_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  api_requests integer;
BEGIN
  -- Check API-specific rate limits (stricter than general limits)
  SELECT COALESCE(SUM(requests_count), 0) INTO api_requests
  FROM public.rate_limits
  WHERE user_id = auth.uid() 
    AND endpoint LIKE 'api_%'
    AND window_start >= now() - interval '1 hour';
    
  -- Allow max 100 API requests per hour for regular users, 500 for enterprise
  IF api_requests >= CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.subscribers 
      WHERE user_id = auth.uid() AND subscription_tier = 'enterprise'
    ) THEN 500
    ELSE 100
  END THEN
    PERFORM log_security_event_enhanced(
      'api_rate_limit_exceeded',
      jsonb_build_object(
        'user_id', auth.uid(),
        'requests_count', api_requests,
        'limit_type', 'api_operations'
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Phase 3: Database Hardening - Move extensions from public schema
-- Check current extensions and move them to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move common extensions to extensions schema
-- Note: This will be handled by the extension migration, but we set up the schema

-- Grant necessary permissions on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA extensions TO anon, authenticated;

-- Set default privileges for future objects in extensions schema
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions GRANT SELECT ON TABLES TO anon, authenticated;

-- Phase 4: Enhanced Security Monitoring
-- Create function to detect suspicious patterns
CREATE OR REPLACE FUNCTION detect_suspicious_access_patterns()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  suspicious_users record;
BEGIN
  -- Detect users with multiple failed login attempts
  FOR suspicious_users IN
    SELECT user_id, COUNT(*) as failed_attempts
    FROM public.security_events 
    WHERE event_type = 'failed_login' 
      AND created_at > now() - interval '1 hour'
    GROUP BY user_id
    HAVING COUNT(*) >= 5
  LOOP
    -- Create security alert for suspicious activity
    PERFORM create_security_alert(
      'suspicious_login_pattern',
      'high',
      'Multiple Failed Login Attempts Detected',
      format('User %s has %s failed login attempts in the last hour', 
             suspicious_users.user_id, 
             suspicious_users.failed_attempts),
      jsonb_build_object(
        'user_id', suspicious_users.user_id,
        'failed_attempts', suspicious_users.failed_attempts,
        'detection_time', now()
      )
    );
  END LOOP;
  
  -- Detect unusual data export patterns
  FOR suspicious_users IN
    SELECT user_id, COUNT(*) as export_count
    FROM public.usage_logs 
    WHERE feature_name = 'data_export' 
      AND created_at > now() - interval '1 hour'
    GROUP BY user_id
    HAVING COUNT(*) >= 10
  LOOP
    PERFORM create_security_alert(
      'unusual_data_export',
      'medium',
      'Unusual Data Export Activity',
      format('User %s has performed %s data exports in the last hour', 
             suspicious_users.user_id, 
             suspicious_users.export_count),
      jsonb_build_object(
        'user_id', suspicious_users.user_id,
        'export_count', suspicious_users.export_count,
        'detection_time', now()
      )
    );
  END LOOP;
END;
$$;

-- Create automated security monitoring job (would be called by cron/scheduler)
CREATE OR REPLACE FUNCTION run_security_monitoring()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Run suspicious pattern detection
  PERFORM detect_suspicious_access_patterns();
  
  -- Clean up old security events (keep 90 days)
  DELETE FROM public.security_events 
  WHERE created_at < now() - interval '90 days';
  
  -- Clean up old rate limit records
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - interval '1 day';
  
  DELETE FROM public.ip_rate_limits 
  WHERE window_start < now() - interval '1 day';
  
  -- Log monitoring completion
  PERFORM log_security_event_enhanced(
    'security_monitoring_completed',
    jsonb_build_object('execution_time', now()),
    'low'
  );
END;
$$;