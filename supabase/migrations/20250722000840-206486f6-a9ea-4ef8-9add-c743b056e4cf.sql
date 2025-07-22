-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the source finder to run every 6 hours
SELECT cron.schedule(
  'find-alert-sources',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT
    net.http_post(
        url:='https://your-project-ref.supabase.co/functions/v1/scheduled-source-finder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{"automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Create a log table to track source finding jobs
CREATE TABLE IF NOT EXISTS public.source_finder_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  processed INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.source_finder_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for admins only
CREATE POLICY "Admins can view source finder logs" ON public.source_finder_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create a function to log source finder results
CREATE OR REPLACE FUNCTION public.log_source_finder_result(
  processed_count INTEGER,
  updated_count INTEGER,
  status_text TEXT,
  error_text TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.source_finder_logs (processed, updated, status, error_message)
  VALUES (processed_count, updated_count, status_text, error_text);
END;
$$;