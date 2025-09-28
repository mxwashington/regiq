-- Fix Critical Security Issues: Enable RLS on monitoring tables

-- 1. Enable RLS on data_freshness table
ALTER TABLE data_freshness ENABLE ROW LEVEL SECURITY;

-- 2. Create RLS policies for data_freshness
CREATE POLICY "Admins can view all data freshness records" 
ON data_freshness FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "System can manage data freshness records" 
ON data_freshness FOR ALL 
USING (true)
WITH CHECK (true);

-- 3. Enable RLS on pipeline_runs table  
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for pipeline_runs
CREATE POLICY "Admins can view all pipeline runs" 
ON pipeline_runs FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "System can manage pipeline runs" 
ON pipeline_runs FOR ALL 
USING (true)
WITH CHECK (true);

-- 5. Fix function search path issues by updating existing functions
CREATE OR REPLACE FUNCTION update_data_freshness_updated_at()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;