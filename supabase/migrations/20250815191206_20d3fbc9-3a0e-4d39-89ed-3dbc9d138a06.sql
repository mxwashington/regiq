-- Phase 1: Critical Access Control Fixes

-- 1. Restrict Profile Role Changes - Create secure update function instead of using OLD
CREATE OR REPLACE FUNCTION public.update_user_profile(
  profile_user_id uuid,
  new_full_name text DEFAULT NULL,
  new_company text DEFAULT NULL,
  new_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only allow users to update their own basic profile info
  IF auth.uid() != profile_user_id THEN
    RAISE EXCEPTION 'Access denied: Users can only update their own profile';
  END IF;
  
  -- Update only allowed fields, never admin fields
  UPDATE public.profiles 
  SET 
    full_name = COALESCE(new_full_name, full_name),
    company = COALESCE(new_company, company),
    email = COALESCE(new_email, email),
    updated_at = now()
  WHERE user_id = profile_user_id;
END;
$$;

-- Drop existing permissive policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create restrictive policy for basic profile updates
CREATE POLICY "Users can update basic profile info" ON public.profiles
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND 
  -- Prevent modification of sensitive fields by checking they haven't changed
  role IS NOT DISTINCT FROM (SELECT role FROM public.profiles WHERE user_id = auth.uid()) AND
  is_admin IS NOT DISTINCT FROM (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid()) AND
  admin_permissions IS NOT DISTINCT FROM (SELECT admin_permissions FROM public.profiles WHERE user_id = auth.uid())
);

-- Create admin-only policy for role management
CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 2. Fix Subscription Policies
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;

CREATE POLICY "Users can update own subscription status" ON public.subscribers
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Secure Alert Dismissal
DROP POLICY IF EXISTS "Users can dismiss alerts" ON public.alerts;

CREATE POLICY "Authenticated users can dismiss alerts" ON public.alerts
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Add audit logging function
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
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Only admins can log activities';
  END IF;
  
  INSERT INTO public.admin_activities (
    admin_user_id,
    action,
    target_type,
    target_id,
    details
  ) VALUES (
    auth.uid(),
    action_type,
    target_type,
    target_id,
    details
  );
END;
$$;

-- 5. Secure admin function
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

-- 6. Add data retention function
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  DELETE FROM public.page_views WHERE created_at < NOW() - INTERVAL '2 years';
  DELETE FROM public.user_sessions WHERE created_at < NOW() - INTERVAL '1 year';
  DELETE FROM public.search_cache WHERE expires_at < NOW() - INTERVAL '1 week';
  DELETE FROM public.alert_interactions WHERE created_at < NOW() - INTERVAL '1 year';
END;
$$;

-- 7. Add input validation constraints
ALTER TABLE public.user_preferences 
DROP CONSTRAINT IF EXISTS valid_urgency_threshold;

ALTER TABLE public.user_preferences 
ADD CONSTRAINT valid_urgency_threshold 
CHECK (urgency_threshold IN ('Low', 'Medium', 'High', 'Critical'));

ALTER TABLE public.user_preferences
DROP CONSTRAINT IF EXISTS max_preferred_sources_limit;

ALTER TABLE public.user_preferences
ADD CONSTRAINT max_preferred_sources_limit
CHECK (array_length(preferred_sources, 1) <= 50 OR preferred_sources IS NULL);

-- 8. Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  endpoint text NOT NULL,
  requests_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rate limits" ON public.rate_limits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage rate limits" ON public.rate_limits
FOR ALL USING (true) WITH CHECK (true);