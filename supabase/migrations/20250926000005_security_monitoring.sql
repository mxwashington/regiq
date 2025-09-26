-- Security Monitoring and Audit Trail Enhancement
-- Adds comprehensive security monitoring capabilities

BEGIN;

-- Create audit log for API access attempts
CREATE TABLE IF NOT EXISTS public.api_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint text NOT NULL,
  method text NOT NULL,
  user_id uuid REFERENCES public.profiles(user_id),
  api_key_used text NULL, -- Store partial key for tracking
  ip_address inet NULL,
  user_agent text NULL,
  success boolean NOT NULL DEFAULT false,
  error_message text NULL,
  response_time_ms integer NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.api_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admin users can view audit logs
CREATE POLICY "Admin access to audit logs" ON public.api_audit_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create function to log API access attempts
CREATE OR REPLACE FUNCTION log_api_access(
  endpoint_param text,
  method_param text,
  user_id_param uuid DEFAULT NULL,
  api_key_param text DEFAULT NULL,
  ip_param inet DEFAULT NULL,
  agent_param text DEFAULT NULL,
  success_param boolean DEFAULT false,
  error_param text DEFAULT NULL,
  timing_param integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.api_audit_log (
    endpoint,
    method,
    user_id,
    api_key_used,
    ip_address,
    user_agent,
    success,
    error_message,
    response_time_ms
  ) VALUES (
    endpoint_param,
    method_param,
    user_id_param,
    CASE
      WHEN api_key_param IS NOT NULL
      THEN concat(substr(api_key_param, 1, 8), '***')
      ELSE NULL
    END,
    ip_param,
    agent_param,
    success_param,
    error_param,
    timing_param
  );
END;
$$;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION log_api_access TO authenticated, service_role;

-- Create rate limiting tracking table
CREATE TABLE IF NOT EXISTS public.rate_limit_tracking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text NOT NULL, -- IP address or API key
  endpoint text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create unique index for rate limiting
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limit_identifier_endpoint
ON public.rate_limit_tracking(identifier, endpoint);

-- Enable RLS on rate limiting
ALTER TABLE public.rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- Admin access only
CREATE POLICY "Admin access to rate limits" ON public.rate_limit_tracking
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create security metrics view for dashboard
CREATE OR REPLACE VIEW public.security_dashboard AS
SELECT
  'api_requests_24h' as metric,
  count(*)::text as value,
  'requests' as unit,
  'API requests in last 24 hours' as description
FROM public.api_audit_log
WHERE created_at > now() - interval '24 hours'

UNION ALL

SELECT
  'failed_auth_24h' as metric,
  count(*)::text as value,
  'attempts' as unit,
  'Failed authentication attempts in last 24 hours' as description
FROM public.api_audit_log
WHERE created_at > now() - interval '24 hours'
AND success = false
AND error_message ILIKE '%unauthorized%'

UNION ALL

SELECT
  'unique_ips_24h' as metric,
  count(DISTINCT ip_address)::text as value,
  'addresses' as unit,
  'Unique IP addresses in last 24 hours' as description
FROM public.api_audit_log
WHERE created_at > now() - interval '24 hours'
AND ip_address IS NOT NULL

UNION ALL

SELECT
  'security_events_7d' as metric,
  count(*)::text as value,
  'events' as unit,
  'Security events in last 7 days' as description
FROM public.security_events
WHERE created_at > now() - interval '7 days';

-- Grant view access to admins
GRANT SELECT ON public.security_dashboard TO authenticated;

-- Add RLS to security dashboard view
CREATE POLICY "Admin access to security dashboard" ON public.security_dashboard
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

COMMIT;