-- Reset all non-admin users to Starter tier
-- Safe for production: excludes marcus@fsqahelp.org and marcus@regiq.org

BEGIN;

-- Reset subscribers to starter tier
UPDATE public.subscribers
SET 
  subscription_tier = 'starter',
  subscribed = true,
  updated_at = now()
WHERE user_id IN (
  SELECT user_id FROM public.profiles 
  WHERE email NOT IN ('marcus@fsqahelp.org', 'marcus@regiq.org')
  AND user_id IS NOT NULL
);

-- Reset profiles subscription status and clear trial dates
UPDATE public.profiles
SET 
  subscription_status = 'active',
  trial_starts_at = NULL,
  trial_ends_at = NULL,
  updated_at = now()
WHERE email NOT IN ('marcus@fsqahelp.org', 'marcus@regiq.org')
AND user_id IS NOT NULL;

-- Clear usage tracking for fresh start
DELETE FROM public.ai_usage_tracking
WHERE user_id IN (
  SELECT user_id FROM public.profiles 
  WHERE email NOT IN ('marcus@fsqahelp.org', 'marcus@regiq.org')
  AND user_id IS NOT NULL
);

-- Clear billing periods for fresh start
DELETE FROM public.billing_periods
WHERE user_id IN (
  SELECT user_id FROM public.profiles 
  WHERE email NOT IN ('marcus@fsqahelp.org', 'marcus@regiq.org')
  AND user_id IS NOT NULL
);

COMMIT;