-- EMERGENCY FIX: Allow trial/authenticated users to access alerts
-- This temporarily bypasses overly restrictive subscription gates

BEGIN;

-- Create emergency policy to allow authenticated users basic access
CREATE POLICY "emergency_authenticated_alerts_access" ON public.alerts
FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    -- Admins get full access
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid() AND p.is_admin = true
    ) OR
    -- Authenticated users get basic access to recent alerts
    (
      published_date >= now() - interval '90 days' AND
      urgency IN ('high', 'medium', 'low')
    )
  )
);

-- Update subscription tier defaults for trial users
UPDATE public.profiles
SET subscription_tier = 'trial'
WHERE subscription_tier IS NULL OR subscription_tier = 'none';

-- Create function to ensure trial users have reasonable access
CREATE OR REPLACE FUNCTION ensure_trial_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set default subscription tier for new users
  IF NEW.subscription_tier IS NULL THEN
    NEW.subscription_tier = 'trial';
    NEW.subscription_end = now() + interval '14 days';
  END IF;

  RETURN NEW;
END;
$$;

-- Add trigger to set trial access for new users
DROP TRIGGER IF EXISTS trigger_ensure_trial_access ON public.profiles;
CREATE TRIGGER trigger_ensure_trial_access
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_trial_access();

-- Log the emergency fix
INSERT INTO public.security_events (event_type, metadata, severity)
VALUES (
  'emergency_trial_access_enabled',
  jsonb_build_object(
    'fix_date', now(),
    'reason', 'users_unable_to_access_alerts_during_trial',
    'access_granted', 'authenticated_users_90_days_recent_alerts',
    'temporary_fix', true
  ),
  'medium'
);

COMMIT;