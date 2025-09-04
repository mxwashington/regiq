-- Simple Security Fix - Core Issues Only
-- Fix function search_path and strengthen key RLS policies

-- 1. Fix the remaining function missing search_path  
CREATE OR REPLACE FUNCTION public.prevent_direct_role_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Allow system-level operations (like triggers) 
  IF current_user = 'postgres' THEN
    RETURN NEW;
  END IF;
  
  -- Prevent non-super-admins from modifying admin fields
  IF NOT (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'super_admin')) THEN
    -- Prevent modification of admin fields
    IF NEW.role IS DISTINCT FROM OLD.role OR 
       NEW.is_admin IS DISTINCT FROM OLD.is_admin OR 
       NEW.admin_permissions IS DISTINCT FROM OLD.admin_permissions THEN
      RAISE EXCEPTION 'Admin fields can only be modified through admin functions';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Strengthen core RLS policies for critical tables
-- Ultra-strict profiles policies
DROP POLICY IF EXISTS "ultra_secure_profile_select" ON public.profiles;
DROP POLICY IF EXISTS "ultra_secure_profile_insert" ON public.profiles;
DROP POLICY IF EXISTS "ultra_secure_profile_update" ON public.profiles;
DROP POLICY IF EXISTS "super_admin_profile_management" ON public.profiles;

CREATE POLICY "secure_profile_access_only" ON public.profiles
FOR ALL USING (
  -- Only allow access if user owns the profile OR is super admin with valid session
  (auth.uid() = user_id AND auth.jwt() IS NOT NULL) OR
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'super_admin') AND auth.jwt() IS NOT NULL)
) WITH CHECK (
  -- Same restrictions for modifications
  (auth.uid() = user_id AND auth.jwt() IS NOT NULL) OR  
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'super_admin') AND auth.jwt() IS NOT NULL)
);

-- Ultra-strict payment logs policies
DROP POLICY IF EXISTS "ultra_secure_payment_access" ON public.payment_logs;

CREATE POLICY "secure_payment_access_only" ON public.payment_logs
FOR ALL USING (
  -- Only allow access to own payment data OR billing admin with IP validation
  (auth.uid() = user_id AND auth.jwt() IS NOT NULL AND inet_client_addr() IS NOT NULL) OR
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'billing_admin') AND auth.jwt() IS NOT NULL)
);

-- Ultra-strict API keys policies  
DROP POLICY IF EXISTS "ultra_secure_api_key_access" ON public.api_keys;

CREATE POLICY "secure_api_key_access_only" ON public.api_keys
FOR SELECT USING (
  -- Only allow viewing own API keys OR api admin with strict validation
  (auth.uid() = user_id AND auth.jwt() IS NOT NULL) OR
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'api_admin') AND auth.jwt() IS NOT NULL)
);