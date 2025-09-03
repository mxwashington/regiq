-- Enhanced Security Fixes Migration
-- Phase 1: Enhanced Data Access Controls and Security Monitoring

-- 1. Enhanced Admin Permission System
-- Add more granular admin permissions
CREATE OR REPLACE FUNCTION public.has_admin_permission(user_id_param uuid, permission_name_param text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT 
      (role = 'admin' OR is_admin = true) AND 
      (permission_name_param = ANY(COALESCE(admin_permissions, '{}')) OR 'super_admin' = ANY(COALESCE(admin_permissions, '{}')))
     FROM public.profiles 
     WHERE profiles.user_id = user_id_param),
    false
  );
$$;

-- 2. Enhanced Security Event Logging with Automatic Threat Detection
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
  event_type_param text, 
  metadata_param jsonb DEFAULT '{}'::jsonb,
  threat_level_param text DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  user_ip inet := inet_client_addr();
  recent_events_count integer;
BEGIN
  -- Check for suspicious activity patterns
  IF event_type_param IN ('failed_login', 'rate_limit_exceeded', 'suspicious_data_access') THEN
    SELECT COUNT(*) INTO recent_events_count
    FROM public.security_events 
    WHERE user_id = current_user_id 
      AND event_type = event_type_param 
      AND created_at > now() - interval '1 hour';
    
    -- Auto-escalate threat level if multiple suspicious events
    IF recent_events_count >= 5 THEN
      threat_level_param := 'critical';
      metadata_param := metadata_param || jsonb_build_object('auto_escalated', true, 'recent_events', recent_events_count);
    ELSIF recent_events_count >= 3 THEN  
      threat_level_param := 'high';
    END IF;
  END IF;

  -- Insert enhanced security event
  INSERT INTO public.security_events (
    user_id,
    event_type,
    metadata,
    ip_address,
    user_agent
  ) VALUES (
    current_user_id,
    event_type_param,
    metadata_param || jsonb_build_object(
      'threat_level', threat_level_param,
      'timestamp', extract(epoch from now()),
      'session_info', jsonb_build_object(
        'ip', user_ip,
        'user_agent', current_setting('request.headers', true)::json->>'user-agent'
      )
    ),
    user_ip,
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  -- Log critical events to admin activities as well
  IF threat_level_param IN ('high', 'critical') AND current_user_id IS NOT NULL THEN
    INSERT INTO public.admin_activities (
      admin_user_id,
      action,
      target_type,
      details
    ) VALUES (
      current_user_id,
      'security_incident_detected',
      'security_event',
      jsonb_build_object(
        'event_type', event_type_param,
        'threat_level', threat_level_param,
        'metadata', metadata_param
      )
    );
  END IF;
END;
$$;

-- 3. Enhanced Rate Limiting with IP-based Controls
CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address inet NOT NULL,
  endpoint text NOT NULL,
  requests_count integer DEFAULT 1,
  window_start timestamptz DEFAULT now(),
  is_blocked boolean DEFAULT false,
  blocked_until timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(ip_address, endpoint)
);

-- Enable RLS on IP rate limits
ALTER TABLE public.ip_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy for IP rate limits (system only)
CREATE POLICY "System can manage IP rate limits" ON public.ip_rate_limits
FOR ALL USING (true) WITH CHECK (true);

