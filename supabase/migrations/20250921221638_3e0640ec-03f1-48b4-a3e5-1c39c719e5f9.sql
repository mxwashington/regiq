-- Update existing plans table with new three-tier pricing structure

-- Clear old plans
DELETE FROM public.plans;
DELETE FROM public.plan_features;

-- Insert the three new pricing plans using correct column names
INSERT INTO public.plans (name, description, price_cents, billing_interval, monthly_price, annual_price, is_popular, sort_order, is_active) VALUES
-- Starter Plan
('Starter', 'Perfect for small businesses and single facility operations', 17900, 'month', 179, 1908, false, 1, true),
('Starter Annual', 'Perfect for small businesses and single facility operations (Annual)', 190800, 'year', 179, 1908, false, 1, true),

-- Growth Plan - Most Popular  
('Growth', 'Ideal for growing businesses and multi-location operations', 34900, 'month', 349, 3718, true, 2, true),
('Growth Annual', 'Ideal for growing businesses and multi-location operations (Annual)', 371800, 'year', 349, 3718, true, 2, true),

-- Professional Plan
('Professional', 'Enterprise-ready organizations with unlimited scale', 54900, 'month', 549, 5858, false, 3, true),
('Professional Annual', 'Enterprise-ready organizations with unlimited scale (Annual)', 585800, 'year', 549, 5858, false, 3, true);

-- Add plan features for the base plans (monthly versions)
-- Get the plan IDs and insert features
DO $$
DECLARE
    starter_id uuid;
    growth_id uuid;
    professional_id uuid;
BEGIN
    -- Get plan IDs
    SELECT id INTO starter_id FROM public.plans WHERE name = 'Starter' AND billing_interval = 'month';
    SELECT id INTO growth_id FROM public.plans WHERE name = 'Growth' AND billing_interval = 'month';  
    SELECT id INTO professional_id FROM public.plans WHERE name = 'Professional' AND billing_interval = 'month';

    -- Starter Plan Features ($179/month)
    INSERT INTO public.plan_features (plan_id, feature_key, feature_value) VALUES
    (starter_id::text, 'max_users', '3'),
    (starter_id::text, 'max_facilities', '1'),
    (starter_id::text, 'monthly_alerts', '500'),
    (starter_id::text, 'ai_queries_per_month', '100'),
    (starter_id::text, 'history_months', '6'),
    (starter_id::text, 'ai_assistant', 'true'),
    (starter_id::text, 'mobile_dashboard', 'true'),
    (starter_id::text, 'email_notifications', 'true'),
    (starter_id::text, 'slack_integration', 'true'),
    (starter_id::text, 'phone_support', 'false'),
    (starter_id::text, 'api_access', 'false'),
    (starter_id::text, 'white_label', 'false'),
    (starter_id::text, 'custom_integrations', 'false'),
    (starter_id::text, 'dedicated_manager', 'false');

    -- Growth Plan Features ($349/month) - Most Popular
    INSERT INTO public.plan_features (plan_id, feature_key, feature_value) VALUES
    (growth_id::text, 'max_users', '10'),
    (growth_id::text, 'max_facilities', '5'), 
    (growth_id::text, 'monthly_alerts', '2000'),
    (growth_id::text, 'ai_queries_per_month', '500'),
    (growth_id::text, 'history_months', '12'),
    (growth_id::text, 'ai_assistant', 'true'),
    (growth_id::text, 'ai_compliance_chat', 'true'),
    (growth_id::text, 'mobile_dashboard', 'true'),
    (growth_id::text, 'email_notifications', 'true'),
    (growth_id::text, 'slack_integration', 'true'),
    (growth_id::text, 'risk_dashboard', 'true'),
    (growth_id::text, 'task_management', 'true'),
    (growth_id::text, 'team_collaboration', 'true'),
    (growth_id::text, 'haccp_integration', 'true'),
    (growth_id::text, 'compliance_calendar', 'true'),
    (growth_id::text, 'phone_support', 'true'),
    (growth_id::text, 'priority_email_support', 'true'),
    (growth_id::text, 'api_access', 'false'),
    (growth_id::text, 'white_label', 'false'),
    (growth_id::text, 'custom_integrations', 'false'),
    (growth_id::text, 'dedicated_manager', 'false');

    -- Professional Plan Features ($549/month) - Enterprise Ready
    INSERT INTO public.plan_features (plan_id, feature_key, feature_value) VALUES
    (professional_id::text, 'max_users', '999999'),
    (professional_id::text, 'max_facilities', '999999'),
    (professional_id::text, 'monthly_alerts', '999999'),
    (professional_id::text, 'ai_queries_per_month', '999999'),
    (professional_id::text, 'history_months', '999999'),
    (professional_id::text, 'ai_assistant', 'true'),
    (professional_id::text, 'ai_compliance_chat', 'true'),
    (professional_id::text, 'ai_impact_analysis', 'true'),
    (professional_id::text, 'regulatory_gap_detection', 'true'),
    (professional_id::text, 'mobile_dashboard', 'true'),
    (professional_id::text, 'email_notifications', 'true'),
    (professional_id::text, 'slack_integration', 'true'),
    (professional_id::text, 'risk_dashboard', 'true'),
    (professional_id::text, 'advanced_analytics', 'true'),
    (professional_id::text, 'task_management', 'true'),
    (professional_id::text, 'team_collaboration', 'true'),
    (professional_id::text, 'haccp_integration', 'true'),
    (professional_id::text, 'compliance_calendar', 'true'),
    (professional_id::text, 'supplier_risk_monitoring', 'true'),
    (professional_id::text, 'custom_integrations', 'true'),
    (professional_id::text, 'webhooks', 'true'),
    (professional_id::text, 'api_access', 'true'),
    (professional_id::text, 'white_label', 'true'),
    (professional_id::text, 'custom_reports', 'true'),
    (professional_id::text, 'phone_support', 'true'),
    (professional_id::text, 'priority_support', 'true'),
    (professional_id::text, 'dedicated_manager', 'true'),
    (professional_id::text, 'custom_onboarding', 'true'),
    (professional_id::text, 'custom_training', 'true');
END $$;