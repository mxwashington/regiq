-- Set Marcus as admin and fix subscription plans

-- Make Marcus an admin with full permissions
UPDATE public.profiles 
SET 
  is_admin = true,
  role = 'admin',
  admin_permissions = ARRAY['super_admin', 'security_admin', 'billing_admin', 'analytics_admin']
WHERE email = 'marcus@fsqahelp.org';

-- Update valid subscription plans to match new B2B strategy
-- Remove 'starter' tier and update to professional as entry B2B tier
UPDATE public.profiles 
SET subscription_plan = 'professional' 
WHERE subscription_plan = 'starter';

-- Update default subscription plan for new B2B users
ALTER TABLE public.profiles 
ALTER COLUMN subscription_plan SET DEFAULT 'professional';

-- Update comment to reflect new B2B tiers
COMMENT ON COLUMN public.profiles.subscription_plan IS 'B2B tiers: professional, enterprise. Consumer tier handled separately.';