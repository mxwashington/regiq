-- R-002: Update admin permissions for marcus@regiq.org (fixed approach)
-- First, remove admin status from old email if it exists
UPDATE public.profiles 
SET is_admin = false, role = 'user', admin_permissions = '{}' 
WHERE email = 'marcus@fsqahelp.org';

-- Update profiles table if marcus@regiq.org already exists, or create entry
DO $$
BEGIN
  -- Try to update existing profile
  UPDATE public.profiles 
  SET is_admin = true,
      role = 'admin',
      admin_permissions = ARRAY['super_admin', 'security_admin', 'billing_admin', 'analytics_admin'],
      subscription_status = 'admin',
      full_name = COALESCE(full_name, 'Marcus RegIQ Admin')
  WHERE email = 'marcus@regiq.org';
  
  -- If no rows were updated, the profile doesn't exist yet
  -- This will be handled when the user first signs up with this email
  -- The trigger function will create the profile automatically
END $$;

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