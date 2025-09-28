-- Pause CDC Health Alerts feed specifically (targeted approach)
UPDATE data_sources
SET is_active = false,
    updated_at = now(),
    last_error = 'Paused: CDC Health Alerts feed creates redundant data - use FDA direct feeds instead'
WHERE name ILIKE '%CDC Health Alerts%' 
   OR name ILIKE '%health alerts%'
   OR (agency = 'CDC' AND name ILIKE '%alert%');

-- Create rollback script record for easy recovery
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES (
  'cdc_health_alerts_rollback',
  jsonb_build_object(
    'rollback_sql', 'UPDATE data_sources SET is_active = true, updated_at = now(), last_error = null WHERE name ILIKE ''%CDC Health Alerts%'' OR name ILIKE ''%health alerts%'' OR (agency = ''CDC'' AND name ILIKE ''%alert%'');',
    'paused_at', now(),
    'reason', 'Redundant data - use FDA feeds instead'
  ),
  'Rollback script to re-enable CDC Health Alerts if needed'
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();