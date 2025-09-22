-- Clean up existing Regulations.gov implementation
DROP TABLE IF EXISTS regulatory_data_sources CASCADE;
DROP TABLE IF EXISTS tag_classifications CASCADE;

-- Create new regulatory updates table as specified
CREATE TABLE IF NOT EXISTS regulatory_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  agency TEXT NOT NULL,
  posted_date DATE,
  summary TEXT,
  consumer_impact TEXT,
  family_action TEXT,
  document_type TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_regulatory_updates_agency_date 
ON regulatory_updates(agency, posted_date DESC);

-- Enable RLS on the new table
ALTER TABLE regulatory_updates ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view regulatory updates
CREATE POLICY "Users can view regulatory updates" 
ON regulatory_updates FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- System can insert regulatory updates
CREATE POLICY "System can insert regulatory updates" 
ON regulatory_updates FOR INSERT 
WITH CHECK (true);