-- Create plans table for subscription tiers
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create plan features mapping
CREATE TABLE public.plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL REFERENCES public.plans(plan_id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  feature_value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_key)
);

-- Create user entitlements table
CREATE TABLE public.user_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id TEXT NOT NULL REFERENCES public.plans(plan_id),
  subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create usage limits tracking
CREATE TABLE public.usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  feature_key TEXT NOT NULL,
  current_usage INTEGER NOT NULL DEFAULT 0,
  limit_value INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('day', now()),
  period_end TIMESTAMPTZ NOT NULL DEFAULT date_trunc('day', now() + interval '1 day'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_key, period_start)
);

-- Create alert preferences table
CREATE TABLE public.alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_frequency TEXT NOT NULL DEFAULT 'realtime',
  categories TEXT[] NOT NULL DEFAULT '{"Critical", "High", "Medium", "Low"}',
  agencies TEXT[] NOT NULL DEFAULT '{"FDA", "USDA", "EPA"}',
  delay_non_critical BOOLEAN NOT NULL DEFAULT false,
  max_daily_alerts INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create alert delivery queue
CREATE TABLE public.alert_delivery_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL,
  user_id UUID NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'queued',
  delivery_method TEXT NOT NULL DEFAULT 'email',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create audit events table
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert plan data
INSERT INTO public.plans (plan_id, name, description, price_cents, billing_interval) VALUES
('alerts_only', 'Essential Alerts', 'Real-time regulatory alerts for one facility', 1000, 'monthly'),
('alerts_only_annual', 'Essential Alerts', 'Real-time regulatory alerts for one facility', 9900, 'yearly'),
('starter', 'Starter', 'AI-powered regulatory intelligence', 9900, 'monthly'),
('professional', 'Professional', 'Advanced analytics and multi-facility', 39900, 'monthly'),
('enterprise', 'Enterprise', 'Full platform with API access', 99900, 'monthly');

-- Insert plan features
INSERT INTO public.plan_features (plan_id, feature_key, feature_value) VALUES
-- Alerts Only features
('alerts_only', 'max_facilities', '1'),
('alerts_only', 'max_users', '1'),
('alerts_only', 'alert_history_days', '30'),
('alerts_only', 'max_daily_alerts', '50'),
('alerts_only', 'ai_assistant', 'false'),
('alerts_only', 'mobile_app', 'false'),
('alerts_only', 'advanced_analytics', 'false'),
('alerts_only', 'api_access', 'false'),
('alerts_only', 'delay_non_critical', 'true'),
('alerts_only', 'export_pdf', 'false'),
('alerts_only', 'supplier_monitoring', 'false'),

-- Starter features
('starter', 'max_facilities', '3'),
('starter', 'max_users', '5'),
('starter', 'alert_history_days', '365'),
('starter', 'max_daily_alerts', '200'),
('starter', 'ai_assistant', 'true'),
('starter', 'mobile_app', 'true'),
('starter', 'advanced_analytics', 'false'),
('starter', 'api_access', 'false'),
('starter', 'delay_non_critical', 'false'),
('starter', 'export_pdf', 'true'),
('starter', 'supplier_monitoring', 'false');

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_delivery_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Plans are viewable by all authenticated users" ON public.plans
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Plan features are viewable by all authenticated users" ON public.plan_features
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own entitlements" ON public.user_entitlements
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own usage limits" ON public.usage_limits
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own alert preferences" ON public.alert_preferences
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own delivery queue" ON public.alert_delivery_queue
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage entitlements" ON public.user_entitlements
FOR ALL USING (true);

CREATE POLICY "System can manage usage limits" ON public.usage_limits
FOR ALL USING (true);

CREATE POLICY "System can manage delivery queue" ON public.alert_delivery_queue
FOR ALL USING (true);

CREATE POLICY "System can log audit events" ON public.audit_events
FOR INSERT WITH CHECK (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_user_entitlements_updated_at BEFORE UPDATE ON public.user_entitlements FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_usage_limits_updated_at BEFORE UPDATE ON public.usage_limits FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER update_alert_preferences_updated_at BEFORE UPDATE ON public.alert_preferences FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Function to get user entitlements
CREATE OR REPLACE FUNCTION public.get_user_entitlements(user_uuid UUID)
RETURNS TABLE(
  plan_id TEXT,
  feature_key TEXT,
  feature_value JSONB,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pf.plan_id,
    pf.feature_key,
    pf.feature_value,
    ue.status
  FROM public.user_entitlements ue
  JOIN public.plan_features pf ON pf.plan_id = ue.plan_id
  WHERE ue.user_id = user_uuid
    AND ue.status = 'active'
    AND (ue.expires_at IS NULL OR ue.expires_at > now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check feature access
CREATE OR REPLACE FUNCTION public.check_feature_access(user_uuid UUID, feature TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN := false;
BEGIN
  SELECT (feature_value::text = 'true' OR feature_value::text = '"true"')
  INTO has_access
  FROM public.get_user_entitlements(user_uuid)
  WHERE feature_key = feature
  LIMIT 1;
  
  RETURN COALESCE(has_access, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enforce daily alert limits
CREATE OR REPLACE FUNCTION public.enforce_alert_limit(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  daily_limit INTEGER;
  current_count INTEGER;
  today_start TIMESTAMPTZ := date_trunc('day', now());
BEGIN
  -- Get user's daily alert limit
  SELECT (feature_value::text)::INTEGER
  INTO daily_limit
  FROM public.get_user_entitlements(user_uuid)
  WHERE feature_key = 'max_daily_alerts'
  LIMIT 1;
  
  -- Count today's delivered alerts
  SELECT COUNT(*)
  INTO current_count
  FROM public.alert_delivery_queue
  WHERE user_id = user_uuid
    AND delivered_at >= today_start
    AND status = 'delivered';
  
  RETURN current_count < COALESCE(daily_limit, 50);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;