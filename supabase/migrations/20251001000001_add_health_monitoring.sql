-- ============================================================================
-- Health Check and Monitoring Infrastructure
-- Migration: 20251001000001
--
-- Creates comprehensive health check monitoring for external APIs.
-- Includes:
-- - api_health_checks: Track API endpoint health over time
-- - sync_health_dashboard: Materialized view for real-time monitoring
-- - Cron jobs for automated health checks
-- - Indexes for fast querying
-- ============================================================================

-- ============================================================================
-- TABLE: api_health_checks
-- Stores health check results for all external APIs
-- ============================================================================

CREATE TABLE IF NOT EXISTS api_health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_api_health_api_name
  ON api_health_checks(api_name, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_health_status
  ON api_health_checks(status, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_api_health_checked
  ON api_health_checks(checked_at DESC);

-- Composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_api_health_name_status_time
  ON api_health_checks(api_name, status, checked_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE api_health_checks ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
DROP POLICY IF EXISTS "Service role full access" ON api_health_checks;
CREATE POLICY "Service role full access" ON api_health_checks
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Authenticated users can read health checks
DROP POLICY IF EXISTS "Authenticated users can read" ON api_health_checks;
CREATE POLICY "Authenticated users can read" ON api_health_checks
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE api_health_checks IS 'Tracks health status of external APIs (FDA, CDC, USDA, etc.)';
COMMENT ON COLUMN api_health_checks.api_name IS 'Human-readable API name (e.g., "FDA Food Enforcement")';
COMMENT ON COLUMN api_health_checks.endpoint IS 'Full API endpoint URL';
COMMENT ON COLUMN api_health_checks.status IS 'Health status: healthy, degraded (slow/rate limited), or unhealthy (down)';
COMMENT ON COLUMN api_health_checks.status_code IS 'HTTP status code from API response';
COMMENT ON COLUMN api_health_checks.response_time_ms IS 'Response time in milliseconds';
COMMENT ON COLUMN api_health_checks.error_message IS 'Error message if status is degraded or unhealthy';

-- ============================================================================
-- MATERIALIZED VIEW: sync_health_dashboard
-- Real-time dashboard view of sync health across all sources
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS sync_health_dashboard AS
SELECT
  df.source_name,
  df.last_attempt,
  df.last_successful_fetch,
  df.fetch_status,
  df.records_fetched,
  df.error_message,
  -- Calculate time since last successful fetch
  EXTRACT(EPOCH FROM (NOW() - df.last_successful_fetch)) / 3600 AS hours_since_success,
  -- Count recent errors (last 24 hours)
  (
    SELECT COUNT(*)
    FROM error_logs el
    WHERE el.function_name LIKE '%' || df.source_name || '%'
      AND el.severity IN ('error', 'critical')
      AND el.created_at > NOW() - INTERVAL '24 hours'
  ) AS error_count_24h,
  -- Get latest API health status
  (
    SELECT status
    FROM api_health_checks ahc
    WHERE ahc.api_name = df.source_name
    ORDER BY ahc.checked_at DESC
    LIMIT 1
  ) AS api_health_status,
  -- Overall health indicator
  CASE
    WHEN df.fetch_status = 'success' AND df.records_fetched > 0 THEN 'healthy'
    WHEN df.fetch_status = 'success' AND df.records_fetched = 0 THEN 'degraded'
    WHEN df.fetch_status = 'error' THEN 'unhealthy'
    ELSE 'unknown'
  END AS overall_health
FROM data_freshness df
ORDER BY df.last_attempt DESC;

-- Index on materialized view for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_health_source
  ON sync_health_dashboard(source_name);

CREATE INDEX IF NOT EXISTS idx_sync_health_status
  ON sync_health_dashboard(overall_health, last_attempt DESC);

COMMENT ON MATERIALIZED VIEW sync_health_dashboard IS
  'Real-time dashboard view of sync health across all regulatory data sources';

-- ============================================================================
-- VIEW: api_health_summary
-- Current health status of all APIs (last check only)
-- ============================================================================

CREATE OR REPLACE VIEW api_health_summary AS
SELECT DISTINCT ON (api_name)
  api_name,
  status,
  status_code,
  response_time_ms,
  error_message,
  checked_at,
  EXTRACT(EPOCH FROM (NOW() - checked_at)) / 60 AS minutes_since_check
FROM api_health_checks
ORDER BY api_name, checked_at DESC;

COMMENT ON VIEW api_health_summary IS
  'Shows current health status of all APIs (most recent check only)';

-- ============================================================================
-- VIEW: api_uptime_stats
-- Calculate uptime percentage for each API over last 7 days
-- ============================================================================

CREATE OR REPLACE VIEW api_uptime_stats AS
SELECT
  api_name,
  COUNT(*) as total_checks,
  COUNT(*) FILTER (WHERE status = 'healthy') as healthy_checks,
  COUNT(*) FILTER (WHERE status = 'degraded') as degraded_checks,
  COUNT(*) FILTER (WHERE status = 'unhealthy') as unhealthy_checks,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'healthy')::NUMERIC / COUNT(*)) * 100,
    2
  ) as uptime_percentage,
  MIN(checked_at) as first_check,
  MAX(checked_at) as last_check
FROM api_health_checks
WHERE checked_at > NOW() - INTERVAL '7 days'
GROUP BY api_name
ORDER BY uptime_percentage ASC;

COMMENT ON VIEW api_uptime_stats IS
  'Calculates uptime percentage for each API over the last 7 days';

-- ============================================================================
-- FUNCTION: refresh_sync_health_dashboard
-- Refreshes the materialized view (called by cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_sync_health_dashboard()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sync_health_dashboard;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_sync_health_dashboard() IS
  'Refreshes sync_health_dashboard materialized view - run via cron every 5 minutes';

-- ============================================================================
-- FUNCTION: cleanup_old_health_checks
-- Deletes health checks older than 30 days
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_health_checks()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_health_checks
  WHERE checked_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_health_checks() IS
  'Deletes health check records older than 30 days - run via cron weekly';

-- ============================================================================
-- CRON JOBS
-- Requires pg_cron extension
-- ============================================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule: Refresh dashboard every 5 minutes
SELECT cron.schedule(
  'refresh-sync-dashboard',
  '*/5 * * * *',
  $$SELECT refresh_sync_health_dashboard();$$
);

-- Schedule: Cleanup old health checks weekly (Sunday at 2 AM)
SELECT cron.schedule(
  'cleanup-health-checks',
  '0 2 * * 0',
  $$SELECT cleanup_old_health_checks();$$
);

-- Schedule: Cleanup old error logs weekly (Sunday at 3 AM)
SELECT cron.schedule(
  'cleanup-error-logs',
  '0 3 * * 0',
  $$SELECT cleanup_old_error_logs();$$
);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT ALL ON api_health_checks TO service_role;
GRANT SELECT ON sync_health_dashboard TO service_role;
GRANT SELECT ON api_health_summary TO service_role;
GRANT SELECT ON api_uptime_stats TO service_role;
GRANT EXECUTE ON FUNCTION refresh_sync_health_dashboard() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_health_checks() TO service_role;

-- Grant read access to authenticated users
GRANT SELECT ON api_health_checks TO authenticated;
GRANT SELECT ON sync_health_dashboard TO authenticated;
GRANT SELECT ON api_health_summary TO authenticated;
GRANT SELECT ON api_uptime_stats TO authenticated;
