-- Fix Analytics Dashboard - Create missing functions and ensure proper data access
-- This fixes the "Unable to load analytics" issue in the admin dashboard

BEGIN;

-- Create missing analytics overview function
CREATE OR REPLACE FUNCTION get_analytics_overview(days_back integer DEFAULT 30)
RETURNS jsonb[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  cutoff_date timestamp with time zone;
  overview_result jsonb;
  result_array jsonb[];
BEGIN
  -- Calculate cutoff date
  cutoff_date := now() - (days_back || ' days')::interval;

  -- Build overview data from available tables
  WITH analytics_data AS (
    -- Get page views and sessions from user_analytics
    SELECT
      COUNT(CASE WHEN event_name = 'page_view' THEN 1 END) as total_page_views,
      COUNT(DISTINCT user_id) as unique_visitors,
      AVG(
        CASE
          WHEN metadata->>'session_duration' IS NOT NULL
          THEN (metadata->>'session_duration')::numeric
          ELSE NULL
        END
      ) as avg_session_duration,
      -- Calculate bounce rate (simplified)
      CASE
        WHEN COUNT(*) > 0
        THEN ROUND(
          (COUNT(CASE WHEN event_name = 'page_view' THEN 1 END)::numeric / COUNT(*)::numeric) * 100,
          2
        )
        ELSE 0
      END as bounce_rate
    FROM user_analytics
    WHERE created_at >= cutoff_date
  ),
  -- Get top pages from user_analytics
  top_pages_data AS (
    SELECT
      COALESCE(metadata->>'page', '/') as page,
      COUNT(*) as views
    FROM user_analytics
    WHERE created_at >= cutoff_date
      AND event_name = 'page_view'
    GROUP BY COALESCE(metadata->>'page', '/')
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ),
  -- Get user growth from profiles
  user_growth_data AS (
    SELECT
      DATE(created_at) as date,
      COUNT(*) as new_users
    FROM profiles
    WHERE created_at >= cutoff_date
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
    LIMIT 30
  ),
  -- Get device breakdown from user_analytics metadata
  device_data AS (
    SELECT
      COALESCE(metadata->>'device_type', 'unknown') as device,
      COUNT(*) as count
    FROM user_analytics
    WHERE created_at >= cutoff_date
      AND metadata->>'device_type' IS NOT NULL
    GROUP BY COALESCE(metadata->>'device_type', 'unknown')
  )
  SELECT jsonb_build_object(
    'total_page_views', COALESCE(ad.total_page_views, 0),
    'unique_visitors', COALESCE(ad.unique_visitors, 0),
    'avg_session_duration', COALESCE(ad.avg_session_duration, 0),
    'bounce_rate', COALESCE(ad.bounce_rate, 0),
    'top_pages', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('page', page, 'views', views))
       FROM top_pages_data),
      '[]'::jsonb
    ),
    'user_growth', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('date', date, 'new_users', new_users))
       FROM user_growth_data),
      '[]'::jsonb
    ),
    'device_breakdown', COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('device', device, 'count', count))
       FROM device_data),
      '[]'::jsonb
    )
  ) INTO overview_result
  FROM analytics_data ad;

  -- Return as array (expected by the frontend)
  result_array := ARRAY[overview_result];
  RETURN result_array;
END;
$$;

