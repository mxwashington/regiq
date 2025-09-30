-- Set up automatic scheduling for enhanced data pipeline
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing cron jobs for old pipeline
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname LIKE '%regulatory%' OR jobname LIKE '%pipeline%';

-- Schedule enhanced data collection to run every 2 hours
SELECT cron.schedule(
  'enhanced-regulatory-data-collection',
  '0 */2 * * *', -- Every 2 hours at the top of the hour
  $$
  SELECT
    net.http_post(
        url:='https://piyikxxgoekawboitrzz.supabase.co/functions/v1/enhanced-regulatory-data-collection',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
        body:=jsonb_build_object('scheduled_trigger', true, 'timestamp', now())
    ) as request_id;
  $$
);

-- Log the pipeline activation
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES (
  'enhanced_pipeline_activated',
  jsonb_build_object(
    'activated_at', now(),
    'schedule', 'Every 2 hours',
    'function_name', 'enhanced-regulatory-data-collection',
    'replaces', 'regulatory-data-pipeline'
  ),
  'Enhanced data pipeline is now live and scheduled'
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();