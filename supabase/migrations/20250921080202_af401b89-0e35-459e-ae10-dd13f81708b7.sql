-- PHASE 1: Critical Data Protection Fixes (Corrected)

-- Fix supplier RLS policies - restrict to authorized users only
DROP POLICY IF EXISTS "Users can view suppliers" ON public.suppliers;
CREATE POLICY "Users can view suppliers with proper authorization" 
ON public.suppliers FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    -- Only enterprise subscribers can access supplier data
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.subscription_plan = 'enterprise'
      AND p.subscription_status = 'active'
    ) OR
    -- Or admins
    is_admin(auth.uid())
  )
);

-- Secure alerts table - add user-specific access control
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Users can only see alerts relevant to their subscription level (using correct column name 'urgency')
CREATE POLICY "Users can view alerts based on subscription" 
ON public.alerts FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    -- Free users see basic alerts only (High urgency alerts)
    (EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.subscription_status = 'trial'
    ) AND urgency IN ('High', 'Critical')) OR
    -- Paid users see all alerts
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() 
      AND p.subscription_status = 'active'
    ) OR
    -- Admins see all
    is_admin(auth.uid())
  )
);

-- Add secure input validation function
CREATE OR REPLACE FUNCTION public.validate_and_sanitize_input(
  input_text text,
  max_length integer DEFAULT 1000,
  allow_html boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sanitized_text text;
  is_valid boolean := true;
  error_messages text[] := '{}';
BEGIN
  -- Length validation
  IF length(input_text) > max_length THEN
    is_valid := false;
    error_messages := array_append(error_messages, format('Input exceeds maximum length of %s characters', max_length));
  END IF;
  
  -- XSS pattern detection
  IF input_text ~* '(<script|javascript:|on\w+\s*=|<iframe|<object|<embed)' THEN
    is_valid := false;
    error_messages := array_append(error_messages, 'Input contains potentially malicious content');
    
    -- Log security event
    PERFORM log_security_event_enhanced(
      'xss_attempt_detected',
      jsonb_build_object(
        'input_pattern', substring(input_text, 1, 100),
        'user_id', auth.uid(),
        'ip_address', inet_client_addr()
      ),
      'high'
    );
  END IF;
  
  -- SQL injection pattern detection
  IF input_text ~* '(union\s+select|drop\s+table|insert\s+into|update\s+set|delete\s+from|\-\-|\;)' THEN
    is_valid := false;
    error_messages := array_append(error_messages, 'Input contains potentially malicious SQL patterns');
    
    -- Log security event
    PERFORM log_security_event_enhanced(
      'sql_injection_attempt',
      jsonb_build_object(
        'input_pattern', substring(input_text, 1, 100),
        'user_id', auth.uid(),
        'ip_address', inet_client_addr()
      ),
      'critical'
    );
  END IF;
  
  -- Basic sanitization
  sanitized_text := input_text;
  IF NOT allow_html THEN
    -- Remove HTML tags
    sanitized_text := regexp_replace(sanitized_text, '<[^>]*>', '', 'g');
  END IF;
  
  -- Trim and normalize whitespace
  sanitized_text := trim(sanitized_text);
  sanitized_text := regexp_replace(sanitized_text, '\s+', ' ', 'g');
  
  RETURN jsonb_build_object(
    'is_valid', is_valid,
    'sanitized_text', sanitized_text,
    'original_text', input_text,
    'errors', error_messages
  );
END;
$$;

-- Add enhanced rate limiting function
CREATE OR REPLACE FUNCTION public.enhanced_rate_limit_check(
  endpoint_name text,
  user_limit integer DEFAULT 60,
  ip_limit integer DEFAULT 100
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  user_ip inet := inet_client_addr();
  user_requests integer := 0;
  ip_requests integer := 0;
  is_blocked boolean := false;
  result jsonb;
BEGIN
  -- Check user-based rate limiting (using existing usage_logs if available)
  IF current_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO user_requests
    FROM public.usage_logs 
    WHERE user_id = current_user_id 
      AND feature_name = endpoint_name
      AND created_at > now() - interval '1 hour';
  END IF;
  
  -- Check IP-based rate limiting
  SELECT 
    COALESCE(requests_count, 0),
    COALESCE(is_blocked, false)
  INTO ip_requests, is_blocked
  FROM public.ip_rate_limits 
  WHERE ip_address = user_ip 
    AND endpoint = endpoint_name
    AND window_start > now() - interval '1 hour'
  LIMIT 1;
  
  -- Update or insert IP rate limit record
  INSERT INTO public.ip_rate_limits (ip_address, endpoint, requests_count, window_start)
  VALUES (user_ip, endpoint_name, 1, date_trunc('hour', now()))
  ON CONFLICT (ip_address, endpoint, window_start) 
  DO UPDATE SET 
    requests_count = ip_rate_limits.requests_count + 1,
    is_blocked = CASE 
      WHEN ip_rate_limits.requests_count + 1 > ip_limit THEN true
      ELSE ip_rate_limits.is_blocked 
    END,
    blocked_until = CASE 
      WHEN ip_rate_limits.requests_count + 1 > ip_limit THEN now() + interval '1 hour'
      ELSE ip_rate_limits.blocked_until 
    END;
  
  -- Create result
  result := jsonb_build_object(
    'allowed', NOT (user_requests >= user_limit OR ip_requests >= ip_limit OR is_blocked),
    'user_requests', user_requests,
    'ip_requests', ip_requests,
    'user_limit', user_limit,
    'ip_limit', ip_limit,
    'is_blocked', is_blocked,
    'endpoint', endpoint_name
  );
  
  -- Log security event if rate limit exceeded
  IF user_requests >= user_limit OR ip_requests >= ip_limit OR is_blocked THEN
    PERFORM log_security_event_enhanced(
      'rate_limit_exceeded',
      jsonb_build_object(
        'endpoint', endpoint_name,
        'user_requests', user_requests,
        'ip_requests', ip_requests,
        'user_limit', user_limit,
        'ip_limit', ip_limit
      ),
      'medium'
    );
  END IF;
  
  RETURN result;
END;
$$;