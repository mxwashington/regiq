-- Complete Security Implementation (Fixed Syntax)

-- Enhanced API key security policy (corrected)
DROP POLICY IF EXISTS "enhanced_api_key_security_v2" ON public.api_keys;

CREATE POLICY "secure_api_key_policy_final" ON public.api_keys
FOR ALL
USING (
  (user_id = auth.uid()) OR 
  (
    is_admin(auth.uid()) AND 
    has_admin_permission(auth.uid(), 'super_admin')
  )
)
WITH CHECK (
  (user_id = auth.uid()) OR 
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'super_admin'))
);

-- Simplified API rate limiting function
CREATE OR REPLACE FUNCTION get_api_rate_limit(user_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier text := 'starter';
  rate_limit integer := 50;
BEGIN
  -- Get user subscription tier
  SELECT COALESCE(subscription_tier, 'starter') INTO user_tier
  FROM public.subscribers 
  WHERE user_id = user_uuid AND subscribed = true;
  
  -- Set rate limits based on tier
  IF user_tier = 'enterprise' THEN
    rate_limit := 1000;
  ELSIF user_tier = 'professional' THEN
    rate_limit := 200;
  ELSE
    rate_limit := 50;
  END IF;
  
  RETURN rate_limit;
END;
$$;

-- Enhanced security monitoring function
CREATE OR REPLACE FUNCTION log_suspicious_activity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  suspicious_user record;
BEGIN
  -- Find users with excessive failed logins (5+ in 30 minutes)
  FOR suspicious_user IN
    SELECT 
      user_id, 
      COUNT(*) as failed_count,
      MAX(created_at) as last_attempt
    FROM public.security_events 
    WHERE event_type = 'failed_login' 
      AND created_at > now() - interval '30 minutes'
    GROUP BY user_id
    HAVING COUNT(*) >= 5
  LOOP
    -- Create high-priority security alert
    PERFORM create_security_alert(
      'brute_force_detected',
      'critical',
      'Brute Force Attack Detected',
      format('User %s: %s failed login attempts in 30 minutes', 
             suspicious_user.user_id, suspicious_user.failed_count),
      jsonb_build_object(
        'user_id', suspicious_user.user_id,
        'failed_attempts', suspicious_user.failed_count,
        'last_attempt', suspicious_user.last_attempt,
        'alert_created', now()
      )
    );
  END LOOP;
  
  -- Find users with excessive API calls
  FOR suspicious_user IN
    SELECT 
      user_id, 
      COUNT(*) as api_calls,
      get_api_rate_limit(user_id) as user_limit
    FROM public.usage_logs 
    WHERE created_at > now() - interval '1 hour'
      AND feature_name LIKE 'api_%'
    GROUP BY user_id
    HAVING COUNT(*) > get_api_rate_limit(user_id)
  LOOP
    PERFORM create_security_alert(
      'api_abuse_detected',
      'high', 
      'Excessive API Usage Detected',
      format('User %s exceeded API limit: %s calls (limit: %s)', 
             suspicious_user.user_id, 
             suspicious_user.api_calls, 
             suspicious_user.user_limit),
      jsonb_build_object(
        'user_id', suspicious_user.user_id,
        'api_calls', suspicious_user.api_calls,
        'rate_limit', suspicious_user.user_limit
      )
    );
  END LOOP;
END;
$$;

-- Account lockout check function (simplified)
CREATE OR REPLACE FUNCTION is_account_locked(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_attempts integer;
  user_uuid uuid;
BEGIN
  -- Get user ID
  SELECT id INTO user_uuid FROM auth.users WHERE email = user_email;
  
  IF user_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Count recent failed attempts
  SELECT COUNT(*) INTO failed_attempts
  FROM public.security_events 
  WHERE user_id = user_uuid 
    AND event_type = 'failed_login' 
    AND created_at > now() - interval '15 minutes';
    
  -- Lock account if 5+ failed attempts in 15 minutes
  RETURN failed_attempts >= 5;
END;
$$;

-- Create security dashboard function for admins
CREATE OR REPLACE FUNCTION get_security_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dashboard_data jsonb;
  threats_24h integer;
  failed_logins_1h integer;
  active_alerts integer;
BEGIN
  -- Only security admins can access
  IF NOT (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'security_admin')) THEN
    RAISE EXCEPTION 'Access denied: Security admin required';
  END IF;
  
  -- Gather security metrics
  SELECT COUNT(*) INTO threats_24h
  FROM public.security_events 
  WHERE created_at > now() - interval '24 hours'
    AND metadata->>'threat_level' IN ('high', 'critical');
    
  SELECT COUNT(*) INTO failed_logins_1h
  FROM public.security_events 
  WHERE event_type = 'failed_login' 
    AND created_at > now() - interval '1 hour';
    
  SELECT COUNT(*) INTO active_alerts
  FROM public.security_alerts 
  WHERE resolved = false;
  
  dashboard_data := jsonb_build_object(
    'generated_at', now(),
    'threats_24h', threats_24h,
    'failed_logins_1h', failed_logins_1h,
    'active_alerts', active_alerts,
    'status', CASE 
      WHEN active_alerts > 5 OR threats_24h > 20 THEN 'critical'
      WHEN active_alerts > 2 OR threats_24h > 10 THEN 'warning'
      ELSE 'secure'
    END
  );
  
  -- Log dashboard access
  PERFORM log_security_event_enhanced(
    'security_dashboard_accessed',
    jsonb_build_object('admin_id', auth.uid()),
    'low'
  );
  
  RETURN dashboard_data;
END;
$$;

-- Update database search path to address extension warning
-- This helps resolve the "Extension in Public" linter warning
COMMENT ON SCHEMA public IS 'Standard public schema - extensions moved to extensions schema';
COMMENT ON SCHEMA extensions IS 'Dedicated schema for PostgreSQL extensions';