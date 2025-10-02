-- Add external_id column to alerts table for proper deduplication
-- This allows us to track the original ID from source APIs (recall numbers, event IDs, etc.)

ALTER TABLE alerts 
ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Create index for fast duplicate checking
CREATE INDEX IF NOT EXISTS idx_alerts_source_external_id 
ON alerts(source, external_id) 
WHERE external_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN alerts.external_id IS 'Original identifier from the source API (e.g., FDA recall number, CDC event ID)';
