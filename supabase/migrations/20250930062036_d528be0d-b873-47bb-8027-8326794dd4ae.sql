-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule USDA ARMS scraper to run daily at 6 AM UTC
SELECT cron.schedule(
  'usda-arms-daily-sync',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://piyikxxgoekawboitrzz.supabase.co/functions/v1/usda-arms-scraper',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);

-- Schedule USDA FoodData scraper to run daily at 6:30 AM UTC
SELECT cron.schedule(
  'usda-fooddata-daily-sync',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://piyikxxgoekawboitrzz.supabase.co/functions/v1/usda-fooddata-scraper',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);