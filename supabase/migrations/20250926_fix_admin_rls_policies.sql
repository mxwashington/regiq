-- Fix Admin RLS Policies for Profiles, User Sessions, and Alerts
-- This addresses the 400/403 errors blocking admin dashboard functionality

BEGIN;

-- 1. Fix Profiles Table Access
-- Drop existing problematic policies
DROP POLICY IF EXISTS "fixed_secure_profile_access" ON public.profiles;
DROP POLICY IF EXISTS "consolidated_secure_profile_access" ON public.profiles;

-- Create comprehensive admin-friendly profile policy
CREATE POLICY "admin_and_user_profile_access" ON public.profiles
FOR ALL
USING (
  -- Users can access their own profile
  auth.uid() = user_id OR
  -- Admins can access all profiles
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_admin = true
  )
)
WITH CHECK (
  -- Users can modify their own profile
  auth.uid() = user_id OR
  -- Admins can modify all profiles
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_admin = true
  )
);

-- 2. Fix User Sessions Table Access
-- Create policy for user_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_data jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  last_activity timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '7 days')
);

-- Enable RLS on user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing user_sessions policies
DROP POLICY IF EXISTS "user_sessions_policy" ON public.user_sessions;

-- Create user_sessions policy
CREATE POLICY "user_sessions_access" ON public.user_sessions
FOR ALL
USING (
  -- Users can access their own sessions
  auth.uid() = user_id OR
  -- Admins can access all sessions
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_admin = true
  )
)
WITH CHECK (
  -- Users can modify their own sessions
  auth.uid() = user_id OR
  -- Admins can modify all sessions
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_admin = true
  )
);

-- 3. Fix Alerts Table Access for Admins
-- Drop existing restrictive alert policies
DROP POLICY IF EXISTS "alerts_read_policy" ON public.alerts;
DROP POLICY IF EXISTS "alerts_admin_policy" ON public.alerts;

-- Create comprehensive alerts policy
CREATE POLICY "alerts_access_policy" ON public.alerts
FOR SELECT
USING (
  -- Always allow reading alerts for authenticated users
  auth.uid() IS NOT NULL OR
  -- Allow anonymous access to public alerts (recent ones)
  (auth.uid() IS NULL AND published_date >= (CURRENT_DATE - INTERVAL '30 days'))
);

-- Create admin-specific alerts management policy
CREATE POLICY "alerts_admin_management" ON public.alerts
FOR ALL
USING (
  -- Admins can do everything with alerts
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_admin = true
  )
)
WITH CHECK (
  -- Admins can create/update alerts
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.is_admin = true
  )
);

-- 4. Grant necessary permissions
-- Grant access to service role and authenticated users
GRANT SELECT ON public.profiles TO authenticated, service_role;
GRANT SELECT ON public.user_sessions TO authenticated, service_role;
GRANT SELECT ON public.alerts TO authenticated, anon, service_role;

-- Grant admin users full access
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_sessions TO service_role;
GRANT ALL ON public.alerts TO service_role;

-- 5. Create helper function for admin verification
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = user_id_param
    AND is_admin = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_user TO authenticated, service_role;

-- 6. Create emergency admin function to bypass RLS for count queries
CREATE OR REPLACE FUNCTION public.get_admin_counts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  profile_count integer;
  alert_count integer;
  session_count integer;
  user_is_admin boolean;
BEGIN
  -- Check if current user is admin
  SELECT is_admin INTO user_is_admin
  FROM public.profiles
  WHERE user_id = auth.uid();

  -- Only return data for admins
  IF NOT COALESCE(user_is_admin, false) THEN
    RETURN jsonb_build_object(
      'error', 'Access denied - admin privileges required',
      'user_id', auth.uid()
    );
  END IF;

  -- Get counts with elevated privileges
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  SELECT COUNT(*) INTO alert_count FROM public.alerts;
  SELECT COUNT(*) INTO session_count FROM public.user_sessions;

  RETURN jsonb_build_object(
    'profiles', profile_count,
    'alerts', alert_count,
    'user_sessions', session_count,
    'timestamp', extract(epoch from now()),
    'admin_user', auth.uid()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_counts TO authenticated, service_role;

-- 7. Log this fix
INSERT INTO public.security_events (
  user_id,
  event_type,
  metadata
)
SELECT
  auth.uid(),
  'admin_rls_policies_fixed',
  jsonb_build_object(
    'fix_timestamp', extract(epoch from now()),
    'fixed_tables', ARRAY['profiles', 'user_sessions', 'alerts'],
    'issue', 'admin_dashboard_400_403_errors',
    'solution', 'comprehensive_admin_friendly_rls_policies'
  )
WHERE auth.uid() IS NOT NULL;

COMMIT;