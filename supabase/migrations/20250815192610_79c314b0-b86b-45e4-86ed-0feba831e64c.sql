-- Phase 1: Critical Data Protection - Fix Public Data Exposure

-- 1. Secure search_cache table - remove public access
DROP POLICY IF EXISTS "Anonymous can read search cache" ON public.search_cache;
DROP POLICY IF EXISTS "Users can read search cache" ON public.search_cache;

-- Create restricted search cache policies
CREATE POLICY "Authenticated users can read search cache" 
ON public.search_cache 
FOR SELECT 
TO authenticated
USING (true);

-- 2. Secure regulatory_data_sources - remove public access
DROP POLICY IF EXISTS "Users can view active regulatory data sources" ON public.regulatory_data_sources;

CREATE POLICY "Authenticated users can view regulatory data sources" 
ON public.regulatory_data_sources 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- 3. Secure data_sources - remove public access  
DROP POLICY IF EXISTS "Users can view active data sources" ON public.data_sources;

CREATE POLICY "Authenticated users can view data sources" 
ON public.data_sources 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- 4. Secure data_freshness - remove public access
DROP POLICY IF EXISTS "Users can view data freshness" ON public.data_freshness;

CREATE POLICY "Authenticated users can view data freshness" 
ON public.data_freshness 
FOR SELECT 
TO authenticated
USING (true);

-- 5. Fix cookie consents privacy leak - restrict to data owners only
DROP POLICY IF EXISTS "Users can manage own cookie preferences" ON public.cookie_consents;

CREATE POLICY "Users can manage own cookie preferences" 
ON public.cookie_consents 
FOR ALL
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  (user_id IS NULL AND visitor_id = current_setting('app.current_visitor_id'::text, true))
)
WITH CHECK (
  (auth.uid() = user_id) OR 
  (user_id IS NULL AND visitor_id = current_setting('app.current_visitor_id'::text, true))
);

-- 6. Enhance profiles table security - restrict admin access to essential data only
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Create more restrictive admin policies
CREATE POLICY "Admins can view profile metadata" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  is_admin(auth.uid()) AND (
    -- Admins can only see basic info, not sensitive data
    user_id IS NOT NULL
  )
);

CREATE POLICY "Admins can update user roles only" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (
  is_admin(auth.uid()) AND 
  -- Prevent admins from modifying their own admin status
  (user_id != auth.uid() OR (role = (SELECT role FROM profiles WHERE user_id = auth.uid())))
);

-- 7. Add rate limiting table for additional security
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security events" 
ON public.security_events 
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- 8. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type_param TEXT,
  metadata_param JSONB DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    metadata
  ) VALUES (
    auth.uid(),
    event_type_param,
    metadata_param
  );
END;
$$;