-- Fix critical security vulnerabilities by restricting RLS policies

-- 1. Fix profiles table - restrict admin access only
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 2. Fix subscribers table - restrict to own data only  
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
CREATE POLICY "Users can view own subscription" 
ON public.subscribers 
FOR SELECT 
USING (user_id = auth.uid() OR email = auth.email());

-- 3. Fix user_sessions table - restrict to own sessions only
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.user_sessions;
CREATE POLICY "Admins can view all sessions" 
ON public.user_sessions 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Users can manage own sessions" 
ON public.user_sessions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Fix cookie_consents table - restrict to own data
DROP POLICY IF EXISTS "Users can manage their own cookie preferences" ON public.cookie_consents;
CREATE POLICY "Users can manage own cookie preferences" 
ON public.cookie_consents 
FOR ALL 
USING (auth.uid() = user_id OR (user_id IS NULL AND visitor_id = current_setting('app.current_visitor_id', true)));

-- 5. Fix system_settings table - admin only access
DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Edge functions can manage system settings" ON public.system_settings;
CREATE POLICY "Admins only can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Allow edge functions to manage system settings (for data pipeline)
CREATE POLICY "Edge functions can manage system settings" 
ON public.system_settings 
FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);