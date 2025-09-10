-- Add trial tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN trial_starts_at TIMESTAMPTZ,
ADD COLUMN trial_ends_at TIMESTAMPTZ,
ADD COLUMN trial_expired BOOLEAN DEFAULT false,
ADD COLUMN subscription_status TEXT DEFAULT 'trial';

-- Update existing users to have trial status
UPDATE public.profiles 
SET 
  trial_starts_at = created_at,
  trial_ends_at = created_at + INTERVAL '14 days',
  subscription_status = 'trial'
WHERE trial_starts_at IS NULL;

-- Create function to check if trial is expired
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
  
  -- Check if trial period has ended
  RETURN (profile_record.trial_ends_at IS NOT NULL AND profile_record.trial_ends_at < now());
END;
$$;

-- Create function to get trial days remaining
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
  
  -- Calculate days remaining
  IF profile_record.trial_ends_at IS NULL THEN
    RETURN 0;
  END IF;
  
  days_remaining := CEIL(EXTRACT(EPOCH FROM (profile_record.trial_ends_at - now())) / 86400);
  RETURN GREATEST(0, days_remaining);
END;
$$;