-- Create analytics summary function for dashboard metrics
CREATE OR REPLACE FUNCTION get_dashboard_metrics(days_back integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  cutoff_date timestamp with time zone;
  metrics_result jsonb;
BEGIN
  cutoff_date := now() - (days_back || ' days')::interval;

  WITH dashboard_data AS (
    -- User metrics
    SELECT
      COUNT(DISTINCT p.user_id) as total_users,
      COUNT(DISTINCT CASE WHEN p.subscription_tier IS NOT NULL THEN p.user_id END) as paid_users,
      COUNT(DISTINCT CASE WHEN p.created_at >= cutoff_date THEN p.user_id END) as new_users_this_period,
      -- Alert metrics
      (SELECT COUNT(*) FROM alerts WHERE created_at >= cutoff_date) as new_alerts_this_period,
      (SELECT COUNT(DISTINCT user_id) FROM alert_interactions WHERE created_at >= cutoff_date) as active_alert_users,
      -- Search metrics
      (SELECT COUNT(*) FROM search_analytics WHERE created_at >= cutoff_date) as total_searches_this_period,
      (SELECT COUNT(DISTINCT user_id) FROM search_analytics WHERE created_at >= cutoff_date) as active_search_users,
      -- Usage metrics
      (SELECT COUNT(*) FROM user_analytics WHERE created_at >= cutoff_date) as total_events_this_period,
      (SELECT COUNT(*) FROM usage_logs WHERE created_at >= cutoff_date) as feature_usage_this_period
    FROM profiles p
  )
  SELECT jsonb_build_object(
    'total_users', COALESCE(dd.total_users, 0),
    'paid_users', COALESCE(dd.paid_users, 0),
    'new_users_this_period', COALESCE(dd.new_users_this_period, 0),
    'new_alerts_this_period', COALESCE(dd.new_alerts_this_period, 0),
    'active_alert_users', COALESCE(dd.active_alert_users, 0),
    'total_searches_this_period', COALESCE(dd.total_searches_this_period, 0),
    'active_search_users', COALESCE(dd.active_search_users, 0),
    'total_events_this_period', COALESCE(dd.total_events_this_period, 0),
    'feature_usage_this_period', COALESCE(dd.feature_usage_this_period, 0),
    'period_days', days_back,
    'generated_at', now()
  ) INTO metrics_result
  FROM dashboard_data dd;

  RETURN metrics_result;
END;
$$;

-- Create comprehensive analytics function for admin insights
CREATE OR REPLACE FUNCTION get_admin_analytics_insights(days_back integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  cutoff_date timestamp with time zone;
  is_user_admin boolean;
  insights_result jsonb;
BEGIN
  -- Check if current user is admin
  SELECT COALESCE(is_admin, false) INTO is_user_admin
  FROM profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF NOT is_user_admin THEN
    RAISE EXCEPTION 'Insufficient privileges: Admin access required';
  END IF;

  cutoff_date := now() - (days_back || ' days')::interval;

  WITH comprehensive_data AS (
    SELECT
      -- User engagement metrics
      COUNT(DISTINCT ua.user_id) as active_users,
      COUNT(ua.*) as total_events,
      COUNT(DISTINCT DATE(ua.created_at)) as active_days,

      -- Alert engagement
      (SELECT COUNT(*) FROM alert_interactions ai WHERE ai.created_at >= cutoff_date) as alert_interactions,
      (SELECT COUNT(DISTINCT ai.alert_id) FROM alert_interactions ai WHERE ai.created_at >= cutoff_date) as unique_alerts_interacted,

      -- Search activity
      (SELECT COUNT(*) FROM search_analytics sa WHERE sa.created_at >= cutoff_date) as search_queries,
      (SELECT COUNT(DISTINCT sa.search_query) FROM search_analytics sa WHERE sa.created_at >= cutoff_date) as unique_search_queries,

      -- Feature usage
      (SELECT COUNT(*) FROM usage_logs ul WHERE ul.created_at >= cutoff_date) as feature_usages,
      (SELECT COUNT(DISTINCT ul.feature_name) FROM usage_logs ul WHERE ul.created_at >= cutoff_date) as unique_features_used,

      -- Security events
      (SELECT COUNT(*) FROM security_events se WHERE se.created_at >= cutoff_date) as security_events,
      (SELECT COUNT(*) FROM security_events se WHERE se.created_at >= cutoff_date AND se.severity IN ('high', 'critical')) as critical_security_events

    FROM user_analytics ua
    WHERE ua.created_at >= cutoff_date
  ),
  top_features AS (
    SELECT
      feature_name,
      COUNT(*) as usage_count,
      COUNT(DISTINCT user_id) as unique_users
    FROM usage_logs
    WHERE created_at >= cutoff_date
    GROUP BY feature_name
    ORDER BY COUNT(*) DESC
    LIMIT 10
  ),
  top_alerts AS (
    SELECT
      a.title,
      a.source,
      COUNT(ai.*) as interaction_count,
      COUNT(DISTINCT ai.user_id) as unique_users
    FROM alert_interactions ai
    JOIN alerts a ON a.id = ai.alert_id
    WHERE ai.created_at >= cutoff_date
    GROUP BY a.id, a.title, a.source
    ORDER BY COUNT(ai.*) DESC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'active_users', COALESCE(cd.active_users, 0),
      'total_events', COALESCE(cd.total_events, 0),
      'active_days', COALESCE(cd.active_days, 0),
      'alert_interactions', COALESCE(cd.alert_interactions, 0),
      'search_queries', COALESCE(cd.search_queries, 0),
      'feature_usages', COALESCE(cd.feature_usages, 0),
      'security_events', COALESCE(cd.security_events, 0),
      'critical_security_events', COALESCE(cd.critical_security_events, 0)
    ),
    'top_features', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'feature_name', tf.feature_name,
          'usage_count', tf.usage_count,
          'unique_users', tf.unique_users
        )
      ) FROM top_features tf),
      '[]'::jsonb
    ),
    'top_alerts', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'title', ta.title,
          'source', ta.source,
          'interaction_count', ta.interaction_count,
          'unique_users', ta.unique_users
        )
      ) FROM top_alerts ta),
      '[]'::jsonb
    ),
    'period_days', days_back,
    'generated_at', now()
  ) INTO insights_result
  FROM comprehensive_data cd;

  RETURN insights_result;
END;
$$;

