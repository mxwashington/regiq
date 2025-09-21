-- Add AI fields to alerts table
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS urgency_score integer DEFAULT 5;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS perplexity_processed boolean DEFAULT false;

-- Create suppliers table for supplier watch functionality
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duns_number text,
  risk_score integer DEFAULT 0,
  last_checked timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Create policy for suppliers - users can view all suppliers but only admins can manage
CREATE POLICY "Users can view suppliers" ON suppliers FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can manage suppliers" ON suppliers FOR ALL USING (is_admin(auth.uid()));

-- Create supplier_alerts junction table
CREATE TABLE IF NOT EXISTS supplier_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES alerts(id) ON DELETE CASCADE,
  relevance_score integer DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, alert_id)
);

-- Enable RLS on supplier_alerts
ALTER TABLE supplier_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view supplier alerts" ON supplier_alerts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System can manage supplier alerts" ON supplier_alerts FOR ALL USING (true);

-- Create digest preferences for email functionality
CREATE TABLE IF NOT EXISTS digest_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  digest_time time DEFAULT '08:00',
  frequency text DEFAULT 'daily',
  timezone text DEFAULT 'America/New_York',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on digest_preferences
ALTER TABLE digest_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own digest preferences" ON digest_preferences FOR ALL USING (auth.uid() = user_id);

-- Create impact_assessments table for regulatory impact analysis
CREATE TABLE IF NOT EXISTS impact_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid REFERENCES alerts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  category text CHECK (category IN ('Operations', 'Supply Chain', 'Labeling', 'Manufacturing')),
  severity text CHECK (severity IN ('Critical', 'High', 'Medium', 'Low')) DEFAULT 'Medium',
  estimated_cost decimal(10,2),
  impact_description text,
  mitigation_plan text,
  timeline_days integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on impact_assessments
ALTER TABLE impact_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own impact assessments" ON impact_assessments FOR ALL USING (auth.uid() = user_id);

-- Create compliance_assistant_chats table for AI chat history
CREATE TABLE IF NOT EXISTS compliance_assistant_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  context_alerts jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on compliance_assistant_chats
ALTER TABLE compliance_assistant_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own chat history" ON compliance_assistant_chats FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_urgency_score ON alerts(urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_perplexity_processed ON alerts(perplexity_processed) WHERE perplexity_processed = false;
CREATE INDEX IF NOT EXISTS idx_suppliers_risk_score ON suppliers(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_alerts_alert_id ON supplier_alerts(alert_id);
CREATE INDEX IF NOT EXISTS idx_supplier_alerts_supplier_id ON supplier_alerts(supplier_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_digest_preferences_updated_at ON digest_preferences;  
CREATE TRIGGER update_digest_preferences_updated_at BEFORE UPDATE ON digest_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_impact_assessments_updated_at ON impact_assessments;
CREATE TRIGGER update_impact_assessments_updated_at BEFORE UPDATE ON impact_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();