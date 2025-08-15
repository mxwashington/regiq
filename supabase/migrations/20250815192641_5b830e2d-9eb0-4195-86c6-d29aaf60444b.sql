-- Fix security linter warnings

-- 1. Fix function search path mutable warning for existing functions
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type_param TEXT,
  metadata_param JSONB DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    metadata
  ) VALUES (
    auth.uid(),
    event_type_param,
    metadata_param
  );
END;
$$;

-- Fix other functions that may have search path issues
CREATE OR REPLACE FUNCTION public.update_user_profile(profile_user_id uuid, new_full_name text DEFAULT NULL::text, new_company text DEFAULT NULL::text, new_email text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
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

CREATE OR REPLACE FUNCTION public.log_admin_action(action_type text, target_type text DEFAULT NULL::text, target_id text DEFAULT NULL::text, details jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
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