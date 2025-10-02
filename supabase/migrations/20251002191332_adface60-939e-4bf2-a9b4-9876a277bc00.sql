-- Create source_health_logs table for tracking health check results
CREATE TABLE IF NOT EXISTS source_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fda_status TEXT NOT NULL,
  fsis_status TEXT NOT NULL,
  epa_status TEXT NOT NULL,
  cdc_status TEXT NOT NULL,
  overall_status TEXT NOT NULL,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE source_health_logs ENABLE ROW LEVEL SECURITY;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_source_health_logs_timestamp ON source_health_logs(check_timestamp DESC);

-- Create policy for admins to view logs
CREATE POLICY "Admins can view source health logs" ON source_health_logs
  FOR SELECT USING (is_admin(auth.uid()));

-- Create policy for system to insert logs
CREATE POLICY "System can insert source health logs" ON source_health_logs
  FOR INSERT WITH CHECK (true);

-- Create function to check duplicates by source
CREATE OR REPLACE FUNCTION check_source_duplicates(source_name TEXT)
RETURNS TABLE (duplicate_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*) - COUNT(DISTINCT external_id) as duplicate_count
  FROM alerts
  WHERE source = source_name OR agency = source_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
