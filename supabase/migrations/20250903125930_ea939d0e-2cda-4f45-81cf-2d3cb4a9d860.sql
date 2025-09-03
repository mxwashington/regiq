-- First, let's check what subscription plans are allowed and update the constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;

-- Add new constraint that allows basic, premium, and enterprise plans
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_plan_check 
CHECK (subscription_plan IN ('basic', 'premium', 'enterprise'));

-- Update all users to basic plan (the restrictive $99/mo equivalent plan)
UPDATE public.profiles 
SET subscription_plan = 'basic'
WHERE subscription_plan IS NULL OR subscription_plan = 'starter';

-- Update profiles table to have stricter basic plan limits
UPDATE public.profiles 
SET plan_limits = jsonb_build_object(
  'queries_per_month', 50,
  'alerts_per_day', 10,
  'saved_searches', 5,
  'api_access', false,
  'advanced_filters', false,
  'bulk_export', false,
  'custom_notifications', false,
  'priority_support', false
)
WHERE subscription_plan = 'basic';