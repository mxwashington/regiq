
-- Set up automated data collection with cron jobs
-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the regulatory data pipeline to run every 15 minutes
SELECT cron.schedule(
  'regulatory-data-pipeline',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://piyikxxgoekawboitrzz.supabase.co/functions/v1/regulatory-data-pipeline',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Schedule the RSS alert scraper to run every 30 minutes
SELECT cron.schedule(
  'rss-alert-scraper',
  '*/30 * * * *', -- Every 30 minutes
  $$
  SELECT
    net.http_post(
        url:='https://piyikxxgoekawboitrzz.supabase.co/functions/v1/rss-alert-scraper',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Schedule the regulatory feeds scraper to run every hour
SELECT cron.schedule(
  'regulatory-feeds-scraper',
  '0 * * * *', -- Every hour
  $$
  SELECT
    net.http_post(
        url:='https://piyikxxgoekawboitrzz.supabase.co/functions/v1/regulatory-feeds-scraper',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Clean up old alerts (keep only last 90 days) and optimize database
SELECT cron.schedule(
  'cleanup-old-alerts',
  '0 2 * * *', -- Daily at 2 AM
  $$
  -- Clean old alerts (keep last 90 days)
  DELETE FROM public.alerts WHERE published_date < NOW() - INTERVAL '90 days';
  
  -- Clean expired cache
  DELETE FROM public.search_cache WHERE expires_at < NOW() - INTERVAL '1 day';
  
  -- Clean old system settings for pipeline runs (keep last 30 days)
  DELETE FROM public.system_settings 
  WHERE setting_key LIKE 'last_run_%' 
  AND (setting_value->>'timestamp')::bigint < EXTRACT(epoch FROM NOW() - INTERVAL '30 days') * 1000;
  $$
);

-- Mark existing test/dummy data for easier identification
UPDATE public.alerts 
SET summary = '[TEST DATA] ' || summary 
WHERE source IN ('Test Agency', 'Demo Source', 'Sample') 
   OR title ILIKE '%test%' 
   OR title ILIKE '%demo%' 
   OR title ILIKE '%sample%'
   OR summary ILIKE '%test%'
   OR summary ILIKE '%demo%'
   OR summary ILIKE '%sample%';

-- Add data freshness tracking table
CREATE TABLE IF NOT EXISTS public.data_freshness (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_name TEXT NOT NULL,
  last_successful_fetch TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fetch_status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  records_fetched INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on data freshness table
ALTER TABLE public.data_freshness ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage data freshness
CREATE POLICY "Admins can manage data freshness" 
  ON public.data_freshness 
  FOR ALL 
  USING (is_admin(auth.uid()));

-- Allow users to view data freshness
CREATE POLICY "Users can view data freshness" 
  ON public.data_freshness 
  FOR SELECT 
  USING (true);

-- Insert initial data freshness records
INSERT INTO public.data_freshness (source_name, fetch_status, records_fetched) VALUES
('FDA', 'pending', 0),
('USDA', 'pending', 0),
('EPA', 'pending', 0),
('CDC', 'pending', 0),
('OSHA', 'pending', 0),
('FTC', 'pending', 0)
ON CONFLICT DO NOTHING;
