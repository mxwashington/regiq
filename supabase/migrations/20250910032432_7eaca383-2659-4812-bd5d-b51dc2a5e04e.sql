-- Fix function search path security issues
DROP FUNCTION IF EXISTS public.get_user_entitlements(UUID);
DROP FUNCTION IF EXISTS public.check_feature_access(UUID, TEXT);
DROP FUNCTION IF EXISTS public.enforce_alert_limit(UUID);

-- Function to get user entitlements with proper search path
CREATE OR REPLACE FUNCTION public.get_user_entitlements(user_uuid UUID)
RETURNS TABLE(
  plan_id TEXT,
  feature_key TEXT,
  feature_value JSONB,
  status TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pf.plan_id,
    pf.feature_key,
    pf.feature_value,
    ue.status
  FROM public.user_entitlements ue
  JOIN public.plan_features pf ON pf.plan_id = ue.plan_id
  WHERE ue.user_id = user_uuid
    AND ue.status = 'active'
    AND (ue.expires_at IS NULL OR ue.expires_at > now());
END;
$$;

-- Function to check feature access with proper search path
CREATE OR REPLACE FUNCTION public.check_feature_access(user_uuid UUID, feature TEXT)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  has_access BOOLEAN := false;
BEGIN
  SELECT (feature_value::text = 'true' OR feature_value::text = '"true"')
  INTO has_access
  FROM public.get_user_entitlements(user_uuid)
  WHERE feature_key = feature
  LIMIT 1;
  
  RETURN COALESCE(has_access, false);
END;
$$;

-- Function to enforce daily alert limits with proper search path
CREATE OR REPLACE FUNCTION public.enforce_alert_limit(user_uuid UUID)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  daily_limit INTEGER;
  current_count INTEGER;
  today_start TIMESTAMPTZ := date_trunc('day', now());
BEGIN
  -- Get user's daily alert limit
  SELECT (feature_value::text)::INTEGER
  INTO daily_limit
  FROM public.get_user_entitlements(user_uuid)
  WHERE feature_key = 'max_daily_alerts'
  LIMIT 1;
  
  -- Count today's delivered alerts
  SELECT COUNT(*)
  INTO current_count
  FROM public.alert_delivery_queue
  WHERE user_id = user_uuid
    AND delivered_at >= today_start
    AND status = 'delivered';
  
  RETURN current_count < COALESCE(daily_limit, 50);
END;
$$;