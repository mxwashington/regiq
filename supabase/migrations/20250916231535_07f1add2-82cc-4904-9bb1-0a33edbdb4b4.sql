-- Fix default subscription plan to match actual pricing structure
-- Change default from 'starter' to 'alerts_only' to match the Essential Alerts plan

ALTER TABLE public.profiles 
ALTER COLUMN subscription_plan SET DEFAULT 'alerts_only';

-- Update existing users who have 'starter' but should probably be on 'alerts_only' 
-- (This is optional - you may want to review these manually)
-- UPDATE public.profiles 
-- SET subscription_plan = 'alerts_only' 
-- WHERE subscription_plan = 'starter' AND subscription_status = 'trial';

-- Also update the plan limits to match Essential Alerts plan
ALTER TABLE public.profiles 
ALTER COLUMN plan_limits SET DEFAULT '{"users": 1, "suppliers": 1, "api_access": false, "facilities": 1, "sso_enabled": false, "history_months": 1, "exports_per_month": 5, "queries_per_month": 50}'::jsonb;

COMMENT ON COLUMN public.profiles.subscription_plan IS 'Valid values: alerts_only, starter, professional, enterprise';