-- Create simplified analytics function for quick dashboard loading
CREATE OR REPLACE FUNCTION get_quick_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  stats_result jsonb;
BEGIN
  WITH quick_stats AS (
    SELECT
      -- User counts
      (SELECT COUNT(*) FROM profiles) as total_users,
      (SELECT COUNT(*) FROM profiles WHERE subscription_tier IS NOT NULL) as paid_users,
      (SELECT COUNT(*) FROM profiles WHERE created_at >= now() - interval '7 days') as new_users_week,

      -- Alert counts
      (SELECT COUNT(*) FROM alerts) as total_alerts,
      (SELECT COUNT(*) FROM alerts WHERE created_at >= now() - interval '24 hours') as new_alerts_today,

      -- Recent activity
      (SELECT COUNT(*) FROM user_analytics WHERE created_at >= now() - interval '24 hours') as events_today,
      (SELECT COUNT(*) FROM security_events WHERE created_at >= now() - interval '7 days') as security_events_week,

      -- System health
      (SELECT COUNT(*) FROM security_events WHERE severity = 'critical' AND created_at >= now() - interval '24 hours') as critical_issues_today
  )
  SELECT jsonb_build_object(
    'users', jsonb_build_object(
      'total', COALESCE(qs.total_users, 0),
      'paid', COALESCE(qs.paid_users, 0),
      'new_this_week', COALESCE(qs.new_users_week, 0)
    ),
    'alerts', jsonb_build_object(
      'total', COALESCE(qs.total_alerts, 0),
      'new_today', COALESCE(qs.new_alerts_today, 0)
    ),
    'activity', jsonb_build_object(
      'events_today', COALESCE(qs.events_today, 0),
      'security_events_week', COALESCE(qs.security_events_week, 0)
    ),
    'health', jsonb_build_object(
      'critical_issues_today', COALESCE(qs.critical_issues_today, 0),
      'status', CASE
        WHEN COALESCE(qs.critical_issues_today, 0) = 0 THEN 'healthy'
        WHEN COALESCE(qs.critical_issues_today, 0) <= 5 THEN 'warning'
        ELSE 'critical'
      END
    ),
    'last_updated', now()
  ) INTO stats_result
  FROM quick_stats qs;

  RETURN stats_result;
END;
$$;

-- Ensure RLS policies allow admin access to analytics tables
-- Update user_analytics RLS
DROP POLICY IF EXISTS "Users can view their own analytics data" ON public.user_analytics;
CREATE POLICY "enhanced_user_analytics_access" ON public.user_analytics
FOR SELECT USING (
  CASE
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true
    ELSE auth.uid() = user_id
  END
);

-- Update alert_interactions RLS
DROP POLICY IF EXISTS "Users can view their own alert interactions" ON public.alert_interactions;
CREATE POLICY "enhanced_alert_interactions_access" ON public.alert_interactions
FOR SELECT USING (
  CASE
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true
    ELSE auth.uid() = user_id
  END
);

-- Update search_analytics RLS
DROP POLICY IF EXISTS "Users can view their own search analytics" ON public.search_analytics;
CREATE POLICY "enhanced_search_analytics_access" ON public.search_analytics
FOR SELECT USING (
  CASE
    WHEN (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid() LIMIT 1) = true THEN true
    ELSE auth.uid() = user_id
  END
);

-- Grant execute permissions on analytics functions
GRANT EXECUTE ON FUNCTION get_analytics_overview(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_metrics(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_analytics_insights(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_quick_dashboard_stats() TO authenticated;

-- Create a view for easy analytics access
CREATE OR REPLACE VIEW public.analytics_summary AS
SELECT
  'overview'::text as metric_type,
  jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'active_users_7d', (SELECT COUNT(DISTINCT user_id) FROM user_analytics WHERE created_at >= now() - interval '7 days'),
    'total_alerts', (SELECT COUNT(*) FROM alerts),
    'total_searches', (SELECT COUNT(*) FROM search_analytics WHERE created_at >= now() - interval '30 days'),
    'system_health', CASE
      WHEN (SELECT COUNT(*) FROM security_events WHERE severity = 'critical' AND created_at >= now() - interval '24 hours') = 0
      THEN 'healthy'
      ELSE 'attention_needed'
    END,
    'last_calculated', now()
  ) as metrics;

GRANT SELECT ON public.analytics_summary TO authenticated;

-- Log the analytics fix
INSERT INTO public.security_events (event_type, metadata, severity)
VALUES (
  'analytics_dashboard_functionality_restored',
  jsonb_build_object(
    'fix_date', now(),
    'fixes_applied', ARRAY[
      'created_get_analytics_overview_function',
      'created_get_dashboard_metrics_function',
      'created_get_admin_analytics_insights_function',
      'created_get_quick_dashboard_stats_function',
      'enhanced_rls_policies_for_analytics_tables',
      'created_analytics_summary_view'
    ],
    'functions_created', ARRAY[
      'get_analytics_overview',
      'get_dashboard_metrics',
      'get_admin_analytics_insights',
      'get_quick_dashboard_stats'
    ],
    'admin_access_enabled', true
  ),
  'medium'
);

COMMIT;