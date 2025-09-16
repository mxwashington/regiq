-- R-002: Update admin permissions for marcus@regiq.org
-- Update existing admin email references and set proper admin status

-- First, remove admin status from old email if it exists
UPDATE public.profiles 
SET is_admin = false, role = 'user', admin_permissions = '{}' 
WHERE email = 'marcus@fsqahelp.org';

-- Set admin status for correct email
INSERT INTO public.profiles (user_id, email, full_name, is_admin, role, admin_permissions, subscription_status)
VALUES (
  gen_random_uuid(), 
  'marcus@regiq.org', 
  'Marcus RegIQ Admin',
  true, 
  'admin', 
  ARRAY['super_admin', 'security_admin', 'billing_admin', 'analytics_admin'],
  'admin'
) ON CONFLICT (email) DO UPDATE SET
  is_admin = true,
  role = 'admin',
  admin_permissions = ARRAY['super_admin', 'security_admin', 'billing_admin', 'analytics_admin'],
  subscription_status = 'admin';

-- Create function to ensure admin users bypass all restrictions
CREATE OR REPLACE FUNCTION public.is_regiq_admin(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE email = user_email 
    AND (is_admin = true OR role = 'admin')
    AND email = 'marcus@regiq.org'
  );
$$;