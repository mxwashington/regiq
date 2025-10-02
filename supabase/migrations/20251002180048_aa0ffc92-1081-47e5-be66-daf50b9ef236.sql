-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule CDC RSS scraping every 6 hours (at 00:00, 06:00, 12:00, 18:00 UTC)
SELECT cron.schedule(
  'cdc-rss-scraper-every-6-hours',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://piyikxxgoekawboitrzz.supabase.co/functions/v1/multi-agency-rss-scraper',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
    body := '{"action": "scrape_cdc"}'::jsonb
  ) AS request_id;
  $$
);

-- Add comment explaining the cron schedule
COMMENT ON EXTENSION pg_cron IS 'Enables scheduled CDC RSS scraping every 6 hours to ensure fresh alert data';
