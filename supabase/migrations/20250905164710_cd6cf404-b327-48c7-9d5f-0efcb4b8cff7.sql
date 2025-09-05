-- Phase 1: Critical Data Access Controls Security Fixes (Corrected)

-- 1. Strengthen Profile RLS Policies - Remove overlapping policies and create consolidated secure access
DROP POLICY IF EXISTS "secure_profile_access" ON public.profiles;
DROP POLICY IF EXISTS "secure_profile_access_only" ON public.profiles;

-- Create single, secure profile access policy
CREATE POLICY "consolidated_secure_profile_access" ON public.profiles
FOR ALL 
USING (
  (auth.uid() = user_id AND auth.jwt() IS NOT NULL) OR 
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'super_admin'))
)
WITH CHECK (
  (auth.uid() = user_id AND auth.jwt() IS NOT NULL) OR 
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'super_admin'))
);

-- 2. Secure Team Member Access - Restrict visibility and prevent email harvesting
DROP POLICY IF EXISTS "Team members can view team only if they're owner or member" ON public.team_members;

CREATE POLICY "secure_team_member_access" ON public.team_members
FOR SELECT
USING (
  -- Only team owner or confirmed team members can view, with logging
  (
    (auth.uid() = team_owner) OR 
    (
      member_email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND 
      status = 'active'
    )
  ) AND 
  -- Log sensitive team member data access
  (SELECT log_sensitive_data_access('team_members', 'SELECT', 1, ARRAY['member_email', 'member_name']))
);

-- 3. Harden Financial Data Access - Restrict to billing admins only

-- Create payment_logs table if it doesn't exist (for security policy)
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  amount decimal,
  currency text DEFAULT 'USD',
  status text,
  stripe_payment_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on payment_logs
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

-- Create secure payment logs policy
CREATE POLICY "billing_admins_only_payment_logs" ON public.payment_logs
FOR ALL
USING (
  (user_id = auth.uid()) OR 
  (
    is_admin(auth.uid()) AND 
    has_admin_permission(auth.uid(), 'billing_admin') AND
    -- Business hours restriction for admin access
    EXTRACT(HOUR FROM NOW()) BETWEEN 8 AND 18
  )
)
WITH CHECK (
  (user_id = auth.uid()) OR 
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'billing_admin'))
);

-- Update subscribers policy for billing admins only
DROP POLICY IF EXISTS "Admins can view all subscriptions for support" ON public.subscribers;

CREATE POLICY "billing_admins_view_subscriptions" ON public.subscribers
FOR SELECT
USING (
  (user_id = auth.uid()) OR 
  (
    is_admin(auth.uid()) AND 
    has_admin_permission(auth.uid(), 'billing_admin') AND
    -- Log financial data access
    (SELECT log_security_event_enhanced(
      'financial_data_access',
      jsonb_build_object(
        'table', 'subscribers',
        'operation', 'SELECT',
        'admin_user_id', auth.uid(),
        'access_time', now()
      ),
      'high'
    )) IS NOT NULL
  )
);

-- 4. Secure API Key Operations - Add enhanced logging for API key access
CREATE OR REPLACE FUNCTION secure_api_key_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log API key access attempts
  PERFORM log_security_event_enhanced(
    'api_key_access',
    jsonb_build_object(
      'user_id', auth.uid(),
      'access_time', now(),
      'ip_address', inet_client_addr()
    ),
    'medium'
  );
  
  -- Only allow API key access to admins or enterprise users
  RETURN (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.subscribers 
      WHERE user_id = auth.uid() 
      AND subscription_tier = 'enterprise' 
      AND subscribed = true
    )
  );
END;
$$;