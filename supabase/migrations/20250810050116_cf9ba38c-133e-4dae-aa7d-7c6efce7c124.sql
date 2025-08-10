-- Schedule the daily digest at 12:00 UTC (~7 AM ET during DST)
-- Requires pg_cron and pg_net to be enabled in the project
select
  cron.schedule(
    'regiq-daily-digest-12utc',
    '0 12 * * *',
    $$
    select net.http_post(
      url := 'https://piyikxxgoekawboitrzz.supabase.co/functions/v1/send-daily-digest',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpeWlreHhnb2VrYXdib2l0cnp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MDM2MjUsImV4cCI6MjA2ODQ3OTYyNX0.YfgCG-BorBSfyXk4MdIxko9AHT4-ef0MfO24rCpjy94"}'::jsonb,
      body := '{}'::jsonb
    );
    $$
  );