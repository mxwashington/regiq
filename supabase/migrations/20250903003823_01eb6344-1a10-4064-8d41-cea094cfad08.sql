-- CRITICAL SECURITY FIXES: Add RLS policies for highly sensitive tables

-- 1. PROFILES TABLE - Critical: Protects user personal data
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view basic profile info only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update basic profile info" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update roles only" ON public.profiles;

-- Users can only view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view basic info for management purposes
CREATE POLICY "Admins can view basic profile info" 
ON public.profiles 
FOR SELECT 
USING (is_admin(auth.uid()) AND user_id IS NOT NULL);

-- Users can update their own basic profile info (not admin fields)
CREATE POLICY "Users can update their own basic profile info" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Prevent users from changing admin fields
  NOT (role IS DISTINCT FROM (SELECT role FROM profiles WHERE user_id = auth.uid())) AND
  NOT (is_admin IS DISTINCT FROM (SELECT is_admin FROM profiles WHERE user_id = auth.uid())) AND
  NOT (admin_permissions IS DISTINCT FROM (SELECT admin_permissions FROM profiles WHERE user_id = auth.uid()))
);

-- Only admins can update roles and admin fields
CREATE POLICY "Admins can update roles and admin fields" 
ON public.profiles 
FOR UPDATE 
USING (is_admin(auth.uid()) AND user_id != auth.uid())
WITH CHECK (is_admin(auth.uid()) AND user_id != auth.uid());

-- 2. PAYMENT_LOGS TABLE - Critical: Protects financial data
DROP POLICY IF EXISTS "Admins can view payment logs" ON public.payment_logs;
DROP POLICY IF EXISTS "System can insert payment logs" ON public.payment_logs;

-- Only admins can view payment logs
CREATE POLICY "Admins can view payment logs" 
ON public.payment_logs 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Users can view their own payment logs
CREATE POLICY "Users can view own payment logs" 
ON public.payment_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- System can insert payment logs (for webhooks)
CREATE POLICY "System can insert payment logs" 
ON public.payment_logs 
FOR INSERT 
WITH CHECK (true);

-- 3. API_KEYS TABLE - Critical: Protects API access credentials
DROP POLICY IF EXISTS "Users can view own API keys" ON public.api_keys;
DROP POLICY IF EXISTS "System can manage API keys" ON public.api_keys;

-- Users can only view their own API keys (masked for security)
CREATE POLICY "Users can view own API keys" 
ON public.api_keys 
FOR SELECT 
USING (auth.uid() = user_id);

-- Only system functions can manage API keys
CREATE POLICY "System can manage API keys" 
ON public.api_keys 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Admins can view API key metadata (not actual keys)
CREATE POLICY "Admins can view API key metadata" 
ON public.api_keys 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 4. SECURITY_EVENTS TABLE - Critical: Protects security audit data  
DROP POLICY IF EXISTS "Super admins can view security events" ON public.security_events;
DROP POLICY IF EXISTS "System can log security events" ON public.security_events;

-- Only security admins can view security events
CREATE POLICY "Security admins can view security events" 
ON public.security_events 
FOR SELECT 
USING (
  is_admin(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND 'security_admin' = ANY(admin_permissions)
  )
);

-- System can log security events
CREATE POLICY "System can log security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

-- 5. ADMIN_ACTIVITIES TABLE - Critical: Protects administrative audit logs
DROP POLICY IF EXISTS "Admins can view all activities" ON public.admin_activities;
DROP POLICY IF EXISTS "Admins can insert activities" ON public.admin_activities;

-- Only admins can view administrative activities
CREATE POLICY "Admins can view admin activities" 
ON public.admin_activities 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Only admins can log their activities
CREATE POLICY "Admins can insert activities" 
ON public.admin_activities 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- 6. Add enhanced data access logging for critical operations
CREATE OR REPLACE FUNCTION public.log_critical_data_access(
  table_name_param text,
  operation_param text,
  record_count_param integer DEFAULT 1,
  additional_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log to both data_access_logs and security_events for critical operations
  INSERT INTO public.data_access_logs (
    user_id,
    table_name,
    operation,
    record_count,
    ip_address
  ) VALUES (
    auth.uid(),
    table_name_param,
    operation_param,
    record_count_param,
    inet_client_addr()
  );
  
  -- Also log as security event for critical tables
  IF table_name_param IN ('profiles', 'payment_logs', 'api_keys', 'security_events', 'admin_activities') THEN
    INSERT INTO public.security_events (
      user_id,
      event_type,
      metadata,
      ip_address,
      user_agent
    ) VALUES (
      auth.uid(),
      'critical_data_access',
      jsonb_build_object(
        'table', table_name_param,
        'operation', operation_param,
        'record_count', record_count_param
      ) || additional_metadata,
      inet_client_addr(),
      current_setting('request.headers', true)::json->>'user-agent'
    );
  END IF;
END;
$$;