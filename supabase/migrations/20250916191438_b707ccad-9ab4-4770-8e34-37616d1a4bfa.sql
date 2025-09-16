-- Security Fix Phase 1: Critical Database Security Hardening
-- Fix 1: Enhance system log isolation and security

-- Ensure strict RLS on ip_rate_limits table
DROP POLICY IF EXISTS "System can manage IP rate limits" ON ip_rate_limits;
CREATE POLICY "Security admins only can view IP rate limits" 
ON ip_rate_limits FOR SELECT 
USING (has_admin_permission(auth.uid(), 'security_admin'));

CREATE POLICY "System can insert IP rate limits" 
ON ip_rate_limits FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update IP rate limits" 
ON ip_rate_limits FOR UPDATE 
USING (true);

-- Fix 2: Enhance audit log security
DROP POLICY IF EXISTS "strict_audit_security_admin_view" ON audit_log;
DROP POLICY IF EXISTS "strict_audit_user_own_actions" ON audit_log;

CREATE POLICY "Strict audit log - security admin only" 
ON audit_log FOR SELECT 
USING (
  is_admin(auth.uid()) AND 
  has_admin_permission(auth.uid(), 'security_admin') AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view own audit actions only" 
ON audit_log FOR SELECT 
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Fix 3: Clean up payment logs policies - simplify and strengthen
DROP POLICY IF EXISTS "strict_payment_billing_admin_limited" ON payment_logs;
DROP POLICY IF EXISTS "strict_payment_user_only_select" ON payment_logs;
DROP POLICY IF EXISTS "payment_logs_financial_isolation" ON payment_logs;

CREATE POLICY "Payment logs - user access only" 
ON payment_logs FOR SELECT 
USING (
  auth.uid() = user_id AND 
  auth.uid() IS NOT NULL AND 
  inet_client_addr() IS NOT NULL
);

CREATE POLICY "Payment logs - billing admin business hours only" 
ON payment_logs FOR SELECT 
USING (
  is_admin(auth.uid()) AND 
  has_admin_permission(auth.uid(), 'billing_admin') AND
  EXTRACT(hour FROM now()) BETWEEN 8 AND 18 AND
  EXTRACT(dow FROM now()) BETWEEN 1 AND 5
);

-- Fix 4: Consolidate and strengthen API keys security
DROP POLICY IF EXISTS "api_keys_enhanced_security" ON api_keys;
DROP POLICY IF EXISTS "Users can view their own API keys" ON api_keys;

CREATE POLICY "API keys - strict user isolation" 
ON api_keys FOR ALL 
USING (
  auth.uid() = user_id AND 
  auth.uid() IS NOT NULL
) 
WITH CHECK (
  auth.uid() = user_id AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "API keys - security admin monitoring" 
ON api_keys FOR SELECT 
USING (
  is_admin(auth.uid()) AND 
  has_admin_permission(auth.uid(), 'security_admin')
);

-- Fix 5: Enhance security events isolation
DROP POLICY IF EXISTS "security_events_user_isolation" ON security_events;
DROP POLICY IF EXISTS "security_admins_only_can_view_security_events" ON security_events;

CREATE POLICY "Security events - strict user isolation" 
ON security_events FOR SELECT 
USING (
  user_id = auth.uid() AND 
  auth.uid() IS NOT NULL AND
  event_type NOT IN ('admin_action', 'system_alert', 'critical_security_event')
);

CREATE POLICY "Security events - admin monitoring only" 
ON security_events FOR SELECT 
USING (
  is_admin(auth.uid()) AND 
  has_admin_permission(auth.uid(), 'security_admin') AND
  auth.uid() IS NOT NULL
);

-- Fix 6: Create secure system health check function
CREATE OR REPLACE FUNCTION public.get_security_health_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  health_data jsonb;
  active_threats integer;
  policy_violations integer;
BEGIN
  -- Only security admins can access
  IF NOT (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'security_admin')) THEN
    RAISE EXCEPTION 'Access denied: Security admin required';
  END IF;
  
  -- Count active security threats
  SELECT COUNT(*) INTO active_threats
  FROM security_events 
  WHERE created_at > now() - interval '24 hours'
    AND metadata->>'threat_level' IN ('high', 'critical');
  
  -- Count recent policy violations
  SELECT COUNT(*) INTO policy_violations
  FROM security_events 
  WHERE event_type LIKE '%violation%' 
    AND created_at > now() - interval '24 hours';
  
  health_data := jsonb_build_object(
    'status', CASE 
      WHEN active_threats > 10 OR policy_violations > 5 THEN 'critical'
      WHEN active_threats > 5 OR policy_violations > 2 THEN 'warning'
      ELSE 'healthy'
    END,
    'active_threats_24h', active_threats,
    'policy_violations_24h', policy_violations,
    'last_check', now(),
    'security_score', CASE 
      WHEN active_threats = 0 AND policy_violations = 0 THEN 9.5
      WHEN active_threats <= 2 AND policy_violations <= 1 THEN 8.5
      ELSE 7.0
    END
  );
  
  -- Log security health check
  PERFORM log_security_event_enhanced(
    'security_health_check',
    health_data,
    CASE 
      WHEN active_threats > 10 THEN 'high'
      ELSE 'low'
    END
  );
  
  RETURN health_data;
END;
$$;

-- Fix 7: Enhanced rate limiting with better security
CREATE OR REPLACE FUNCTION public.check_enhanced_rate_limit_v2(
  endpoint_param text,
  ip_address_param inet DEFAULT inet_client_addr(),
  user_rate_limit integer DEFAULT 60,
  ip_rate_limit integer DEFAULT 100
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  user_requests integer := 0;
  ip_requests integer := 0;
  is_blocked boolean := false;
BEGIN
  -- Count user requests in last hour
  IF current_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO user_requests
    FROM usage_logs 
    WHERE user_id = current_user_id 
      AND feature_name = endpoint_param
      AND created_at > now() - interval '1 hour';
  END IF;
  
  -- Count IP requests in last hour
  SELECT COALESCE(requests_count, 0) INTO ip_requests
  FROM ip_rate_limits 
  WHERE ip_address = ip_address_param 
    AND endpoint = endpoint_param
    AND window_start > now() - interval '1 hour';
  
  -- Check if blocked
  SELECT COALESCE(is_blocked, false) INTO is_blocked
  FROM ip_rate_limits 
  WHERE ip_address = ip_address_param 
    AND blocked_until > now();
  
  -- Return enhanced rate limit result
  RETURN jsonb_build_object(
    'allowed', NOT (user_requests >= user_rate_limit OR ip_requests >= ip_rate_limit OR is_blocked),
    'user_requests', user_requests,
    'ip_requests', ip_requests,
    'user_limit', user_rate_limit,
    'ip_limit', ip_rate_limit,
    'is_blocked', is_blocked,
    'retry_after', CASE 
      WHEN is_blocked THEN EXTRACT(epoch FROM (
        SELECT blocked_until - now() 
        FROM ip_rate_limits 
        WHERE ip_address = ip_address_param AND blocked_until > now()
        LIMIT 1
      ))
      ELSE 3600 - EXTRACT(epoch FROM (now() - date_trunc('hour', now())))
    END
  );
END;
$$;