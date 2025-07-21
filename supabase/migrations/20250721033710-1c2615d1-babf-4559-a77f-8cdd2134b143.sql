-- Remove redundant and outdated pipeline cron jobs
SELECT cron.unschedule('regulatory-data-pipeline');
SELECT cron.unschedule('rss-alert-scraper'); 
SELECT cron.unschedule('regulatory-feeds-scraper');

-- Schedule only the enhanced regulatory data pipeline every 15 minutes
SELECT cron.schedule(
  'enhanced-regulatory-data-pipeline',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://piyikxxgoekawboitrzz.supabase.co/functions/v1/enhanced-regulatory-data-pipeline',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);