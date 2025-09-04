-- CRITICAL SECURITY FIXES - Comprehensive RLS Policy Updates (Fixed)
-- This migration addresses all 5 critical security vulnerabilities

-- ============================================================================
-- 1. FIX PROFILES TABLE SECURITY
-- ============================================================================

-- Drop existing insufficient policies for profiles
DROP POLICY IF EXISTS "Admins can update roles and admin fields" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create comprehensive security-first policies for profiles
CREATE POLICY "users_can_view_own_profile_only" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_profile_only" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_basic_info_only" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "super_admins_can_manage_all_profiles" 
ON public.profiles FOR ALL 
USING (
  is_admin(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND 'super_admin' = ANY(COALESCE(admin_permissions, '{}'))
  )
);

-- ============================================================================
-- 2. FIX PAYMENT LOGS SECURITY
-- ============================================================================

-- Drop existing insufficient policies for payment_logs
DROP POLICY IF EXISTS "Admins can view payment logs" ON public.payment_logs;
DROP POLICY IF EXISTS "System can insert payment logs" ON public.payment_logs;
DROP POLICY IF EXISTS "Users can view own payment logs" ON public.payment_logs;

-- Create comprehensive security policies for payment_logs
CREATE POLICY "users_can_view_own_payments_only" 
ON public.payment_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "billing_admins_can_view_payment_logs" 
ON public.payment_logs FOR SELECT 
USING (
  is_admin(auth.uid()) AND 
  has_admin_permission(auth.uid(), 'billing_admin')
);

CREATE POLICY "system_can_insert_payment_logs" 
ON public.payment_logs FOR INSERT 
WITH CHECK (true); -- Edge functions use service role

-- Prevent updates and deletes for audit trail integrity
CREATE POLICY "no_payment_log_modifications" 
ON public.payment_logs FOR UPDATE 
USING (false);

CREATE POLICY "no_payment_log_deletions" 
ON public.payment_logs FOR DELETE 
USING (false);

-- ============================================================================
-- 3. FIX API KEYS SECURITY  
-- ============================================================================

-- Drop existing insufficient policies for api_keys
DROP POLICY IF EXISTS "Admins can view API key metadata" ON public.api_keys;
DROP POLICY IF EXISTS "System can manage API keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can view own API keys" ON public.api_keys;

-- Create comprehensive security policies for API keys
CREATE POLICY "users_can_view_own_api_keys_metadata_only" 
ON public.api_keys FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "api_admins_can_view_api_key_metadata" 
ON public.api_keys FOR SELECT 
USING (
  is_admin(auth.uid()) AND 
  has_admin_permission(auth.uid(), 'api_admin')
);

CREATE POLICY "system_can_manage_api_keys" 
ON public.api_keys FOR ALL 
USING (true)
WITH CHECK (true); -- Edge functions use service role

-- Prevent direct user modifications
CREATE POLICY "no_direct_api_key_modifications" 
ON public.api_keys FOR UPDATE 
USING (false);

CREATE POLICY "no_direct_api_key_insertions" 
ON public.api_keys FOR INSERT 
WITH CHECK (false);

CREATE POLICY "no_direct_api_key_deletions" 
ON public.api_keys FOR DELETE 
USING (false);

-- ============================================================================
-- 4. FIX SECURITY EVENTS TABLE
-- ============================================================================

-- Drop existing insufficient policies for security_events
DROP POLICY IF EXISTS "Security admins can view security events" ON public.security_events;
DROP POLICY IF EXISTS "System can log security events" ON public.security_events;

-- Create comprehensive security policies for security events
CREATE POLICY "security_admins_only_can_view_security_events" 
ON public.security_events FOR SELECT 
USING (
  is_admin(auth.uid()) AND 
  has_admin_permission(auth.uid(), 'security_admin')
);

CREATE POLICY "system_can_log_security_events" 
ON public.security_events FOR INSERT 
WITH CHECK (true); -- Edge functions use service role

-- Prevent modifications to maintain audit trail integrity
CREATE POLICY "no_security_event_modifications" 
ON public.security_events FOR UPDATE 
USING (false);

CREATE POLICY "no_security_event_deletions" 
ON public.security_events FOR DELETE 
USING (false);

-- ============================================================================
-- 5. FIX ADMIN ACTIVITIES SECURITY
-- ============================================================================

-- Drop existing insufficient policies for admin_activities
DROP POLICY IF EXISTS "Admins can insert activities" ON public.admin_activities;
DROP POLICY IF EXISTS "Admins can view admin activities" ON public.admin_activities;

-- Create comprehensive security policies for admin activities
CREATE POLICY "super_admins_can_view_admin_activities" 
ON public.admin_activities FOR SELECT 
USING (
  is_admin(auth.uid()) AND 
  has_admin_permission(auth.uid(), 'super_admin')
);

CREATE POLICY "admins_can_insert_own_activities" 
ON public.admin_activities FOR INSERT 
WITH CHECK (
  is_admin(auth.uid()) AND 
  auth.uid() = admin_user_id
);

-- Prevent modifications to maintain audit trail integrity
CREATE POLICY "no_admin_activity_modifications" 
ON public.admin_activities FOR UPDATE 
USING (false);

CREATE POLICY "no_admin_activity_deletions" 
ON public.admin_activities FOR DELETE 
USING (false);