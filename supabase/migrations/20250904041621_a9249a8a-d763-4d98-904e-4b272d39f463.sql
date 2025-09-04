-- Simple Security Fix - Create columns first then update
-- Address core security issues step by step

-- 1. Fix the remaining function missing search_path
CREATE OR REPLACE FUNCTION public.prevent_direct_role_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF current_user = 'postgres' THEN
    RETURN NEW;
  END IF;
  
  IF NOT (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'super_admin')) THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR 
       NEW.is_admin IS DISTINCT FROM OLD.is_admin OR 
       NEW.admin_permissions IS DISTINCT FROM OLD.admin_permissions THEN
      RAISE EXCEPTION 'Admin fields can only be modified through admin functions';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Create secure RLS policies
-- Remove existing policies first
DROP POLICY IF EXISTS "enhanced_users_can_view_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_basic_info_only" ON public.profiles;  
DROP POLICY IF EXISTS "users_can_insert_own_profile_only" ON public.profiles;
DROP POLICY IF EXISTS "super_admins_can_manage_all_profiles" ON public.profiles;

-- Create simple, secure policies
CREATE POLICY "secure_profile_access" ON public.profiles
FOR ALL USING (
  (auth.uid() = user_id AND auth.jwt() IS NOT NULL) OR
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'super_admin'))
) WITH CHECK (
  (auth.uid() = user_id AND auth.jwt() IS NOT NULL) OR
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'super_admin'))
);

-- Secure payment logs
DROP POLICY IF EXISTS "users_can_view_own_payments_only" ON public.payment_logs;
DROP POLICY IF EXISTS "billing_admins_can_view_payment_logs" ON public.payment_logs;

CREATE POLICY "secure_payment_access" ON public.payment_logs
FOR SELECT USING (
  (auth.uid() = user_id AND auth.jwt() IS NOT NULL) OR
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'billing_admin'))
);

-- Secure API keys  
DROP POLICY IF EXISTS "enhanced_users_can_view_own_api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "users_can_view_own_api_keys_metadata_only" ON public.api_keys;
DROP POLICY IF EXISTS "api_admins_can_view_api_key_metadata" ON public.api_keys;

CREATE POLICY "secure_api_key_access" ON public.api_keys
FOR SELECT USING (
  (auth.uid() = user_id AND auth.jwt() IS NOT NULL) OR
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'api_admin'))
);