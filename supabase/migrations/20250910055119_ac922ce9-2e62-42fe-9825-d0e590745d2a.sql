-- First, add a constraint that includes both old and new values
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_plan_check 
CHECK (subscription_plan = ANY (ARRAY['basic'::text, 'premium'::text, 'essential_alerts'::text, 'starter'::text, 'professional'::text, 'enterprise'::text]));

-- Update everyone except Marcus to Essential Alerts plan ($10/month)
UPDATE profiles 
SET subscription_plan = 'essential_alerts',
    plan_limits = '{"users": 1, "suppliers": 0, "api_access": false, "facilities": 1, "sso_enabled": false, "history_months": 1, "exports_per_month": 0, "queries_per_month": 50, "alerts_per_day": 50, "advanced_analytics": false, "priority_support": false}'::jsonb
WHERE email != 'marcus@fsqahelp.org';

-- Ensure Marcus stays on Enterprise  
UPDATE profiles 
SET subscription_plan = 'enterprise'
WHERE email = 'marcus@fsqahelp.org';

-- Now drop the old constraint and add the new one without 'basic' and 'premium'
ALTER TABLE profiles DROP CONSTRAINT profiles_subscription_plan_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_subscription_plan_check 
CHECK (subscription_plan = ANY (ARRAY['essential_alerts'::text, 'starter'::text, 'professional'::text, 'enterprise'::text]));