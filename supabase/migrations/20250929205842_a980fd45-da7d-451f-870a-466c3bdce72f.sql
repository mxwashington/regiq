-- Create billing periods table for tracking monthly usage cycles
CREATE TABLE IF NOT EXISTS public.billing_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  UNIQUE(user_id, period_start)
);

-- Create AI usage tracking table
CREATE TABLE IF NOT EXISTS public.ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('ai_summary', 'ai_search', 'export', 'api_call')),
  count INTEGER NOT NULL DEFAULT 1,
  billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (now() AT TIME ZONE 'UTC')
);

-- Enable RLS on both tables
ALTER TABLE public.billing_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for billing_periods
CREATE POLICY "Users can view own billing periods"
  ON public.billing_periods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert billing periods"
  ON public.billing_periods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for ai_usage_tracking
CREATE POLICY "Users can view own usage"
  ON public.ai_usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert usage records"
  ON public.ai_usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update usage records"
  ON public.ai_usage_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_billing_periods_user_period ON public.billing_periods(user_id, period_start);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_period ON public.ai_usage_tracking(user_id, billing_period_start, usage_type);

-- Function to get or create current billing period
CREATE OR REPLACE FUNCTION public.get_current_billing_period(user_uuid UUID)
RETURNS TABLE(period_start TIMESTAMP WITH TIME ZONE, period_end TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_period_start TIMESTAMP WITH TIME ZONE;
  current_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Use UTC for consistency
  current_period_start := date_trunc('month', now() AT TIME ZONE 'UTC');
  current_period_end := (current_period_start + interval '1 month');
  
  -- Get or create billing period
  INSERT INTO public.billing_periods (user_id, period_start, period_end)
  VALUES (user_uuid, current_period_start, current_period_end)
  ON CONFLICT (user_id, period_start) DO NOTHING;
  
  RETURN QUERY
  SELECT bp.period_start, bp.period_end
  FROM public.billing_periods bp
  WHERE bp.user_id = user_uuid
    AND bp.period_start = current_period_start;
END;
$$;

-- Function to check and log usage (returns whether action is allowed)
CREATE OR REPLACE FUNCTION public.check_and_log_usage(
  user_uuid UUID,
  usage_type_param TEXT,
  limit_count INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_usage INTEGER := 0;
  period_start_date TIMESTAMP WITH TIME ZONE;
  period_end_date TIMESTAMP WITH TIME ZONE;
  is_allowed BOOLEAN;
BEGIN
  -- Get current billing period
  SELECT ps.period_start, ps.period_end INTO period_start_date, period_end_date
  FROM public.get_current_billing_period(user_uuid) ps;
  
  -- Get current usage count for this type in current period
  SELECT COALESCE(SUM(aut.count), 0) INTO current_usage
  FROM public.ai_usage_tracking aut
  WHERE aut.user_id = user_uuid
    AND aut.usage_type = usage_type_param
    AND aut.billing_period_start = period_start_date;
  
  -- Check if under limit
  is_allowed := current_usage < limit_count;
  
  -- If allowed, log the usage
  IF is_allowed THEN
    INSERT INTO public.ai_usage_tracking (
      user_id, usage_type, count, billing_period_start, billing_period_end
    ) VALUES (
      user_uuid, usage_type_param, 1, period_start_date, period_end_date
    );
    current_usage := current_usage + 1;
  END IF;
  
  -- Return result
  RETURN jsonb_build_object(
    'allowed', is_allowed,
    'current_usage', current_usage,
    'limit', limit_count,
    'period_end', period_end_date,
    'message', CASE
      WHEN is_allowed THEN 'Usage logged successfully'
      ELSE format('Monthly %s limit reached (%s/%s). Upgrade to continue.', 
                  usage_type_param, current_usage, limit_count)
    END
  );
END;
$$;

-- Function to get usage summary for dashboard
CREATE OR REPLACE FUNCTION public.get_usage_summary(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  period_start_date TIMESTAMP WITH TIME ZONE;
  period_end_date TIMESTAMP WITH TIME ZONE;
  usage_data JSONB;
BEGIN
  -- Get current billing period
  SELECT ps.period_start, ps.period_end INTO period_start_date, period_end_date
  FROM public.get_current_billing_period(user_uuid) ps;
  
  -- Build usage summary
  SELECT jsonb_build_object(
    'billing_period', jsonb_build_object(
      'start', period_start_date,
      'end', period_end_date
    ),
    'usage', jsonb_build_object(
      'ai_summaries', COALESCE((
        SELECT SUM(count) FROM public.ai_usage_tracking
        WHERE user_id = user_uuid 
          AND usage_type = 'ai_summary'
          AND billing_period_start = period_start_date
      ), 0),
      'ai_searches', COALESCE((
        SELECT SUM(count) FROM public.ai_usage_tracking
        WHERE user_id = user_uuid 
          AND usage_type = 'ai_search'
          AND billing_period_start = period_start_date
      ), 0),
      'exports', COALESCE((
        SELECT SUM(count) FROM public.ai_usage_tracking
        WHERE user_id = user_uuid 
          AND usage_type = 'export'
          AND billing_period_start = period_start_date
      ), 0),
      'api_calls', COALESCE((
        SELECT SUM(count) FROM public.ai_usage_tracking
        WHERE user_id = user_uuid 
          AND usage_type = 'api_call'
          AND billing_period_start = period_start_date
      ), 0),
      'saved_alerts', COALESCE((
        SELECT COUNT(*) FROM public.saved_items
        WHERE user_id = user_uuid
      ), 0)
    )
  ) INTO usage_data;
  
  RETURN usage_data;
END;
$$;