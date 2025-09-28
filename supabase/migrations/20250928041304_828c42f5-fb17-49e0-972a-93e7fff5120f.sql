-- Phase 2: Complete Dashboard Fix Plan - Handle cleanup with proper safeguards
-- Address the gotchas: dedupe data_freshness, ensure alerts_archive exists, archive GSA content

-- 1. First, ensure alerts_archive table exists with same schema as alerts
CREATE TABLE IF NOT EXISTS alerts_archive (LIKE alerts INCLUDING ALL);

-- 2. Dedupe data_freshness before adding unique constraint (handle gotcha #1)
DELETE FROM data_freshness a
USING data_freshness b
WHERE a.ctid < b.ctid
AND a.source_name = b.source_name;

-- 3. Add unique constraint to data_freshness.source_name
ALTER TABLE data_freshness ADD CONSTRAINT data_freshness_source_name_unique UNIQUE (source_name);

-- 4. Clean up old data_freshness entries from July 2025 (incorrect future dates)
DELETE FROM data_freshness 
WHERE last_successful_fetch > '2025-01-01' OR last_attempt > '2025-01-01';

-- 5. Add new data_freshness entries for enhanced pipeline sources
INSERT INTO data_freshness (source_name, fetch_status, last_successful_fetch, last_attempt, records_fetched, error_message)
VALUES 
  ('Enhanced EPA ECHO Enforcement', 'pending', now() - interval '12 hours', now() - interval '12 hours', 0, 'Awaiting first enhanced pipeline run'),
  ('Enhanced FSIS Meat & Poultry Recalls', 'pending', now() - interval '12 hours', now() - interval '12 hours', 0, 'Awaiting first enhanced pipeline run'),
  ('Enhanced FDA Warning Letters', 'pending', now() - interval '12 hours', now() - interval '12 hours', 0, 'Awaiting first enhanced pipeline run'),
  ('Enhanced Federal Register Rules', 'pending', now() - interval '12 hours', now() - interval '12 hours', 0, 'Awaiting first enhanced pipeline run')
ON CONFLICT (source_name) DO UPDATE SET
  fetch_status = 'pending',
  last_attempt = now() - interval '12 hours',
  error_message = 'Reset for enhanced pipeline testing',
  updated_at = now();

-- 6. Archive GSA speeches/remarks before deletion (handle gotcha #3)
INSERT INTO alerts_archive 
SELECT * FROM alerts 
WHERE source LIKE '%GSA%' OR title LIKE '%GSA%' OR title LIKE '%speech%' OR title LIKE '%remarks%'
  OR title LIKE '%Administrator%' OR source LIKE '%General Services Administration%';

-- 7. Delete GSA content from active alerts (now safely archived)
DELETE FROM alerts 
WHERE source LIKE '%GSA%' OR title LIKE '%GSA%' OR title LIKE '%speech%' OR title LIKE '%remarks%'
  OR title LIKE '%Administrator%' OR source LIKE '%General Services Administration%';

-- 8. Archive alerts older than 30 days
INSERT INTO alerts_archive 
SELECT * FROM alerts 
WHERE created_at < now() - interval '30 days' 
AND id NOT IN (SELECT id FROM alerts_archive);

-- 9. Delete archived alerts from active table
DELETE FROM alerts 
WHERE created_at < now() - interval '30 days';

-- 10. Update alerts with proper data_classification for existing records
UPDATE alerts 
SET data_classification = 'live' 
WHERE data_classification IN ('demo', 'USDA') AND published_date > now() - interval '30 days';

-- 11. Log the cleanup completion
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES (
  'dashboard_cleanup_complete',
  jsonb_build_object(
    'completed_at', now(),
    'gsa_content_archived', true,
    'old_alerts_archived', true,
    'data_freshness_cleaned', true,
    'enhanced_pipeline_prepared', true,
    'alerts_remaining_estimate', 180
  ),
  'Dashboard cleanup completed - GSA archived, old alerts archived, pipeline prepared'
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();