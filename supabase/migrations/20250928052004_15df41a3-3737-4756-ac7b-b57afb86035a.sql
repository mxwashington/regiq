-- Phase 1: Database Schema Updates - Clean Up and Setup

-- 1. Add missing columns to data_sources table
ALTER TABLE data_sources 
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS agency text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS polling_interval_minutes integer DEFAULT 120,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 2. Add unique constraint on name first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'unique_data_sources_name' 
                   AND table_name = 'data_sources') THEN
        ALTER TABLE data_sources ADD CONSTRAINT unique_data_sources_name UNIQUE (name);
    END IF;
END $$;

-- 3. Insert/update initial data sources (now that unique constraint exists)
INSERT INTO data_sources (name, agency, source_type, url, is_active, priority, polling_interval_minutes, metadata)
VALUES 
  ('EPA ECHO Enforcement', 'EPA', 'epa_echo', 'https://echo.epa.gov/echo/case_rest_services.get_cases', true, 8, 240, '{}'::jsonb),
  ('FSIS Meat & Poultry Recalls', 'FSIS', 'rss_fsis', 'https://www.fsis.usda.gov/wps/wcm/connect/fsis-content/internet/main/topics/recalls-and-public-health-alerts/recall-summaries/rss', true, 9, 60, '{}'::jsonb),
  ('FDA Warning Letters', 'FDA', 'fda_compliance', 'https://datadashboard.fda.gov/ora/api/complianceactions.json', true, 9, 120, '{}'::jsonb),
  ('FDA Form 483 Observations', 'FDA', 'fda_compliance', 'https://datadashboard.fda.gov/ora/api/inspections.json', true, 7, 240, '{"document_type": "483"}'::jsonb),
  ('Federal Register Rules', 'Federal Register', 'federal_register', 'https://www.federalregister.gov/api/v1/articles.json', true, 7, 240, '{}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  agency = EXCLUDED.agency,
  source_type = EXCLUDED.source_type,
  url = EXCLUDED.url,
  is_active = EXCLUDED.is_active,
  priority = EXCLUDED.priority,
  polling_interval_minutes = EXCLUDED.polling_interval_minutes,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- 4. Create monitoring tables

-- Data freshness tracking with error count
CREATE TABLE IF NOT EXISTS data_freshness (
  source_name text PRIMARY KEY,
  fetch_status text NOT NULL DEFAULT 'pending',
  last_successful_fetch timestamptz,
  last_attempt timestamptz NOT NULL DEFAULT now(),
  records_fetched integer DEFAULT 0,
  error_message text,
  last_error_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Pipeline run logs  
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  sources_attempted integer DEFAULT 0,
  sources_succeeded integer DEFAULT 0,
  sources_failed integer DEFAULT 0,
  error_summary text,
  details jsonb DEFAULT '{}'::jsonb
);

-- 5. Clean up orphaned records in data_freshness before adding foreign key
DELETE FROM data_freshness 
WHERE source_name NOT IN (SELECT name FROM data_sources WHERE name IS NOT NULL);

-- 6. Add foreign key constraint now that tables are clean
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_data_freshness_source' 
                   AND table_name = 'data_freshness') THEN
        ALTER TABLE data_freshness 
          ADD CONSTRAINT fk_data_freshness_source 
          FOREIGN KEY (source_name) REFERENCES data_sources(name)
          ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_sources_active ON data_sources(is_active, priority);
CREATE INDEX IF NOT EXISTS idx_data_freshness_status ON data_freshness(fetch_status, last_attempt);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status, started_at);

-- 8. Fix existing Federal Register attribution  
UPDATE alerts 
SET agency = 'Federal Register' 
WHERE source = 'Federal Register' 
  AND (agency IS NULL OR agency != 'Federal Register');

-- 9. Update updated_at trigger for data_freshness
CREATE OR REPLACE FUNCTION update_data_freshness_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_data_freshness_updated_at ON data_freshness;
CREATE TRIGGER trigger_data_freshness_updated_at
  BEFORE UPDATE ON data_freshness
  FOR EACH ROW
  EXECUTE FUNCTION update_data_freshness_updated_at();