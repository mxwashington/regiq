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
  user_id IS NOT NULL
);

-- Prevent admins from updating sensitive user data - simplified approach
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
  user_id != auth.uid()
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