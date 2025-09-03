-- Security Fix: Update RLS policies to require authentication for sensitive data

-- 1. Update alerts table - require authentication for SELECT
DROP POLICY IF EXISTS "Authenticated users can view alerts" ON public.alerts;
CREATE POLICY "Authenticated users can view alerts" 
ON public.alerts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. Update regulatory_data_sources - require authentication for SELECT
DROP POLICY IF EXISTS "Authenticated users can view regulatory data sources" ON public.regulatory_data_sources;
CREATE POLICY "Authenticated users can view regulatory data sources" 
ON public.regulatory_data_sources 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

-- 3. Update taxonomy_categories - require authentication for SELECT
DROP POLICY IF EXISTS "Authenticated users can view taxonomy categories" ON public.taxonomy_categories;
CREATE POLICY "Authenticated users can view taxonomy categories" 
ON public.taxonomy_categories 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 4. Update taxonomy_tags - require authentication for SELECT
DROP POLICY IF EXISTS "Authenticated users can view taxonomy tags" ON public.taxonomy_tags;
CREATE POLICY "Authenticated users can view taxonomy tags" 
ON public.taxonomy_tags 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 5. Update demo_content - require authentication for SELECT
DROP POLICY IF EXISTS "Authenticated users can view demo content" ON public.demo_content;
CREATE POLICY "Authenticated users can view demo content" 
ON public.demo_content 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_active = true);

-- 6. Update alert_tags - require authentication for SELECT
DROP POLICY IF EXISTS "Authenticated users can view alert tags" ON public.alert_tags;
CREATE POLICY "Authenticated users can view alert tags" 
ON public.alert_tags 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 7. Update tag_classifications - require authentication for SELECT
DROP POLICY IF EXISTS "Authenticated users can view tag classifications" ON public.tag_classifications;
CREATE POLICY "Authenticated users can view tag classifications" 
ON public.tag_classifications 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 8. Add data access logging for sensitive operations
CREATE OR REPLACE FUNCTION public.log_data_access_attempt(
  table_name_param text,
  operation_param text,
  record_count_param integer DEFAULT 1
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
END;
$$;