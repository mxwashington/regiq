-- Update existing plans table structure for new three-tier pricing

-- First, let's see what we have
-- The plans table exists with: id (text), name, description, price_cents, billing_interval, is_active, created_at, updated_at
-- Plus our new columns: monthly_price, annual_price, stripe_monthly_price_id, stripe_annual_price_id, is_popular, sort_order

-- Clear existing plans and plan_features
DELETE FROM public.plan_features;
DELETE FROM public.plans;

-- Insert the three new pricing plans using correct column structure
INSERT INTO public.plans (id, name, description, price_cents, billing_interval, monthly_price, annual_price, is_popular, sort_order, is_active) VALUES
-- Starter Plan
('starter', 'Starter', 'Perfect for small businesses and single facility operations', 17900, 'month', 179, 1908, false, 1, true),
('starter_annual', 'Starter Annual', 'Perfect for small businesses and single facility operations (Annual)', 190800, 'year', 179, 1908, false, 1, true),

-- Growth Plan - Most Popular
('growth', 'Growth', 'Ideal for growing businesses and multi-location operations', 34900, 'month', 349, 3718, true, 2, true),
('growth_annual', 'Growth Annual', 'Ideal for growing businesses and multi-location operations (Annual)', 371800, 'year', 349, 3718, true, 2, true),

-- Professional Plan
('professional', 'Professional', 'Enterprise-ready organizations with unlimited scale', 54900, 'month', 549, 5858, false, 3, true),
('professional_annual', 'Professional Annual', 'Enterprise-ready organizations with unlimited scale (Annual)', 585800, 'year', 549, 5858, false, 3, true);

-- Insert plan features for the three tiers
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

-- Growth Plan Features ($349/month)
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

-- Professional Plan Features ($549/month)
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