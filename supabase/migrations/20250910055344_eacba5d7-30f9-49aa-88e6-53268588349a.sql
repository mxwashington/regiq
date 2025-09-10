-- Update Essential Alerts plan to have 0 queries (alerts only)
UPDATE profiles 
SET plan_limits = '{"users": 1, "suppliers": 0, "api_access": false, "facilities": 1, "sso_enabled": false, "history_months": 1, "exports_per_month": 0, "queries_per_month": 0, "alerts_per_day": 50, "advanced_analytics": false, "priority_support": false}'::jsonb
WHERE subscription_plan = 'essential_alerts';