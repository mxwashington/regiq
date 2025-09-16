-- R-004: Custom Email Alerts by Term
-- Create schema for term-based alert subscriptions

-- Create alert_rules table for user-defined alert subscriptions
CREATE TABLE public.alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'realtime' CHECK (frequency IN ('realtime', 'daily', 'weekly')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER NOT NULL DEFAULT 0
);

-- Create indexes for efficient queries
CREATE INDEX idx_alert_rules_user_id ON public.alert_rules(user_id);
CREATE INDEX idx_alert_rules_active ON public.alert_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_alert_rules_frequency ON public.alert_rules(frequency);
CREATE INDEX idx_alert_rules_term_gin ON public.alert_rules USING gin(to_tsvector('english', term));

-- Enable RLS
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own alert rules" 
ON public.alert_rules 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can access alert rules for processing"
ON public.alert_rules
FOR SELECT
USING (true);

-- Create table for tracking alert rule matches
CREATE TABLE public.alert_rule_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified_at TIMESTAMPTZ,
  notification_status TEXT DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'failed'))
);

-- Create indexes for alert rule matches
CREATE INDEX idx_alert_rule_matches_rule_id ON public.alert_rule_matches(alert_rule_id);
CREATE INDEX idx_alert_rule_matches_alert_id ON public.alert_rule_matches(alert_id);
CREATE INDEX idx_alert_rule_matches_status ON public.alert_rule_matches(notification_status);

-- Enable RLS on matches table
ALTER TABLE public.alert_rule_matches ENABLE ROW LEVEL SECURITY;

-- RLS policies for matches
CREATE POLICY "Users can view their own alert rule matches"
ON public.alert_rule_matches
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM alert_rules ar 
  WHERE ar.id = alert_rule_id 
  AND ar.user_id = auth.uid()
));

CREATE POLICY "System can manage alert rule matches"
ON public.alert_rule_matches
FOR ALL
USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_alert_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_alert_rules_updated_at();