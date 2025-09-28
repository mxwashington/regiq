-- Remove conflicting cron jobs and clean up old data
-- First, check and remove any remaining conflicting cron jobs
SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname LIKE '%rss%' OR jobname LIKE '%feed%' OR jobname = 'refresh-rss-feeds';

-- Clean up old CDC Health Alert entries from the last 24 hours to make room for fresh data
DELETE FROM alerts WHERE source = 'CDC Health Alerts' AND created_at > now() - interval '24 hours';

-- Update data freshness to reset timestamps
UPDATE data_freshness SET 
  last_successful_fetch = now() - interval '4 hours',
  last_attempt = now() - interval '4 hours'
WHERE source_name IN ('EPA ECHO Enforcement', 'FSIS Meat & Poultry Recalls', 'FDA Warning Letters', 'Federal Register Rules');

-- Log the cleanup
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES (
  'pipeline_conflicts_resolved',
  jsonb_build_object(
    'resolved_at', now(),
    'old_cron_jobs_removed', true,
    'cdc_alerts_cleaned', true,
    'ready_for_enhanced_pipeline', true
  ),
  'Pipeline conflicts resolved - enhanced pipeline ready'
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();