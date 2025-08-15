-- Add data classification to alerts table
ALTER TABLE public.alerts 
ADD COLUMN IF NOT EXISTS data_classification text DEFAULT 'demo' 
CHECK (data_classification IN ('demo', 'production', 'sample'));

-- Add data access monitoring
CREATE TABLE IF NOT EXISTS public.data_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  table_name text NOT NULL,
  operation text NOT NULL, -- 'SELECT', 'BULK_EXPORT', etc.
  record_count integer DEFAULT 1,
  ip_address inet,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on data access logs
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;

-- Only security admins can view access logs
CREATE POLICY "Security admins can view data access logs" 
ON public.data_access_logs 
FOR SELECT 
USING (
  is_admin(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND 'security_admin' = ANY(admin_permissions)
  )
);

-- System can insert access logs
CREATE POLICY "System can log data access" 
ON public.data_access_logs 
FOR INSERT 
WITH CHECK (true);