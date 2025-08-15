-- Phase 1: Critical Access Control Fixes

-- 1. Restrict Profile Role Changes - Add column-level security
-- Drop existing policies that are too permissive
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new restrictive policies for profile updates
CREATE POLICY "Users can update basic profile info" ON public.profiles
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Prevent users from modifying admin fields
  (role IS NULL OR role = OLD.role) AND
  (is_admin IS NULL OR is_admin = OLD.is_admin) AND
  (admin_permissions IS NULL OR admin_permissions = OLD.admin_permissions) AND
  (plan_limits IS NULL OR plan_limits = OLD.plan_limits)
);

-- Create admin-only policy for role management
CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 2. Fix Subscription Policies - Make them more restrictive
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

CREATE POLICY "Users can update own subscription status" ON public.subscribers
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Secure Alert Dismissal - Restrict to authenticated users only
DROP POLICY IF EXISTS "Users can dismiss alerts" ON public.alerts;

CREATE POLICY "Authenticated users can dismiss alerts" ON public.alerts
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Add proper audit logging function for admin activities
CREATE OR REPLACE FUNCTION public.log_admin_action(
  action_type text,
  target_type text DEFAULT NULL,
  target_id text DEFAULT NULL,
  details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only allow admins to log actions
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Only admins can log activities';
  END IF;
  
  INSERT INTO public.admin_activities (
    admin_user_id,
    action,
    target_type,
    target_id,
    details,
    user_agent
  ) VALUES (
    auth.uid(),
    action_type,
    target_type,
    target_id,
    details,
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;

-- 5. Secure the is_admin function to prevent bypassing
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT COALESCE(
    (SELECT (role = 'admin' OR is_admin = true) FROM public.profiles WHERE profiles.user_id = $1),
    false
  );
$$;

-- 6. Add data retention policy function
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Clean up old page views (older than 2 years)
  DELETE FROM public.page_views WHERE created_at < NOW() - INTERVAL '2 years';
  
  -- Clean up old user sessions (older than 1 year)
  DELETE FROM public.user_sessions WHERE created_at < NOW() - INTERVAL '1 year';
  
  -- Clean up old search cache (older than 1 week)
  DELETE FROM public.search_cache WHERE expires_at < NOW() - INTERVAL '1 week';
  
  -- Clean up old alert interactions (older than 1 year)
  DELETE FROM public.alert_interactions WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$;

-- 7. Add input validation for user preferences
ALTER TABLE public.user_preferences 
ADD CONSTRAINT valid_urgency_threshold 
CHECK (urgency_threshold IN ('Low', 'Medium', 'High', 'Critical'));

-- 8. Add constraint to limit array sizes (prevent DoS attacks)
ALTER TABLE public.user_preferences
ADD CONSTRAINT max_preferred_sources_limit
CHECK (array_length(preferred_sources, 1) <= 50);

-- 9. Add rate limiting table for API calls
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  requests_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits" ON public.rate_limits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits" ON public.rate_limits
FOR ALL USING (true) WITH CHECK (true);

-- 10. Add session security enhancements
CREATE OR REPLACE FUNCTION public.validate_session_security(
  session_user_id uuid,
  current_ip inet DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  trusted_ip boolean := false;
  session_valid boolean := false;
BEGIN
  -- Check if IP is in trusted list
  IF current_ip IS NOT NULL THEN
    SELECT (current_ip = ANY(COALESCE(trusted_ips, '{}')))
    INTO trusted_ip
    FROM public.profiles
    WHERE user_id = session_user_id;
  END IF;
  
  -- Check if session should be extended
  SELECT (session_extended_until > now() OR trusted_ip)
  INTO session_valid
  FROM public.profiles
  WHERE user_id = session_user_id;
  
  RETURN COALESCE(session_valid, false);
END;
$$;