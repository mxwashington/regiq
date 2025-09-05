-- Phase 1: Critical Data Access Controls Security Fixes

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

-- Add policy to prevent self-modification of admin permissions
CREATE POLICY "prevent_self_admin_modification" ON public.profiles
FOR UPDATE
USING (
  -- Allow updates but prevent self-modification of admin fields
  auth.uid() = user_id AND 
  (
    -- If changing admin fields, must be super admin and not self
    CASE WHEN 
      NEW.role IS DISTINCT FROM OLD.role OR 
      NEW.is_admin IS DISTINCT FROM OLD.is_admin OR 
      NEW.admin_permissions IS DISTINCT FROM OLD.admin_permissions
    THEN 
      is_admin(auth.uid()) AND 
      has_admin_permission(auth.uid(), 'super_admin') AND 
      auth.uid() != user_id
    ELSE true
    END
  )
);

-- 2. Secure Team Member Access - Restrict visibility and prevent email harvesting
DROP POLICY IF EXISTS "Team members can view team only if they're owner or member" ON public.team_members;

CREATE POLICY "secure_team_member_access" ON public.team_members
FOR SELECT
USING (
  -- Only team owner or confirmed team members can view
  (auth.uid() = team_owner) OR 
  (
    member_email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND 
    status = 'active'
  )
);

-- Add policy to log team member data access
CREATE POLICY "log_team_member_access" ON public.team_members
FOR SELECT
USING (
  -- Log access to sensitive team data
  (SELECT log_sensitive_data_access('team_members', 'SELECT', 1, ARRAY['member_email', 'member_name'])) AND
  (
    (auth.uid() = team_owner) OR 
    (member_email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND status = 'active')
  )
);

-- 3. Harden Financial Data Access - Restrict to billing admins only
-- Update payment_logs policy (if exists)
DROP POLICY IF EXISTS "Admins can view payment logs" ON public.payment_logs;
CREATE POLICY "billing_admins_only_payment_logs" ON public.payment_logs
FOR ALL
USING (
  is_admin(auth.uid()) AND 
  has_admin_permission(auth.uid(), 'billing_admin')
)
WITH CHECK (
  is_admin(auth.uid()) AND 
  has_admin_permission(auth.uid(), 'billing_admin')
);

-- Update subscribers policy for billing admins
DROP POLICY IF EXISTS "Admins can view all subscriptions for support" ON public.subscribers;
CREATE POLICY "billing_admins_view_subscriptions" ON public.subscribers
FOR SELECT
USING (
  (user_id = auth.uid()) OR 
  (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'billing_admin'))
);

-- Add time-based access restriction for payment data (business hours only)
CREATE POLICY "payment_data_business_hours" ON public.payment_logs
FOR SELECT
USING (
  (user_id = auth.uid()) OR 
  (
    is_admin(auth.uid()) AND 
    has_admin_permission(auth.uid(), 'billing_admin') AND
    EXTRACT(HOUR FROM NOW()) BETWEEN 8 AND 18 -- Business hours 8 AM - 6 PM
  )
);

-- 4. Enhanced Security Event Logging for Financial Data
CREATE OR REPLACE FUNCTION log_financial_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to financial tables
  PERFORM log_security_event_enhanced(
    'financial_data_access',
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'user_id', auth.uid(),
      'record_count', 1,
      'access_time', now()
    ),
    'high'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply financial data logging triggers
CREATE TRIGGER log_payment_access
  AFTER SELECT ON public.payment_logs
  FOR EACH ROW
  EXECUTE FUNCTION log_financial_data_access();

CREATE TRIGGER log_subscriber_access
  AFTER SELECT ON public.subscribers
  FOR EACH ROW
  EXECUTE FUNCTION log_financial_data_access();