-- Function for enhanced rate limiting
CREATE OR REPLACE FUNCTION public.check_enhanced_rate_limit(
  endpoint_param text,
  ip_address_param inet DEFAULT inet_client_addr(),
  user_rate_limit integer DEFAULT 60,
  ip_rate_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  user_requests integer := 0;
  ip_requests integer := 0;
  is_rate_limited boolean := false;
  limit_type text := 'none';
BEGIN
  -- Check user-specific rate limit
  IF current_user_id IS NOT NULL THEN
    SELECT COALESCE(SUM(requests_count), 0) INTO user_requests
    FROM public.rate_limits
    WHERE user_id = current_user_id 
      AND endpoint = endpoint_param
      AND window_start >= now() - interval '1 minute';
      
    IF user_requests >= user_rate_limit THEN
      is_rate_limited := true;
      limit_type := 'user';
    END IF;
  END IF;
  
  -- Check IP-based rate limit
  SELECT COALESCE(requests_count, 0) INTO ip_requests
  FROM public.ip_rate_limits
  WHERE ip_address = ip_address_param 
    AND endpoint = endpoint_param
    AND window_start >= now() - interval '1 minute';
    
  IF ip_requests >= ip_rate_limit THEN
    is_rate_limited := true;
    limit_type := CASE WHEN limit_type = 'user' THEN 'both' ELSE 'ip' END;
  END IF;
  
  -- Update counters
  IF NOT is_rate_limited THEN
    -- Update user rate limit
    IF current_user_id IS NOT NULL THEN
      INSERT INTO public.rate_limits (user_id, endpoint, requests_count, window_start)
      VALUES (current_user_id, endpoint_param, 1, now())
      ON CONFLICT (user_id, endpoint) DO UPDATE SET
        requests_count = rate_limits.requests_count + 1,
        window_start = CASE 
          WHEN rate_limits.window_start < now() - interval '1 minute' 
          THEN now() 
          ELSE rate_limits.window_start 
        END;
    END IF;
    
    -- Update IP rate limit
    INSERT INTO public.ip_rate_limits (ip_address, endpoint, requests_count, window_start)
    VALUES (ip_address_param, endpoint_param, 1, now())
    ON CONFLICT (ip_address, endpoint) DO UPDATE SET
      requests_count = CASE 
        WHEN ip_rate_limits.window_start < now() - interval '1 minute' 
        THEN 1 
        ELSE ip_rate_limits.requests_count + 1 
      END,
      window_start = CASE 
        WHEN ip_rate_limits.window_start < now() - interval '1 minute' 
        THEN now() 
        ELSE ip_rate_limits.window_start 
      END;
  ELSE
    -- Log rate limit violation
    PERFORM public.log_security_event_enhanced(
      'rate_limit_exceeded',
      jsonb_build_object(
        'endpoint', endpoint_param,
        'limit_type', limit_type,
        'user_requests', user_requests,
        'ip_requests', ip_requests,
        'ip_address', ip_address_param
      ),
      'medium'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', NOT is_rate_limited,
    'limit_type', limit_type,
    'user_requests', user_requests,
    'ip_requests', ip_requests,
    'retry_after', CASE WHEN is_rate_limited THEN 60 ELSE 0 END
  );
END;
$$;

-- 4. Enhanced Data Access Monitoring
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  table_name_param text,
  operation_param text,
  record_count_param integer DEFAULT 1,
  sensitive_fields jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  is_admin_user boolean := false;
  threat_level text := 'low';
BEGIN
  -- Check if user is admin
  SELECT public.is_admin(current_user_id) INTO is_admin_user;
  
  -- Determine threat level based on access patterns
  IF table_name_param IN ('payment_logs', 'api_keys', 'security_events', 'admin_activities') THEN
    threat_level := 'high';
  ELSIF table_name_param = 'profiles' AND operation_param != 'SELECT' THEN
    threat_level := 'medium';
  ELSIF record_count_param > 100 THEN
    threat_level := 'medium';
  END IF;
  
  -- Log to data access logs
  INSERT INTO public.data_access_logs (
    user_id,
    table_name,
    operation,
    record_count,
    ip_address
  ) VALUES (
    current_user_id,
    table_name_param,
    operation_param,
    record_count_param,
    inet_client_addr()
  );
  
  -- Log security event for sensitive operations
  IF threat_level IN ('medium', 'high') OR NOT is_admin_user THEN
    PERFORM public.log_security_event_enhanced(
      'sensitive_data_access',
      jsonb_build_object(
        'table', table_name_param,
        'operation', operation_param,
        'record_count', record_count_param,
        'sensitive_fields', sensitive_fields,
        'is_admin', is_admin_user
      ),
      threat_level
    );
  END IF;
END;
$$;

-- 5. Automated Security Alert System
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  title text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_resolved boolean DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on security alerts
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- Policy for security alerts (admins only)
CREATE POLICY "Security admins can manage alerts" ON public.security_alerts
FOR ALL USING (
  public.has_admin_permission(auth.uid(), 'security_admin')
) WITH CHECK (
  public.has_admin_permission(auth.uid(), 'security_admin')
);

-- Function to create security alerts
CREATE OR REPLACE FUNCTION public.create_security_alert(
  alert_type_param text,
  severity_param text,
  title_param text,
  description_param text,
  metadata_param jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  alert_id uuid;
BEGIN
  INSERT INTO public.security_alerts (
    alert_type,
    severity,
    title,
    description,
    metadata
  ) VALUES (
    alert_type_param,
    severity_param,
    title_param,
    description_param,
    metadata_param
  ) RETURNING id INTO alert_id;
  
  -- Log the alert creation
  PERFORM public.log_security_event_enhanced(
    'security_alert_created',
    jsonb_build_object(
      'alert_id', alert_id,
      'alert_type', alert_type_param,
      'severity', severity_param
    ),
    CASE 
      WHEN severity_param = 'critical' THEN 'critical'
      WHEN severity_param = 'high' THEN 'high'
      ELSE 'medium'
    END
  );
  
  RETURN alert_id;
END;
$$;

-- 6. Trigger for automatic security monitoring
CREATE OR REPLACE FUNCTION public.monitor_security_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_failed_logins integer;
  recent_rate_limits integer;
BEGIN
  -- Monitor for brute force attacks
  IF NEW.event_type = 'failed_login' THEN
    SELECT COUNT(*) INTO recent_failed_logins
    FROM public.security_events
    WHERE user_id = NEW.user_id
      AND event_type = 'failed_login'
      AND created_at > now() - interval '15 minutes';
    
    IF recent_failed_logins >= 5 THEN
      PERFORM public.create_security_alert(
        'brute_force_attack',
        'high',
        'Potential Brute Force Attack Detected',
        format('User %s has had %s failed login attempts in the last 15 minutes', NEW.user_id, recent_failed_logins),
        jsonb_build_object('user_id', NEW.user_id, 'failed_attempts', recent_failed_logins)
      );
    END IF;
  END IF;
  
  -- Monitor for excessive rate limiting
  IF NEW.event_type = 'rate_limit_exceeded' THEN
    SELECT COUNT(*) INTO recent_rate_limits
    FROM public.security_events
    WHERE ip_address = NEW.ip_address
      AND event_type = 'rate_limit_exceeded'
      AND created_at > now() - interval '1 hour';
    
    IF recent_rate_limits >= 10 THEN
      PERFORM public.create_security_alert(
        'ddos_attempt',
        'critical',
        'Potential DDoS Attack Detected',
        format('IP %s has exceeded rate limits %s times in the last hour', NEW.ip_address, recent_rate_limits),
        jsonb_build_object('ip_address', NEW.ip_address, 'rate_limit_violations', recent_rate_limits)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for security monitoring
DROP TRIGGER IF EXISTS security_event_monitor ON public.security_events;
CREATE TRIGGER security_event_monitor
  AFTER INSERT ON public.security_events
  FOR EACH ROW
  EXECUTE FUNCTION public.monitor_security_events();

-- 7. Enhanced Admin Activity Logging
CREATE OR REPLACE FUNCTION public.log_admin_action_enhanced(
  action_type text,
  target_type text DEFAULT NULL,
  target_id text DEFAULT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  require_admin boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Check admin permissions if required
  IF require_admin AND NOT public.is_admin(current_user_id) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required for action: %', action_type;
  END IF;
  
  -- Log to admin activities
  INSERT INTO public.admin_activities (
    admin_user_id,
    action,
    target_type,
    target_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    current_user_id,
    action_type,
    target_type,
    target_id,
    details || jsonb_build_object(
      'timestamp', extract(epoch from now()),
      'session_info', jsonb_build_object(
        'ip', inet_client_addr(),
        'user_agent', current_setting('request.headers', true)::json->>'user-agent'
      )
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  -- Also log as security event for audit trail
  PERFORM public.log_security_event_enhanced(
    'admin_action',
    jsonb_build_object(
      'action', action_type,
      'target_type', target_type,
      'target_id', target_id,
      'admin_user_id', current_user_id
    ),
    CASE 
      WHEN action_type LIKE '%delete%' OR action_type LIKE '%revoke%' THEN 'high'
      WHEN action_type LIKE '%grant%' OR action_type LIKE '%create%' THEN 'medium'
      ELSE 'low'
    END
  );
END;
$$;