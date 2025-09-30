-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create scheduled job to run enhanced regulatory data collection every 4 hours
SELECT cron.schedule(
  'enhanced-regulatory-data-collection-job',
  '0 */4 * * *', -- Every 4 hours at minute 0
  $$
  SELECT net.http_post(
    url := 'https://piyikxxgoekawboitrzz.supabase.co/functions/v1/enhanced-regulatory-data-collection',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);

-- Update trigger function to use correct enhanced pipeline function name
CREATE OR REPLACE FUNCTION trigger_enhanced_data_pipeline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://piyikxxgoekawboitrzz.supabase.co/functions/v1/enhanced-regulatory-data-collection',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
    body := '{"manual_trigger": true}'::jsonb
  );
END;
$$;

-- Log the setup completion
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES (
  'enhanced_pipeline_scheduled',
  jsonb_build_object(
    'scheduled_at', now(),
    'cron_schedule', '0 */4 * * *',
    'function_name', 'enhanced-regulatory-data-collection',
    'setup_complete', true
  ),
  'Enhanced regulatory data collection pipeline scheduled and ready'
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();