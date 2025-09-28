-- Fix the primary issue: Update data classification constraint to allow new source types
-- This will fix the pipeline failing to save new alerts

-- First, check what values are currently failing
-- From the logs, we see Federal Register alerts are being blocked by the constraint

-- Update the constraint to allow more data classification types
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_data_classification_check;

-- Add new constraint that allows the values the pipeline is trying to use
ALTER TABLE alerts ADD CONSTRAINT alerts_data_classification_check 
CHECK (data_classification IN ('demo', 'live', 'production', 'federal_register', 'epa', 'fda', 'fsis', 'usda'));

-- Update existing Federal Register alerts to have proper classification
UPDATE alerts 
SET data_classification = 'live' 
WHERE source LIKE '%Federal Register%' AND data_classification = 'USDA';

-- Reset data freshness for immediate pipeline retry
UPDATE data_freshness 
SET 
  last_successful_fetch = now() - interval '6 hours',
  last_attempt = now() - interval '6 hours',
  fetch_status = 'pending',
  error_message = 'Reset for pipeline fix - constraint resolved'
WHERE source_name IN ('EPA ECHO Enforcement', 'FSIS Meat & Poultry Recalls', 'FDA Warning Letters', 'Federal Register Rules');

-- Log the critical fix
INSERT INTO app_settings (setting_key, setting_value, description)
VALUES (
  'pipeline_constraint_fixed',
  jsonb_build_object(
    'fixed_at', now(),
    'constraint_updated', true,
    'data_classification_expanded', true,
    'pipeline_unblocked', true,
    'expected_new_alerts', 'immediate'
  ),
  'CRITICAL FIX: Database constraint blocking pipeline resolved'
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();