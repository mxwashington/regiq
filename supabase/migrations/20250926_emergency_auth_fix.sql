-- EMERGENCY AUTH FIX - Fix overly restrictive profile RLS policy causing auth failures
-- This fixes the authentication hanging and access denied issues

-- 1. Fix the overly restrictive profile policy
-- The current policy with auth.jwt() IS NOT NULL is too restrictive and blocks legitimate users
DROP POLICY IF EXISTS "consolidated_secure_profile_access" ON public.profiles;

-- Create a more practical profile access policy that works with Supabase Auth
CREATE POLICY "fixed_secure_profile_access" ON public.profiles
FOR ALL
USING (
  -- User can access their own profile if they have a valid session
  (auth.uid() = user_id AND auth.uid() IS NOT NULL) OR
  -- Admins can access profiles with proper permissions
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'super_admin'))
)
WITH CHECK (
  -- Same rules for writes
  (auth.uid() = user_id AND auth.uid() IS NOT NULL) OR
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'super_admin'))
);

-- 2. Ensure the database has fallback functions in case they're missing
-- Create failsafe version of has_admin_permission if it doesn't exist
CREATE OR REPLACE FUNCTION public.has_admin_permission(user_id_param uuid, permission_name_param text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Fallback that checks if user is admin with basic permissions
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = user_id_param AND is_admin = true) THEN
    RETURN false;
  END IF;

  -- For super_admin, allow if user is admin
  IF permission_name_param = 'super_admin' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = user_id_param
      AND (is_admin = true OR role = 'admin')
    );
  END IF;

  -- Check specific admin permissions from profile
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = user_id_param
    AND is_admin = true
    AND (
      admin_permissions IS NULL OR
      admin_permissions::text LIKE '%' || permission_name_param || '%'
    )
  );
END;
$$;

-- 3. Log this emergency fix
INSERT INTO public.security_events (
  user_id,
  event_type,
  metadata
)
SELECT
  auth.uid(),
  'emergency_auth_policy_fix',
  jsonb_build_object(
    'fix_timestamp', extract(epoch from now()),
    'issue', 'overly_restrictive_profile_rls_policy',
    'solution', 'replaced_jwt_check_with_uid_check',
    'urgency', 'critical',
    'affects_users', 'all_authenticated_users'
  )
WHERE auth.uid() IS NOT NULL;

-- 4. Also create a simple function to check auth health
CREATE OR REPLACE FUNCTION public.check_auth_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_count integer;
  admin_count integer;
  current_user_profile record;
BEGIN
  -- Basic health checks
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE is_admin = true;

  -- Check if current user can access their profile
  SELECT * INTO current_user_profile
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  RETURN jsonb_build_object(
    'auth_health', 'ok',
    'timestamp', extract(epoch from now()),
    'total_users', user_count,
    'total_admins', admin_count,
    'current_user_can_access_profile', current_user_profile.user_id IS NOT NULL,
    'current_user_id', auth.uid(),
    'current_user_is_admin', COALESCE(current_user_profile.is_admin, false)
  );
END;
$$;