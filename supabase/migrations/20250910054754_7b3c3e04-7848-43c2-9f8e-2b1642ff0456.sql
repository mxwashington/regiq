-- Update Marcus to Enterprise plan and ensure admin status
UPDATE profiles 
SET subscription_plan = 'enterprise',
    is_admin = true,
    role = 'super_admin',
    admin_permissions = '{super_admin,security_admin,billing_admin,analytics_admin}'::text[],
    plan_limits = '{"users": -1, "suppliers": -1, "api_access": true, "facilities": -1, "sso_enabled": true, "history_months": -1, "exports_per_month": -1, "queries_per_month": -1, "advanced_analytics": true, "priority_support": true}'::jsonb
WHERE email = 'marcus@fsqahelp.org';

-- Update everyone else to Essential Alerts plan (lowest tier)
UPDATE profiles 
SET subscription_plan = 'alerts_only',
    plan_limits = '{"users": 1, "suppliers": 0, "api_access": false, "facilities": 1, "sso_enabled": false, "history_months": 1, "exports_per_month": 0, "queries_per_month": 50, "advanced_analytics": false, "priority_support": false}'::jsonb
WHERE email != 'marcus@fsqahelp.org';