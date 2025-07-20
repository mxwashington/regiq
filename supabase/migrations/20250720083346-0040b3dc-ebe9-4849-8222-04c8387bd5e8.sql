-- Fix alerts table constraints and RLS policies
-- Add unique constraint for ON CONFLICT operations
ALTER TABLE public.alerts 
ADD CONSTRAINT alerts_title_source_published_unique 
UNIQUE (title, source, published_date);

-- Allow edge functions to insert alerts
CREATE POLICY "Edge functions can insert alerts" 
ON public.alerts 
FOR INSERT 
WITH CHECK (true);

-- Allow edge functions to update data_freshness
ALTER TABLE public.data_freshness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Edge functions can manage data freshness" 
ON public.data_freshness 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Allow edge functions to manage system_settings
CREATE POLICY "Edge functions can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (true)
WITH CHECK (true);