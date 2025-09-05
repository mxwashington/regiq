-- Phase 2 & 3: API Security & Database Hardening (Corrected)

-- Fix API key policies - drop existing and recreate with proper naming
DROP POLICY IF EXISTS "secure_api_key_access" ON public.api_keys;
DROP POLICY IF EXISTS "Enterprise users can manage their own API keys" ON public.api_keys;

-- Create enhanced API key security policy with unique name
CREATE POLICY "enhanced_api_key_security_v2" ON public.api_keys
FOR ALL
USING (
  -- Users can access their own keys, super admins can access all with logging
  (user_id = auth.uid()) OR 
  (
    is_admin(auth.uid()) AND 
    has_admin_permission(auth.uid(), 'super_admin') AND
    (SELECT log_security_event_enhanced(
      'admin_api_key_access',
      jsonb_build_object(
        'target_user_id', user_id,
        'admin_user_id', auth.uid(),
        'access_type', 'api_key_management'
      ),
      'high'
    )) IS NOT NULL
  )
)
WITH CHECK (
  -- Only allow creation/updates by owner or super admin
  (user_id = auth.uid()) OR 
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'super_admin'))
);

-- Enhanced rate limiting for API operations
CREATE OR REPLACE FUNCTION check_enhanced_api_rate_limit()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  api_requests integer;
  user_tier text;
BEGIN
  -- Get user subscription tier
  SELECT COALESCE(subscription_tier, 'starter') INTO user_tier
  FROM public.subscribers 
  WHERE user_id = auth.uid() AND subscribed = true;
  
  -- Check API-specific rate limits
  SELECT COALESCE(SUM(requests_count), 0) INTO api_requests
  FROM public.rate_limits
  WHERE user_id = auth.uid() 
    AND endpoint LIKE 'api_%'
    AND window_start >= now() - interval '1 hour';
    
  -- Tiered rate limits: starter=50/hour, professional=200/hour, enterprise=1000/hour
  IF api_requests >= CASE user_tier
    WHEN 'enterprise' THEN 1000
    WHEN 'professional' THEN 200
    ELSE 50
  END THEN
    PERFORM log_security_event_enhanced(
      'api_rate_limit_exceeded',
      jsonb_build_object(
        'user_id', auth.uid(),
        'requests_count', api_requests,
        'user_tier', user_tier,
        'limit_exceeded', true
      ),
      'high'
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Database Hardening: Extensions schema setup (addresses linter warning)
-- Set search_path to prefer extensions schema for extension objects
ALTER DATABASE postgres SET search_path = extensions, public;

-- Security Monitoring Functions
CREATE OR REPLACE FUNCTION create_security_monitoring_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  security_summary jsonb;
  recent_threats integer;
  active_sessions integer;
  failed_logins_24h integer;
BEGIN
  -- Only security admins can access dashboard data
  IF NOT (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'security_admin')) THEN
    RAISE EXCEPTION 'Access denied: Security admin privileges required';
  END IF;
  
  -- Count recent security events
  SELECT COUNT(*) INTO recent_threats
  FROM public.security_events 
  WHERE created_at > now() - interval '24 hours'
    AND metadata->>'threat_level' IN ('high', 'critical');
    
  -- Count active user sessions
  SELECT COUNT(DISTINCT user_id) INTO active_sessions
  FROM public.user_sessions 
  WHERE start_time > now() - interval '1 hour';
  
  -- Count failed login attempts in last 24 hours
  SELECT COUNT(*) INTO failed_logins_24h
  FROM public.security_events 
  WHERE event_type = 'failed_login' 
    AND created_at > now() - interval '24 hours';
  
  -- Build security summary
  security_summary := jsonb_build_object(
    'dashboard_generated_at', now(),
    'recent_threats', recent_threats,
    'active_sessions', active_sessions,
    'failed_logins_24h', failed_logins_24h,
    'security_status', 
      CASE 
        WHEN recent_threats > 10 THEN 'critical'
        WHEN recent_threats > 5 THEN 'high'
        WHEN recent_threats > 0 THEN 'medium'
        ELSE 'secure'
      END,
    'recommendations', 
      CASE 
        WHEN failed_logins_24h > 20 THEN ARRAY['Enable account lockout policies', 'Review authentication logs']
        WHEN recent_threats > 0 THEN ARRAY['Monitor security events closely']
        ELSE ARRAY['Security posture appears normal']
      END
  );
  
  -- Log dashboard access
  PERFORM log_security_event_enhanced(
    'security_dashboard_accessed',
    jsonb_build_object(
      'admin_user_id', auth.uid(),
      'dashboard_data', security_summary
    ),
    'low'
  );
  
  RETURN security_summary;
END;
$$;

-- Account lockout function for repeated failed logins
CREATE OR REPLACE FUNCTION check_account_lockout(user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_attempts integer;
  lockout_until timestamp with time zone;
  user_uuid uuid;
BEGIN
  -- Get user ID from email
  SELECT id INTO user_uuid FROM auth.users WHERE email = user_email;
  
  IF user_uuid IS NULL THEN
    RETURN jsonb_build_object('locked', false, 'reason', 'user_not_found');
  END IF;
  
  -- Count failed login attempts in last 30 minutes
  SELECT COUNT(*) INTO failed_attempts
  FROM public.security_events 
  WHERE user_id = user_uuid 
    AND event_type = 'failed_login' 
    AND created_at > now() - interval '30 minutes';
    
  -- Check if account should be temporarily locked (5+ failures)
  IF failed_attempts >= 5 THEN
    lockout_until := now() + interval '15 minutes';
    
    -- Create security alert for account lockout
    PERFORM create_security_alert(
      'account_lockout',
      'high',
      'Account Temporarily Locked Due to Failed Login Attempts',
      format('Account %s locked until %s due to %s failed login attempts', 
             user_email, lockout_until, failed_attempts),
      jsonb_build_object(
        'user_id', user_uuid,
        'user_email', user_email,
        'failed_attempts', failed_attempts,
        'lockout_until', lockout_until,
        'lockout_reason', 'excessive_failed_logins'
      )
    );
    
    RETURN jsonb_build_object(
      'locked', true, 
      'lockout_until', lockout_until,
      'failed_attempts', failed_attempts,
      'reason', 'excessive_failed_logins'
    );
  END IF;
  
  RETURN jsonb_build_object('locked', false, 'failed_attempts', failed_attempts);
END;
$$;