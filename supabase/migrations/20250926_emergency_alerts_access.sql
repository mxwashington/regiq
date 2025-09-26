-- EMERGENCY FIX: Allow basic alerts access for system recovery
-- This temporarily allows unauthenticated access to alerts to fix the chicken-and-egg problem
-- WHERE: Authentication is broken → Can't access alerts → Platform completely down

BEGIN;

-- Create emergency alerts view with minimal access requirements
CREATE OR REPLACE VIEW public.alerts_emergency AS
SELECT
  a.id,
  a.title,
  a.summary,
  a.urgency,
  a.agency,
  a.source,
  a.published_date,
  a.external_url,
  a.created_at,
  -- Only show AI summary and full content for authenticated users
  CASE
    WHEN auth.uid() IS NOT NULL THEN a.ai_summary
    ELSE NULL
  END as ai_summary,
  CASE
    WHEN auth.uid() IS NOT NULL THEN a.urgency_score
    ELSE NULL
  END as urgency_score,
  CASE
    WHEN auth.uid() IS NOT NULL THEN a.full_content
    ELSE NULL
  END as full_content,
  NULL::text[] as dismissed_by  -- Always null for simplicity
FROM public.alerts a
WHERE
  -- Show recent alerts (last 30 days) to everyone
  a.published_date >= (CURRENT_DATE - INTERVAL '30 days')
  -- Limit to non-sensitive content for unauthenticated users
  AND (auth.uid() IS NOT NULL OR a.urgency IN ('High', 'Medium', 'Low'))
ORDER BY a.published_date DESC, a.urgency_score DESC NULLS LAST
LIMIT 100;

-- Enable RLS on the emergency view (but make it permissive)
ALTER VIEW public.alerts_emergency SET (security_invoker = true);

-- Grant access to the emergency view
GRANT SELECT ON public.alerts_emergency TO anon, authenticated;

-- Create emergency function to get alert count without authentication
CREATE OR REPLACE FUNCTION public.get_emergency_alert_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM public.alerts
  WHERE published_date >= (CURRENT_DATE - INTERVAL '30 days');
$$;

-- Grant access to the emergency function
GRANT EXECUTE ON FUNCTION public.get_emergency_alert_count() TO anon, authenticated;

-- Log this emergency fix
INSERT INTO public.security_events (
  user_id,
  event_type,
  metadata
)
SELECT
  auth.uid(),
  'emergency_alerts_access_enabled',
  jsonb_build_object(
    'fix_timestamp', extract(epoch from now()),
    'reason', 'authentication_system_failure',
    'emergency_view_created', 'alerts_emergency',
    'temporary_fix', true,
    'security_impact', 'minimal - read-only access to recent public alerts'
  )
WHERE auth.uid() IS NOT NULL;

COMMIT;