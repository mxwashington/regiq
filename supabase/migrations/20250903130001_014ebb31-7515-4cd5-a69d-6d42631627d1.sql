-- Create usage tracking table for plan enforcement
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()),
  period_end TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, usage_type, period_start)
);

-- Enable RLS on usage tracking
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for usage tracking
CREATE POLICY "Users can view own usage" ON public.usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage" ON public.usage_tracking
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON public.usage_tracking
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to increment usage and check limits
CREATE OR REPLACE FUNCTION public.increment_usage_with_limit_check(
  usage_type_param TEXT,
  user_id_param UUID DEFAULT auth.uid()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_usage INTEGER := 0;
  usage_limit INTEGER := 0;
  user_plan_limits JSONB;
  period_start_date TIMESTAMPTZ := date_trunc('month', now());
  period_end_date TIMESTAMPTZ := date_trunc('month', now()) + interval '1 month';
  is_subscribed BOOLEAN := false;
  subscription_tier TEXT;
BEGIN
  -- Check if user has active subscription
  SELECT s.subscribed, s.subscription_tier INTO is_subscribed, subscription_tier
  FROM public.subscribers s 
  WHERE s.user_id = user_id_param;
  
  -- Get user plan limits
  SELECT p.plan_limits INTO user_plan_limits
  FROM public.profiles p 
  WHERE p.user_id = user_id_param;
  
  -- If user has active subscription, allow more usage based on tier
  IF is_subscribed AND subscription_tier = 'Premium' THEN
    user_plan_limits := jsonb_build_object(
      'queries_per_month', 500,
      'alerts_per_day', 100,
      'saved_searches', 50,
      'api_access', true,
      'advanced_filters', true,
      'bulk_export', true,
      'custom_notifications', true,
      'priority_support', true
    );
  ELSIF is_subscribed AND subscription_tier = 'Enterprise' THEN
    user_plan_limits := jsonb_build_object(
      'queries_per_month', -1, -- Unlimited
      'alerts_per_day', -1,
      'saved_searches', -1,
      'api_access', true,
      'advanced_filters', true,
      'bulk_export', true,
      'custom_notifications', true,
      'priority_support', true
    );
  END IF;
  
  -- Get usage limit for this type
  CASE usage_type_param
    WHEN 'queries' THEN 
      usage_limit := COALESCE((user_plan_limits->>'queries_per_month')::INTEGER, 50);
    WHEN 'alerts' THEN 
      usage_limit := COALESCE((user_plan_limits->>'alerts_per_day')::INTEGER, 10);
      period_start_date := date_trunc('day', now());
      period_end_date := date_trunc('day', now()) + interval '1 day';
    WHEN 'saved_searches' THEN 
      usage_limit := COALESCE((user_plan_limits->>'saved_searches')::INTEGER, 5);
    ELSE
      RAISE EXCEPTION 'Invalid usage type: %', usage_type_param;
  END CASE;
  
  -- Get current usage
  SELECT COALESCE(usage_count, 0) INTO current_usage
  FROM public.usage_tracking 
  WHERE user_id = user_id_param 
    AND usage_type = usage_type_param 
    AND period_start = period_start_date;
  
  -- Check if limit exceeded (unlimited if -1)
  IF usage_limit > 0 AND current_usage >= usage_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current_usage', current_usage,
      'limit', usage_limit,
      'message', format('You have reached your %s limit for this period. Upgrade your plan to continue.', usage_type_param),
      'upgrade_required', true
    );
  END IF;
  
  -- Increment usage
  INSERT INTO public.usage_tracking (user_id, usage_type, usage_count, period_start, period_end)
  VALUES (user_id_param, usage_type_param, 1, period_start_date, period_end_date)
  ON CONFLICT (user_id, usage_type, period_start)
  DO UPDATE SET 
    usage_count = usage_tracking.usage_count + 1,
    updated_at = now();
  
  RETURN jsonb_build_object(
    'allowed', true,
    'current_usage', current_usage + 1,
    'limit', usage_limit,
    'message', 'Usage recorded successfully'
  );
END;
$$;

-- Function to check feature access
CREATE OR REPLACE FUNCTION public.check_feature_access(
  feature_name TEXT,
  user_id_param UUID DEFAULT auth.uid()
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan_limits JSONB;
  is_subscribed BOOLEAN := false;
  subscription_tier TEXT;
BEGIN
  -- Check if user has active subscription
  SELECT s.subscribed, s.subscription_tier INTO is_subscribed, subscription_tier
  FROM public.subscribers s 
  WHERE s.user_id = user_id_param;
  
  -- Get user plan limits
  SELECT p.plan_limits INTO user_plan_limits
  FROM public.profiles p 
  WHERE p.user_id = user_id_param;
  
  -- Override limits for subscribed users
  IF is_subscribed AND subscription_tier IN ('Premium', 'Enterprise') THEN
    RETURN true;
  END IF;
  
  -- Check feature access based on plan
  RETURN COALESCE((user_plan_limits->>feature_name)::BOOLEAN, false);
END;
$$;