-- CRITICAL SECURITY FIXES FOR REGIQ - Phase 1
-- Secure critical data tables with proper RLS policies

-- 1. SECURE PROFILES TABLE
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "consolidated_secure_profile_access" ON public.profiles;

-- Create secure, restrictive policies for profiles
CREATE POLICY "users_can_view_own_profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "super_admins_can_manage_profiles" 
ON public.profiles 
FOR ALL 
USING (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'super_admin'))
WITH CHECK (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'super_admin'));

-- 2. SECURE API_KEYS TABLE  
-- Drop existing policies and create secure ones
DROP POLICY IF EXISTS "Users can insert their API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can view their API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update their API keys" ON public.api_keys;

CREATE POLICY "users_can_view_own_api_keys" 
ON public.api_keys 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_create_own_api_keys" 
ON public.api_keys 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_api_keys" 
ON public.api_keys 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_api_keys" 
ON public.api_keys 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "admins_can_manage_api_keys_with_logging" 
ON public.api_keys 
FOR ALL 
USING (
  is_admin(auth.uid()) AND 
  has_admin_permission(auth.uid(), 'super_admin')
);

-- 3. SECURE TEAM_MEMBERS TABLE
CREATE POLICY "team_owners_can_manage_their_team" 
ON public.team_members 
FOR ALL 
USING (auth.uid() = team_owner)
WITH CHECK (auth.uid() = team_owner);

CREATE POLICY "team_members_can_view_their_team" 
ON public.team_members 
FOR SELECT 
USING (
  auth.uid() = team_owner OR 
  member_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- 4. SECURE PAYMENT LOGS ACCESS
-- Add additional security for payment logs
CREATE POLICY "secure_payment_logs_user_only_enhanced" 
ON public.payment_logs 
FOR SELECT 
USING (
  auth.uid() = user_id AND 
  auth.jwt() IS NOT NULL
);

-- 5. IMPLEMENT ACCOUNT LOCKOUT MECHANISM
CREATE OR REPLACE FUNCTION check_account_lockout_status(user_email_param text)
RETURNS jsonb AS $$
DECLARE
  failed_attempts INTEGER;
  lockout_until TIMESTAMP WITH TIME ZONE;
  is_locked BOOLEAN := false;
BEGIN
  -- Count failed login attempts in last 15 minutes
  SELECT COUNT(*) INTO failed_attempts
  FROM security_events se
  JOIN auth.users au ON au.id = se.user_id
  WHERE au.email = user_email_param
    AND se.event_type = 'failed_login'
    AND se.created_at > now() - interval '15 minutes';
  
  -- Determine lockout status
  IF failed_attempts >= 5 THEN
    is_locked := true;
    lockout_until := now() + interval '15 minutes';
  END IF;
  
  -- Log lockout check
  PERFORM log_security_event_enhanced(
    'account_lockout_check',
    jsonb_build_object(
      'email', user_email_param,
      'failed_attempts', failed_attempts,
      'is_locked', is_locked
    ),
    CASE WHEN is_locked THEN 'high' ELSE 'low' END
  );
  
  RETURN jsonb_build_object(
    'is_locked', is_locked,
    'failed_attempts', failed_attempts,
    'lockout_until', lockout_until,
    'retry_after_seconds', CASE WHEN is_locked THEN 900 ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CREATE SECURITY DASHBOARD FUNCTION
CREATE OR REPLACE FUNCTION get_security_dashboard_enhanced()
RETURNS jsonb AS $$
DECLARE
  dashboard_data jsonb;
  critical_alerts INTEGER;
  failed_logins_24h INTEGER;
  admin_actions_24h INTEGER;
  api_key_usage_24h INTEGER;
BEGIN
  -- Only security admins can access
  IF NOT (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'security_admin')) THEN
    RAISE EXCEPTION 'Access denied: Security admin privileges required';
  END IF;
  
  -- Gather critical security metrics
  SELECT COUNT(*) INTO critical_alerts
  FROM security_alerts 
  WHERE severity = 'critical' AND resolved = false;
  
  SELECT COUNT(*) INTO failed_logins_24h
  FROM security_events 
  WHERE event_type = 'failed_login' 
    AND created_at > now() - interval '24 hours';
    
  SELECT COUNT(*) INTO admin_actions_24h
  FROM admin_activities 
  WHERE created_at > now() - interval '24 hours';
  
  SELECT COUNT(*) INTO api_key_usage_24h
  FROM usage_logs 
  WHERE feature_name = 'api_access' 
    AND created_at > now() - interval '24 hours';
  
  dashboard_data := jsonb_build_object(
    'generated_at', now(),
    'security_status', CASE 
      WHEN critical_alerts > 0 THEN 'CRITICAL'
      WHEN failed_logins_24h > 50 THEN 'HIGH_RISK'
      ELSE 'SECURE'
    END,
    'metrics', jsonb_build_object(
      'critical_alerts', critical_alerts,
      'failed_logins_24h', failed_logins_24h,
      'admin_actions_24h', admin_actions_24h,
      'api_key_usage_24h', api_key_usage_24h
    ),
    'recommendations', CASE 
      WHEN critical_alerts > 0 THEN jsonb_build_array('Resolve critical security alerts immediately')
      WHEN failed_logins_24h > 20 THEN jsonb_build_array('Monitor for brute force attacks')
      ELSE jsonb_build_array('Security status normal')
    END
  );
  
  -- Log dashboard access
  PERFORM log_security_event_enhanced(
    'security_dashboard_accessed',
    jsonb_build_object('admin_id', auth.uid()),
    'medium'
  );
  
  RETURN dashboard_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. UPDATE EXISTING FUNCTIONS TO USE PROPER SEARCH PATH
ALTER FUNCTION public.is_admin(uuid) SET search_path = 'public';
ALTER FUNCTION public.has_admin_permission(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.log_security_event_enhanced(text, jsonb, text) SET search_path = 'public';

-- 8. CREATE SECURE SESSION MANAGEMENT
CREATE OR REPLACE FUNCTION extend_user_session_secure(hours_to_extend INTEGER DEFAULT 2)
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid := auth.uid();
  max_extension_hours INTEGER := 8;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Limit session extension
  IF hours_to_extend > max_extension_hours THEN
    hours_to_extend := max_extension_hours;
  END IF;
  
  -- Update session extension in profiles
  UPDATE profiles 
  SET session_extended_until = now() + (hours_to_extend || ' hours')::interval
  WHERE user_id = current_user_id;
  
  -- Log session extension
  PERFORM log_security_event_enhanced(
    'session_extended',
    jsonb_build_object(
      'hours_extended', hours_to_extend,
      'extended_until', now() + (hours_to_extended || ' hours')::interval
    ),
    'low'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'extended_until', now() + (hours_to_extend || ' hours')::interval,
    'hours_extended', hours_to_extend
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;