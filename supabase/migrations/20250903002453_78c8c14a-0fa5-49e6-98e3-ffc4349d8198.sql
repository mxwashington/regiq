-- Fix critical security vulnerabilities in RLS policies

-- 1. Fix alerts table - currently allows anyone to view all alerts
DROP POLICY IF EXISTS "Users can view all alerts" ON public.alerts;
CREATE POLICY "Authenticated users can view alerts" 
ON public.alerts 
FOR SELECT 
TO authenticated
USING (true);

-- 2. Fix data_sources table - should only be viewable by admins
DROP POLICY IF EXISTS "Authenticated users can view data sources" ON public.data_sources;
CREATE POLICY "Admins can view data sources" 
ON public.data_sources 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

-- 3. Fix search_cache table - restrict to user's own searches or admins
DROP POLICY IF EXISTS "Authenticated users can read search cache" ON public.search_cache;
CREATE POLICY "Admins can view search cache" 
ON public.search_cache 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

-- 4. Fix taxonomy_categories - restrict to authenticated users
DROP POLICY IF EXISTS "Users can view taxonomy categories" ON public.taxonomy_categories;
CREATE POLICY "Authenticated users can view taxonomy categories" 
ON public.taxonomy_categories 
FOR SELECT 
TO authenticated
USING (true);

-- 5. Fix taxonomy_tags - restrict to authenticated users  
DROP POLICY IF EXISTS "Users can view taxonomy tags" ON public.taxonomy_tags;
CREATE POLICY "Authenticated users can view taxonomy tags" 
ON public.taxonomy_tags 
FOR SELECT 
TO authenticated
USING (true);

-- 6. Fix demo_content - restrict to authenticated users or admins only
DROP POLICY IF EXISTS "Users can view active demo content" ON public.demo_content;
CREATE POLICY "Authenticated users can view demo content" 
ON public.demo_content 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- 7. Fix data_freshness - should only be viewable by admins
DROP POLICY IF EXISTS "Authenticated users can view data freshness" ON public.data_freshness;
CREATE POLICY "Admins can view data freshness" 
ON public.data_freshness 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

-- 8. Add missing RLS policy for tag_classifications view access
CREATE POLICY "Authenticated users can view tag classifications" 
ON public.tag_classifications 
FOR SELECT 
TO authenticated
USING (true);

-- 9. Ensure alert_tags has proper view policy for authenticated users
DROP POLICY IF EXISTS "Users can view alert tags" ON public.alert_tags;
DROP POLICY IF EXISTS "Users can view tag classifications" ON public.alert_tags;
CREATE POLICY "Authenticated users can view alert tags" 
ON public.alert_tags 
FOR SELECT 
TO authenticated
USING (true);