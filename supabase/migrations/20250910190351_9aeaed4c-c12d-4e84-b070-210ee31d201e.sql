-- Update trial tracking functions for 7-day trial
DROP FUNCTION IF EXISTS public.get_trial_days_remaining(UUID);
DROP FUNCTION IF EXISTS public.is_trial_expired(UUID);

-- Update existing users to have 7-day trial from their start date
UPDATE public.profiles 
SET trial_ends_at = trial_starts_at + INTERVAL '7 days'
WHERE subscription_status = 'trial' AND trial_starts_at IS NOT NULL;

-- Recreate function to check if trial is expired (7 days)
CREATE OR REPLACE FUNCTION public.is_trial_expired(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_record RECORD;
BEGIN
  SELECT trial_ends_at, subscription_status INTO profile_record
  FROM public.profiles 
  WHERE user_id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN true; -- No profile means no access
  END IF;
  
  -- If they have paid subscription, not expired
  IF profile_record.subscription_status IN ('active', 'paid') THEN
    RETURN false;
  END IF;
  
  -- Check if trial period has ended (7 days)
  RETURN (profile_record.trial_ends_at IS NOT NULL AND profile_record.trial_ends_at < now());
END;
$$;

-- Recreate function to get trial days remaining (7 days)
CREATE OR REPLACE FUNCTION public.get_trial_days_remaining(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_record RECORD;
  days_remaining INTEGER;
BEGIN
  SELECT trial_ends_at, subscription_status INTO profile_record
  FROM public.profiles 
  WHERE user_id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- If they have paid subscription, return -1 (unlimited)
  IF profile_record.subscription_status IN ('active', 'paid') THEN
    RETURN -1;
  END IF;
  
  -- Calculate days remaining (7-day trial)
  IF profile_record.trial_ends_at IS NULL THEN
    RETURN 0;
  END IF;
  
  days_remaining := CEIL(EXTRACT(EPOCH FROM (profile_record.trial_ends_at - now())) / 86400);
  RETURN GREATEST(0, days_remaining);
END;
$$;