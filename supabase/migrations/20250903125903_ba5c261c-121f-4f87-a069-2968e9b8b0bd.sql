-- Update the subscription plan constraint to allow basic plan
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_subscription_plan_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_subscription_plan_check 
CHECK (subscription_plan = ANY (ARRAY['basic'::text, 'starter'::text, 'professional'::text, 'enterprise'::text]));

-- Update existing users to basic plan with strict limits
UPDATE public.profiles 
SET subscription_plan = 'basic',
    plan_limits = jsonb_build_object(
      'queries_per_month', 50,
      'alerts_per_day', 10,
      'saved_searches', 5,
      'api_access', false,
      'advanced_filters', false,
      'bulk_export', false,
      'custom_notifications', false,
      'priority_support', false
    )
WHERE subscription_plan = 'starter' OR subscription_plan IS NULL;

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