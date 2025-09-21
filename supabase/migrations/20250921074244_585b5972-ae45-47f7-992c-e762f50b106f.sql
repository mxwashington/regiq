-- Create tables for Predictive Risk Modeling
CREATE TABLE public.risk_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL, -- 'supplier', 'facility', 'compliance_area', 'regulatory_change'
  entity_id TEXT NOT NULL,
  risk_score NUMERIC(5,2) NOT NULL DEFAULT 0.0, -- 0.00 to 100.00
  confidence_level NUMERIC(3,2) NOT NULL DEFAULT 0.0, -- 0.00 to 1.00
  prediction_horizon INTEGER NOT NULL DEFAULT 30, -- days
  risk_factors JSONB DEFAULT '{}',
  mitigation_recommendations JSONB DEFAULT '[]',
  historical_data JSONB DEFAULT '{}',
  model_version TEXT DEFAULT 'v1.0',
  predicted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.risk_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_type TEXT NOT NULL, -- 'seasonal', 'regulatory_cycle', 'supplier_behavior', 'compliance_drift'
  pattern_data JSONB NOT NULL DEFAULT '{}',
  frequency INTEGER DEFAULT 1, -- how often this pattern occurs
  confidence NUMERIC(3,2) DEFAULT 0.0,
  impact_score NUMERIC(5,2) DEFAULT 0.0,
  affected_entities JSONB DEFAULT '[]',
  discovery_method TEXT DEFAULT 'ai_analysis',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tables for Advanced Workflows
CREATE TABLE public.workflow_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'compliance', -- 'compliance', 'supplier_management', 'incident_response'
  workflow_definition JSONB NOT NULL DEFAULT '{}', --  steps, conditions, assignments
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.workflow_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.workflow_templates(id),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 1,
  total_steps INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'cancelled', 'error'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  context_data JSONB DEFAULT '{}', -- entity IDs, metadata, etc.
  step_history JSONB DEFAULT '[]',
  assigned_users JSONB DEFAULT '[]',
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.workflow_step_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_instance_id UUID NOT NULL REFERENCES public.workflow_instances(id),
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  assigned_to UUID,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped', 'failed'
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  execution_notes TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_risk_predictions_user_entity ON public.risk_predictions(user_id, entity_type, entity_id);
CREATE INDEX idx_risk_predictions_score ON public.risk_predictions(risk_score DESC);
CREATE INDEX idx_risk_predictions_expires ON public.risk_predictions(expires_at);
CREATE INDEX idx_workflow_instances_user_status ON public.workflow_instances(user_id, status);
CREATE INDEX idx_workflow_instances_due_date ON public.workflow_instances(due_date);
CREATE INDEX idx_workflow_step_executions_workflow ON public.workflow_step_executions(workflow_instance_id, step_number);

-- Enable RLS
ALTER TABLE public.risk_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Risk Predictions
CREATE POLICY "Users can view their own risk predictions" ON public.risk_predictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert risk predictions" ON public.risk_predictions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update risk predictions" ON public.risk_predictions
  FOR UPDATE USING (true);

-- RLS Policies for Risk Patterns  
CREATE POLICY "Authenticated users can view risk patterns" ON public.risk_patterns
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can manage risk patterns" ON public.risk_patterns
  FOR ALL USING (true);

-- RLS Policies for Workflow Templates
CREATE POLICY "Users can manage their own workflow templates" ON public.workflow_templates
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view system templates" ON public.workflow_templates
  FOR SELECT USING (is_system_template = true);

-- RLS Policies for Workflow Instances
CREATE POLICY "Users can manage their own workflow instances" ON public.workflow_instances
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Assigned users can view workflow instances" ON public.workflow_instances
  FOR SELECT USING (auth.uid()::text = ANY(SELECT jsonb_array_elements_text(assigned_users)));

-- RLS Policies for Workflow Step Executions
CREATE POLICY "Users can view workflow step executions" ON public.workflow_step_executions
  FOR SELECT USING (
    workflow_instance_id IN (
      SELECT id FROM public.workflow_instances 
      WHERE user_id = auth.uid() OR auth.uid()::text = ANY(SELECT jsonb_array_elements_text(assigned_users))
    )
  );

CREATE POLICY "Users can manage workflow step executions" ON public.workflow_step_executions
  FOR ALL USING (
    workflow_instance_id IN (
      SELECT id FROM public.workflow_instances WHERE user_id = auth.uid()
    ) OR assigned_to = auth.uid()
  );

-- Insert system workflow templates
INSERT INTO public.workflow_templates (user_id, name, description, category, workflow_definition, is_system_template) VALUES
('00000000-0000-0000-0000-000000000000', 'Supplier Risk Assessment', 'Comprehensive supplier risk evaluation workflow', 'supplier_management', '{
  "steps": [
    {"name": "Initial Risk Screening", "type": "automated", "description": "AI-powered initial risk assessment"},
    {"name": "Document Review", "type": "manual", "description": "Review supplier certifications and compliance documents", "estimated_hours": 2},
    {"name": "Site Assessment", "type": "manual", "description": "Conduct on-site or virtual facility assessment", "estimated_hours": 4},
    {"name": "Risk Score Calculation", "type": "automated", "description": "Calculate final risk score based on all factors"},
    {"name": "Management Approval", "type": "approval", "description": "Final approval for supplier onboarding", "approval_level": "manager"}
  ],
  "conditions": [
    {"if": "risk_score > 70", "then": "require_additional_review"},
    {"if": "high_risk_country", "then": "require_compliance_officer_review"}
  ]
}', true),

('00000000-0000-0000-0000-000000000000', 'Regulatory Alert Response', 'Standard workflow for responding to regulatory alerts', 'compliance', '{
  "steps": [
    {"name": "Alert Triage", "type": "manual", "description": "Assess alert relevance and urgency", "estimated_hours": 0.5},
    {"name": "Impact Analysis", "type": "manual", "description": "Analyze potential impact on operations", "estimated_hours": 1},
    {"name": "Action Plan Creation", "type": "manual", "description": "Develop response action plan", "estimated_hours": 2},
    {"name": "Implementation", "type": "manual", "description": "Execute action plan", "estimated_hours": 8},
    {"name": "Verification", "type": "manual", "description": "Verify compliance with new requirements", "estimated_hours": 1}
  ],
  "conditions": [
    {"if": "urgency == critical", "then": "escalate_immediately"},
    {"if": "affects_multiple_facilities", "then": "notify_all_site_managers"}
  ]
}', true),

('00000000-0000-0000-0000-000000000000', 'Incident Investigation', 'Systematic approach to investigating compliance incidents', 'compliance', '{
  "steps": [
    {"name": "Incident Documentation", "type": "manual", "description": "Document incident details and immediate actions", "estimated_hours": 1},
    {"name": "Root Cause Analysis", "type": "manual", "description": "Identify underlying causes", "estimated_hours": 4},
    {"name": "Corrective Actions", "type": "manual", "description": "Implement corrective measures", "estimated_hours": 8},
    {"name": "Preventive Measures", "type": "manual", "description": "Establish preventive controls", "estimated_hours": 4},
    {"name": "Management Review", "type": "approval", "description": "Senior management review and sign-off", "approval_level": "senior_manager"}
  ]
}', true);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_risk_predictions_updated_at
  BEFORE UPDATE ON public.risk_predictions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_risk_patterns_updated_at
  BEFORE UPDATE ON public.risk_patterns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at
  BEFORE UPDATE ON public.workflow_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_instances_updated_at
  BEFORE UPDATE ON public.workflow_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();