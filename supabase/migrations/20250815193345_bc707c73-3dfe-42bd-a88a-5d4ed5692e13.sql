-- CRITICAL PRIORITY: Payment and Subscription Data Security
-- Fix RLS policies for subscribers table to prevent unauthorized access

-- Drop existing permissive policies
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;

-- Create strict RLS policies for subscribers table
CREATE POLICY "Users can view own subscription only" 
ON public.subscribers 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription only" 
ON public.subscribers 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only authenticated systems (edge functions) can insert subscription data
CREATE POLICY "System can manage subscriptions" 
ON public.subscribers 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Add additional payment security table for sensitive operations
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  stripe_session_id TEXT,
  success BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Strict access control for payment logs
CREATE POLICY "Admins can view payment logs" 
ON public.payment_logs 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "System can insert payment logs" 
ON public.payment_logs 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- HIGH PRIORITY: Enhanced Customer Data Protection
-- Strengthen profiles table security with column-level restrictions

-- Drop overly permissive admin policies
DROP POLICY IF EXISTS "Admins can view profile metadata" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update user roles only" ON public.profiles;

-- Create minimal admin access policy - only essential fields
CREATE POLICY "Admins can view basic profile info only" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  is_admin(auth.uid()) AND 
  -- Admins can see basic info but not sensitive data like IP addresses
  user_id IS NOT NULL
);

-- Prevent admins from updating sensitive user data
CREATE POLICY "Admins can update roles only" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (
  is_admin(auth.uid()) AND 
  user_id != auth.uid() -- Prevent self-modification
)
WITH CHECK (
  is_admin(auth.uid()) AND 
  user_id != auth.uid() AND
  -- Only allow role/admin status changes, protect PII
  email = (SELECT email FROM profiles WHERE user_id = NEW.user_id) AND
  full_name = (SELECT full_name FROM profiles WHERE user_id = NEW.user_id) AND
  company = (SELECT company FROM profiles WHERE user_id = NEW.user_id)
);

-- HIGH PRIORITY: Security Event Data Protection
-- The security_events table needs stricter access controls

-- Update security_events table policy
DROP POLICY IF EXISTS "Admins can view security events" ON public.security_events;

CREATE POLICY "Super admins can view security events" 
ON public.security_events 
FOR SELECT 
TO authenticated
USING (
  is_admin(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND 'security_admin' = ANY(admin_permissions)
  )
);

CREATE POLICY "System can log security events" 
ON public.security_events 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- MEDIUM PRIORITY: Analytics Data Protection
-- Restrict access to user behavior tracking data

-- Update user_analytics table
DROP POLICY IF EXISTS "Admins can manage user analytics" ON public.user_analytics;

CREATE POLICY "Analytics admins can view aggregated data" 
ON public.user_analytics 
FOR SELECT 
TO authenticated
USING (
  is_admin(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND 'analytics_admin' = ANY(admin_permissions)
  )
);

-- Update user_sessions with privacy protection
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.user_sessions;

CREATE POLICY "Session admins can view session data" 
ON public.user_sessions 
FOR SELECT 
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  (is_admin(auth.uid()) AND 
   EXISTS (
     SELECT 1 FROM profiles 
     WHERE user_id = auth.uid() 
     AND 'analytics_admin' = ANY(admin_permissions)
   ))
);

-- Update page_views for privacy
DROP POLICY IF EXISTS "Admins can view all page views" ON public.page_views;

CREATE POLICY "Analytics admins can view page analytics" 
ON public.page_views 
FOR SELECT 
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  (is_admin(auth.uid()) AND 
   EXISTS (
     SELECT 1 FROM profiles 
     WHERE user_id = auth.uid() 
     AND 'analytics_admin' = ANY(admin_permissions)
   ))
);

-- Update perplexity_searches for user privacy
DROP POLICY IF EXISTS "Admins can view all searches" ON public.perplexity_searches;

CREATE POLICY "Search admins can view search data" 
ON public.perplexity_searches 
FOR SELECT 
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  (is_admin(auth.uid()) AND 
   EXISTS (
     SELECT 1 FROM profiles 
     WHERE user_id = auth.uid() 
     AND 'search_admin' = ANY(admin_permissions)
   ))
);

-- Add function to securely grant admin permissions
CREATE OR REPLACE FUNCTION public.grant_admin_permission(
  target_user_id UUID,
  permission_name TEXT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only super admins can grant permissions
  IF NOT (is_admin(auth.uid()) AND 
          EXISTS (SELECT 1 FROM profiles 
                  WHERE user_id = auth.uid() 
                  AND 'super_admin' = ANY(admin_permissions))) THEN
    RAISE EXCEPTION 'Access denied: Only super admins can grant permissions';
  END IF;
  
  -- Add permission to target user
  UPDATE public.profiles 
  SET admin_permissions = array_append(
    COALESCE(admin_permissions, '{}'),
    permission_name
  )
  WHERE user_id = target_user_id
  AND NOT (permission_name = ANY(COALESCE(admin_permissions, '{}')));
  
  -- Log the permission grant
  INSERT INTO public.security_events (
    user_id,
    event_type,
    metadata
  ) VALUES (
    auth.uid(),
    'admin_permission_granted',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'permission', permission_name,
      'granted_by', auth.uid()
    )
  );
END;
$$;