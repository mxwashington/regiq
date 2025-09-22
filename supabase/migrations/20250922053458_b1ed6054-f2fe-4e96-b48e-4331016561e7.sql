-- Create unified data sources table
CREATE TABLE unified_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  agency TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'US',
  source_type TEXT NOT NULL DEFAULT 'rss',
  url TEXT, -- From data_sources.url OR regulatory_data_sources.base_url
  base_url TEXT, -- Keep separate for regulatory_data_sources
  rss_feeds JSONB DEFAULT '[]'::jsonb,
  data_gov_org TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_fetched_at TIMESTAMP WITH TIME ZONE, -- From data_sources
  last_successful_fetch TIMESTAMP WITH TIME ZONE, -- From regulatory_data_sources
  fetch_interval INTEGER DEFAULT 3600, -- From data_sources (seconds)
  polling_interval_minutes INTEGER DEFAULT 60, -- From regulatory_data_sources (minutes)
  priority INTEGER DEFAULT 5,
  keywords JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE unified_data_sources ENABLE ROW LEVEL SECURITY;

-- Create policies for the unified table (combining both table policies)
CREATE POLICY "Admins can manage unified data sources" ON unified_data_sources FOR ALL 
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view unified data sources" ON unified_data_sources FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can access unified data sources for processing" ON unified_data_sources FOR SELECT 
USING (true);

-- Migrate data from data_sources table
INSERT INTO unified_data_sources (
  name, agency, region, source_type, url, is_active, 
  last_fetched_at, fetch_interval, metadata, created_at, updated_at
)
SELECT 
  name, agency, 'US' as region, source_type, url, is_active,
  last_fetched_at, fetch_interval, metadata, created_at, updated_at
FROM data_sources;

-- Migrate data from regulatory_data_sources table
INSERT INTO unified_data_sources (
  name, agency, region, source_type, base_url, rss_feeds, data_gov_org,
  is_active, last_successful_fetch, polling_interval_minutes, priority, 
  keywords, created_at, updated_at
)
SELECT 
  name, agency, region, source_type, base_url, rss_feeds, data_gov_org,
  is_active, last_successful_fetch, polling_interval_minutes, priority,
  keywords, created_at, updated_at
FROM regulatory_data_sources;

-- Drop the old tables
DROP TABLE data_sources CASCADE;
DROP TABLE regulatory_data_sources CASCADE;

-- Rename unified table to data_sources
ALTER TABLE unified_data_sources RENAME TO data_sources;

-- Create indexes for performance
CREATE INDEX idx_data_sources_agency ON data_sources (agency);
CREATE INDEX idx_data_sources_source_type ON data_sources (source_type);
CREATE INDEX idx_data_sources_is_active ON data_sources (is_active);
CREATE INDEX idx_data_sources_region ON data_sources (region);

-- Update the updated_at trigger
CREATE OR REPLACE FUNCTION update_data_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_data_sources_updated_at
  BEFORE UPDATE ON data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_data_sources_updated_at();