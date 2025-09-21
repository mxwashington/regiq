-- Simple migration to just clear and re-populate plan_features with new pricing structure
-- Skip modifying plans table for now

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