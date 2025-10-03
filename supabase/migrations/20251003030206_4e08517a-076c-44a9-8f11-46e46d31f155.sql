-- Create recalls table for FDA and USDA data
CREATE TABLE IF NOT EXISTS recalls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recall_number TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  product_description TEXT,
  recall_date DATE NOT NULL,
  publish_date TIMESTAMPTZ,
  classification TEXT NOT NULL,
  reason TEXT,
  company_name TEXT NOT NULL,
  distribution_pattern TEXT,
  product_type TEXT NOT NULL,
  source TEXT NOT NULL,
  agency_source TEXT,
  recall_type TEXT DEFAULT 'product_recall',
  pathogen_type TEXT,
  contamination_type TEXT,
  severity TEXT,
  urgency TEXT,
  alert_priority TEXT,
  affected_brands TEXT[],
  affected_states TEXT[],
  keywords TEXT[],
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create CDC outbreak alerts table
CREATE TABLE IF NOT EXISTS cdc_outbreak_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbreak_title TEXT NOT NULL,
  pathogen_type TEXT,
  investigation_status TEXT,
  implicated_foods TEXT[],
  publish_date TIMESTAMPTZ NOT NULL,
  source_url TEXT NOT NULL,
  keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create CDC emergency advisories table
CREATE TABLE IF NOT EXISTS cdc_emergency_advisories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  urgency TEXT,
  publish_date TIMESTAMPTZ NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create sync logs table
CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL,
  records_synced INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE recalls ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdc_outbreak_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdc_emergency_advisories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for recalls
CREATE POLICY "Anyone can view recalls"
  ON recalls FOR SELECT
  USING (true);

-- Public read access for CDC outbreak alerts
CREATE POLICY "Anyone can view outbreak alerts"
  ON cdc_outbreak_alerts FOR SELECT
  USING (true);

-- Public read access for CDC emergency advisories
CREATE POLICY "Anyone can view emergency advisories"
  ON cdc_emergency_advisories FOR SELECT
  USING (true);

-- Admins can view sync logs
CREATE POLICY "Admins can view sync logs"
  ON sync_logs FOR SELECT
  USING (is_admin(auth.uid()));

-- System can insert into all tables
CREATE POLICY "System can insert recalls"
  ON recalls FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update recalls"
  ON recalls FOR UPDATE
  USING (true);

CREATE POLICY "System can insert outbreak alerts"
  ON cdc_outbreak_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update outbreak alerts"
  ON cdc_outbreak_alerts FOR UPDATE
  USING (true);

CREATE POLICY "System can insert emergency advisories"
  ON cdc_emergency_advisories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update emergency advisories"
  ON cdc_emergency_advisories FOR UPDATE
  USING (true);

CREATE POLICY "System can insert sync logs"
  ON sync_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update sync logs"
  ON sync_logs FOR UPDATE
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recalls_recall_date ON recalls(recall_date DESC);
CREATE INDEX IF NOT EXISTS idx_recalls_source ON recalls(source);
CREATE INDEX IF NOT EXISTS idx_recalls_classification ON recalls(classification);
CREATE INDEX IF NOT EXISTS idx_cdc_outbreak_publish_date ON cdc_outbreak_alerts(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_cdc_advisory_publish_date ON cdc_emergency_advisories(publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON sync_logs(created_at DESC);