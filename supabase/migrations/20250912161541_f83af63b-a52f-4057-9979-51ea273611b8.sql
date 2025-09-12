-- Create tables for regulatory gap detection and process failure analysis

-- Table to track process failure patterns in recalls
CREATE TABLE public.process_failure_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  failure_type TEXT NOT NULL, -- 'import_reinspection', 'process_breakdown', 'oversight_failure', etc.
  failure_category TEXT NOT NULL, -- 'administrative', 'systemic', 'compliance', 'oversight'
  severity_level TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  affected_systems TEXT[], -- systems/processes that failed
  root_cause_analysis JSONB DEFAULT '{}',
  regulatory_gaps JSONB DEFAULT '{}', -- specific gaps identified
  similar_pattern_count INTEGER DEFAULT 1,
  trend_indicators JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.process_failure_patterns ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view process failure patterns" 
ON public.process_failure_patterns 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert process failure patterns" 
ON public.process_failure_patterns 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update process failure patterns" 
ON public.process_failure_patterns 
FOR UPDATE 
USING (true);

-- Table to track import compliance gaps
CREATE TABLE public.import_compliance_gaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  origin_country TEXT,
  importer_name TEXT,
  gap_type TEXT NOT NULL, -- 'reinspection_bypass', 'certification_missing', 'documentation_gap'
  compliance_requirements_missed TEXT[],
  potential_risk_level TEXT NOT NULL DEFAULT 'medium',
  affected_facilities JSONB DEFAULT '[]',
  remediation_needed JSONB DEFAULT '{}',
  timeline_to_fix TEXT, -- 'immediate', 'short_term', 'medium_term'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_compliance_gaps ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view import compliance gaps" 
ON public.import_compliance_gaps 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage import compliance gaps" 
ON public.import_compliance_gaps 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Table to track systemic regulatory breakdown indicators
CREATE TABLE public.regulatory_gap_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  indicator_type TEXT NOT NULL, -- 'process_pattern', 'supplier_risk', 'facility_vulnerability'
  risk_score INTEGER NOT NULL DEFAULT 50, -- 0-100 scale
  trend_direction TEXT NOT NULL DEFAULT 'stable', -- 'improving', 'stable', 'worsening'
  affected_areas JSONB NOT NULL DEFAULT '[]',
  evidence_alerts UUID[] DEFAULT '{}', -- array of alert IDs supporting this indicator
  gap_description TEXT NOT NULL,
  recommended_actions JSONB DEFAULT '[]',
  priority_level TEXT NOT NULL DEFAULT 'medium',
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.regulatory_gap_indicators ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own regulatory gap indicators" 
ON public.regulatory_gap_indicators 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage regulatory gap indicators" 
ON public.regulatory_gap_indicators 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_process_failure_patterns_alert_id ON public.process_failure_patterns(alert_id);
CREATE INDEX idx_process_failure_patterns_failure_type ON public.process_failure_patterns(failure_type);
CREATE INDEX idx_process_failure_patterns_severity ON public.process_failure_patterns(severity_level);
CREATE INDEX idx_import_compliance_gaps_alert_id ON public.import_compliance_gaps(alert_id);
CREATE INDEX idx_import_compliance_gaps_gap_type ON public.import_compliance_gaps(gap_type);
CREATE INDEX idx_regulatory_gap_indicators_user_id ON public.regulatory_gap_indicators(user_id);
CREATE INDEX idx_regulatory_gap_indicators_risk_score ON public.regulatory_gap_indicators(risk_score);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_process_failure_patterns_updated_at
BEFORE UPDATE ON public.process_failure_patterns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_import_compliance_gaps_updated_at
BEFORE UPDATE ON public.import_compliance_gaps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();