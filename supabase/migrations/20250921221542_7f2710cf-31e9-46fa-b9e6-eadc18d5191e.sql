-- Drop and recreate plans table with correct schema
DROP TABLE IF EXISTS public.plans CASCADE;

-- Create plans table with correct columns
CREATE TABLE public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  monthly_price INTEGER NOT NULL,
  annual_price INTEGER NOT NULL,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  is_popular BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert the three new pricing plans
INSERT INTO public.plans (id, name, description, monthly_price, annual_price, is_popular, sort_order) VALUES
('starter', 'Starter', 'Perfect for small businesses and single facility operations', 179, 1908, false, 1),
('growth', 'Growth', 'Ideal for growing businesses and multi-location operations', 349, 3718, true, 2),
('professional', 'Professional', 'Enterprise-ready organizations with unlimited scale', 549, 5858, false, 3);

-- Now clear old plan features and add new ones
DELETE FROM public.plan_features;

-- Starter Plan Features ($179/month)
INSERT INTO public.plan_features (plan_id, feature_key, feature_value) VALUES
('starter', 'max_users', '3'),
('starter', 'max_facilities', '1'),
('starter', 'monthly_alerts', '500'),
('starter', 'ai_queries_per_month', '100'),
('starter', 'history_months', '6'),
('starter', 'ai_assistant', 'true'),
('starter', 'mobile_dashboard', 'true'),
('starter', 'email_notifications', 'true'),
('starter', 'slack_integration', 'true'),
('starter', 'phone_support', 'false'),
('starter', 'api_access', 'false'),
('starter', 'white_label', 'false'),
('starter', 'custom_integrations', 'false'),
('starter', 'dedicated_manager', 'false');

-- Growth Plan Features ($349/month) - Most Popular
INSERT INTO public.plan_features (plan_id, feature_key, feature_value) VALUES
('growth', 'max_users', '10'),
('growth', 'max_facilities', '5'),
('growth', 'monthly_alerts', '2000'),
('growth', 'ai_queries_per_month', '500'),
('growth', 'history_months', '12'),
('growth', 'ai_assistant', 'true'),
('growth', 'ai_compliance_chat', 'true'),
('growth', 'mobile_dashboard', 'true'),
('growth', 'email_notifications', 'true'),
('growth', 'slack_integration', 'true'),
('growth', 'risk_dashboard', 'true'),
('growth', 'task_management', 'true'),
('growth', 'team_collaboration', 'true'),
('growth', 'haccp_integration', 'true'),
('growth', 'compliance_calendar', 'true'),
('growth', 'phone_support', 'true'),
('growth', 'priority_email_support', 'true'),
('growth', 'api_access', 'false'),
('growth', 'white_label', 'false'),
('growth', 'custom_integrations', 'false'),
('growth', 'dedicated_manager', 'false');

-- Professional Plan Features ($549/month) - Enterprise Ready  
INSERT INTO public.plan_features (plan_id, feature_key, feature_value) VALUES
('professional', 'max_users', '999999'),
('professional', 'max_facilities', '999999'),
('professional', 'monthly_alerts', '999999'),
('professional', 'ai_queries_per_month', '999999'),
('professional', 'history_months', '999999'),
('professional', 'ai_assistant', 'true'),
('professional', 'ai_compliance_chat', 'true'),
('professional', 'ai_impact_analysis', 'true'),
('professional', 'regulatory_gap_detection', 'true'),
('professional', 'mobile_dashboard', 'true'),
('professional', 'email_notifications', 'true'),
('professional', 'slack_integration', 'true'),
('professional', 'risk_dashboard', 'true'),
('professional', 'advanced_analytics', 'true'),
('professional', 'task_management', 'true'),
('professional', 'team_collaboration', 'true'),
('professional', 'haccp_integration', 'true'),
('professional', 'compliance_calendar', 'true'),
('professional', 'supplier_risk_monitoring', 'true'),
('professional', 'custom_integrations', 'true'),
('professional', 'webhooks', 'true'),
('professional', 'api_access', 'true'),
('professional', 'white_label', 'true'),
('professional', 'custom_reports', 'true'),
('professional', 'phone_support', 'true'),
('professional', 'priority_support', 'true'),
('professional', 'dedicated_manager', 'true'),
('professional', 'custom_onboarding', 'true'),
('professional', 'custom_training', 'true');

-- Enable RLS on plans table
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read plans (needed for public pricing page)
CREATE POLICY "Plans are viewable by everyone" ON public.plans
FOR SELECT USING (true);

-- Only admins can modify plans
CREATE POLICY "Admins can manage plans" ON public.plans
FOR ALL USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Add trigger to update timestamps
CREATE OR REPLACE FUNCTION public.update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_plans_updated_at();