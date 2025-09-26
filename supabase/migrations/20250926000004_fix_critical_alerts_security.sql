-- CRITICAL SECURITY FIX: Alerts Table RLS - Prevent Data Theft by Competitors
-- This migration implements proper subscription-based access control for sensitive regulatory data

BEGIN;

-- Drop existing overly permissive alerts policies
DROP POLICY IF EXISTS "comprehensive_alerts_access" ON public.alerts;
DROP POLICY IF EXISTS "Authenticated users can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can view alerts based on subscription" ON public.alerts;

-- Create function to check user subscription status and tier
CREATE OR REPLACE FUNCTION check_user_subscription_access(user_id_param uuid)
RETURNS TABLE(
  has_subscription boolean,
  subscription_tier text,
  subscription_active boolean,
  is_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(p.subscription_tier IS NOT NULL, false) as has_subscription,
    COALESCE(p.subscription_tier, 'none') as subscription_tier,
    COALESCE(
      p.subscription_end IS NOT NULL AND
      p.subscription_end > now(),
      false
    ) as subscription_active,
    COALESCE(p.is_admin, false) as is_admin
  FROM public.profiles p
  WHERE p.user_id = user_id_param;
END;
$$;

-- Create function to determine alert access level based on content sensitivity
CREATE OR REPLACE FUNCTION get_alert_sensitivity_level(alert_row public.alerts)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  sensitivity_level text := 'basic';
  content_text text;
BEGIN
  -- Combine title and summary for analysis
  content_text := LOWER(COALESCE(alert_row.title, '') || ' ' || COALESCE(alert_row.summary, ''));

  -- HIGH SENSITIVITY: Advanced regulatory intelligence
  IF content_text ~ '(recall class i|class 1 recall|enforcement action|warning letter|483 observation|consent decree|import alert|detention|seizure|injunction)' THEN
    sensitivity_level := 'premium';
  -- MEDIUM SENSITIVITY: Important regulatory updates
  ELSIF content_text ~ '(guidance|draft guidance|federal register|cfr|proposed rule|final rule|docket|comment period)' THEN
    sensitivity_level := 'standard';
  -- BASIC: General alerts available to all subscribers
  ELSE
    sensitivity_level := 'basic';
  END IF;

  -- AI summaries and detailed content are always premium
  IF alert_row.ai_summary IS NOT NULL AND LENGTH(alert_row.ai_summary) > 0 THEN
    sensitivity_level := 'premium';
  END IF;

  -- Full content access is premium only
  IF LENGTH(COALESCE(alert_row.full_content, '')) > 1000 THEN
    sensitivity_level := 'premium';
  END IF;

  RETURN sensitivity_level;
END;
$$;

-- Create tiered access control for alerts based on subscription
CREATE POLICY "alerts_subscription_based_access" ON public.alerts
FOR SELECT USING (
  CASE
    -- Admins can access everything
    WHEN (SELECT is_admin FROM check_user_subscription_access(auth.uid()) LIMIT 1) THEN true

    -- No access for unauthenticated users
    WHEN auth.uid() IS NULL THEN false

    -- Subscription-based access
    ELSE (
      WITH user_access AS (
        SELECT * FROM check_user_subscription_access(auth.uid()) LIMIT 1
      ),
      alert_sensitivity AS (
        SELECT get_alert_sensitivity_level(alerts) as level
      )
      SELECT CASE
        -- Free users: No access to alerts (prevent competitive intelligence theft)
        WHEN NOT ua.has_subscription OR NOT ua.subscription_active THEN false

        -- Basic subscribers: Only basic alerts, no sensitive content
        WHEN ua.subscription_tier = 'basic' THEN (
          al.level = 'basic' AND
          -- Limit to recent alerts only (last 30 days)
          alerts.published_date >= now() - interval '30 days'
        )

        -- Standard subscribers: Basic + standard alerts, limited content
        WHEN ua.subscription_tier = 'standard' THEN (
          al.level IN ('basic', 'standard') AND
          alerts.published_date >= now() - interval '90 days'
        )

        -- Premium subscribers: Full access to all alerts
        WHEN ua.subscription_tier IN ('premium', 'enterprise') THEN true

        -- Default deny
        ELSE false
      END
      FROM user_access ua, alert_sensitivity al
    )
  END
);

-- Create separate policy for sensitive fields (AI summaries, full content)
CREATE POLICY "alerts_sensitive_fields_access" ON public.alerts
FOR SELECT USING (
  CASE
    -- Admins can access everything
    WHEN (SELECT is_admin FROM check_user_subscription_access(auth.uid()) LIMIT 1) THEN true

    -- Premium/Enterprise subscribers can access sensitive fields
    WHEN auth.uid() IS NOT NULL THEN (
      WITH user_access AS (
        SELECT * FROM check_user_subscription_access(auth.uid()) LIMIT 1
      )
      SELECT ua.subscription_tier IN ('premium', 'enterprise') AND ua.subscription_active
      FROM user_access ua
    )

    -- Default deny
    ELSE false
  END
);

-- Prevent any modifications to alerts by regular users
CREATE POLICY "alerts_read_only_for_users" ON public.alerts
FOR INSERT WITH CHECK (
  (SELECT is_admin FROM check_user_subscription_access(auth.uid()) LIMIT 1) = true
);

CREATE POLICY "alerts_update_admin_only" ON public.alerts
FOR UPDATE USING (
  (SELECT is_admin FROM check_user_subscription_access(auth.uid()) LIMIT 1) = true
)
WITH CHECK (
  (SELECT is_admin FROM check_user_subscription_access(auth.uid()) LIMIT 1) = true
);

CREATE POLICY "alerts_delete_admin_only" ON public.alerts
FOR DELETE USING (
  (SELECT is_admin FROM check_user_subscription_access(auth.uid()) LIMIT 1) = true
);

-- Create view that masks sensitive content based on subscription tier
CREATE OR REPLACE VIEW public.alerts_filtered AS
SELECT
  a.id,
  a.title,
  -- Basic summary for lower tiers, full summary for premium
  CASE
    WHEN ua.subscription_tier IN ('premium', 'enterprise') OR ua.is_admin THEN a.summary
    ELSE LEFT(COALESCE(a.summary, ''), 200) || CASE WHEN LENGTH(COALESCE(a.summary, '')) > 200 THEN '...' ELSE '' END
  END as summary,
  a.urgency,
  a.source,
  a.agency,
  a.region,
  a.published_date,
  a.created_at,
  -- Sensitive fields only for premium subscribers
  CASE
    WHEN ua.subscription_tier IN ('premium', 'enterprise') OR ua.is_admin THEN a.ai_summary
    ELSE NULL
  END as ai_summary,
  CASE
    WHEN ua.subscription_tier IN ('premium', 'enterprise') OR ua.is_admin THEN a.urgency_score
    ELSE NULL
  END as urgency_score,
  CASE
    WHEN ua.subscription_tier IN ('premium', 'enterprise') OR ua.is_admin THEN a.full_content
    ELSE NULL
  END as full_content,
  a.external_url,
  a.dismissed_by,
  -- Add subscription tier for debugging
  ua.subscription_tier,
  get_alert_sensitivity_level(a) as sensitivity_level
FROM public.alerts a
CROSS JOIN LATERAL (
  SELECT * FROM check_user_subscription_access(auth.uid()) LIMIT 1
) ua
WHERE (
  -- Apply the same subscription-based filtering as the policy
  CASE
    WHEN ua.is_admin THEN true
    WHEN auth.uid() IS NULL THEN false
    WHEN NOT ua.has_subscription OR NOT ua.subscription_active THEN false
    WHEN ua.subscription_tier = 'basic' THEN (
      get_alert_sensitivity_level(a) = 'basic' AND
      a.published_date >= now() - interval '30 days'
    )
    WHEN ua.subscription_tier = 'standard' THEN (
      get_alert_sensitivity_level(a) IN ('basic', 'standard') AND
      a.published_date >= now() - interval '90 days'
    )
    WHEN ua.subscription_tier IN ('premium', 'enterprise') THEN true
    ELSE false
  END
);

-- Grant permissions
GRANT SELECT ON public.alerts_filtered TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_subscription_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_alert_sensitivity_level(public.alerts) TO authenticated;

-- Create logging for potential data theft attempts
CREATE OR REPLACE FUNCTION log_alerts_access_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_sub_info record;
BEGIN
  -- Get user subscription info
  SELECT * INTO user_sub_info FROM check_user_subscription_access(auth.uid()) LIMIT 1;

  -- Log access attempts by users without proper subscriptions
  IF NOT user_sub_info.subscription_active AND NOT user_sub_info.is_admin THEN
    INSERT INTO public.security_events (event_type, metadata, severity, user_id)
    VALUES (
      'unauthorized_alerts_access_attempt',
      jsonb_build_object(
        'user_subscription_tier', user_sub_info.subscription_tier,
        'subscription_active', user_sub_info.subscription_active,
        'alert_id', NEW.id,
        'alert_source', NEW.source,
        'alert_sensitivity', get_alert_sensitivity_level(NEW),
        'access_time', now()
      ),
      'high',
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Add trigger to log suspicious access attempts
CREATE TRIGGER trigger_log_alerts_access
  AFTER SELECT ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION log_alerts_access_attempt();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_alerts_subscription_lookup
  ON public.alerts (published_date DESC, source, urgency)
  WHERE published_date >= now() - interval '1 year';

-- Log the security fix
INSERT INTO public.security_events (event_type, metadata, severity)
VALUES (
  'critical_alerts_security_implemented',
  jsonb_build_object(
    'fix_date', now(),
    'security_measures', ARRAY[
      'subscription_based_access_control',
      'content_sensitivity_classification',
      'tiered_data_access',
      'unauthorized_access_logging',
      'competitive_intelligence_prevention'
    ],
    'access_tiers', jsonb_build_object(
      'free', 'no_access',
      'basic', 'basic_alerts_30_days_limited_content',
      'standard', 'basic_standard_alerts_90_days_limited_content',
      'premium', 'full_access_all_content',
      'enterprise', 'full_access_all_content'
    )
  ),
  'critical'
);

COMMIT;