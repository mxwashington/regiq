-- Add index for efficient usage lookups
CREATE INDEX IF NOT EXISTS idx_usage_tracking_lookup 
ON ai_usage_tracking(user_id, usage_type, billing_period_start);

-- Add index for billing periods
CREATE INDEX IF NOT EXISTS idx_billing_periods_lookup 
ON billing_periods(user_id, period_start);

-- Drop old function
DROP FUNCTION IF EXISTS public.check_and_log_usage(uuid, text, integer);

-- Create improved version with race condition protection
CREATE OR REPLACE FUNCTION public.check_and_log_usage(
  user_uuid uuid,
  usage_type_param text,
  limit_count integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_usage INTEGER := 0;
  period_start_date TIMESTAMP WITH TIME ZONE;
  period_end_date TIMESTAMP WITH TIME ZONE;
  is_allowed BOOLEAN;
  lock_key BIGINT;
BEGIN
  -- Validate usage type
  IF usage_type_param NOT IN ('ai_summary', 'ai_search', 'export', 'api_call') THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Invalid usage type: ' || usage_type_param
    );
  END IF;

  -- Create unique lock per user+type to prevent race conditions
  lock_key := hashtext(user_uuid::TEXT || usage_type_param);
  PERFORM pg_advisory_xact_lock(lock_key);
  
  -- Get current billing period
  SELECT ps.period_start, ps.period_end 
  INTO period_start_date, period_end_date
  FROM public.get_current_billing_period(user_uuid) ps;
  
  -- Error handling for missing billing period
  IF period_start_date IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'No active billing period found'
    );
  END IF;
  
  -- Get current usage with upsert pattern to handle concurrency
  INSERT INTO public.ai_usage_tracking (
    user_id, usage_type, count, billing_period_start, billing_period_end
  ) VALUES (
    user_uuid, usage_type_param, 0, period_start_date, period_end_date
  )
  ON CONFLICT (user_id, usage_type, billing_period_start) 
  DO NOTHING;
  
  -- Get current count
  SELECT COALESCE(count, 0) INTO current_usage
  FROM public.ai_usage_tracking
  WHERE user_id = user_uuid
    AND usage_type = usage_type_param
    AND billing_period_start = period_start_date;
  
  -- Check if under limit
  is_allowed := current_usage < limit_count;
  
  -- If allowed, increment atomically
  IF is_allowed THEN
    UPDATE public.ai_usage_tracking
    SET count = count + 1
    WHERE user_id = user_uuid
      AND usage_type = usage_type_param
      AND billing_period_start = period_start_date
    RETURNING count INTO current_usage;
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
$function$;