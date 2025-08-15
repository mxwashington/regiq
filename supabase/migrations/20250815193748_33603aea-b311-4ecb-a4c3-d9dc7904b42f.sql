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

-- Update search_analytics for privacy
DROP POLICY IF EXISTS "Admins can view all search analytics" ON public.search_analytics;

CREATE POLICY "Analytics admins can view search analytics" 
ON public.search_analytics 
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