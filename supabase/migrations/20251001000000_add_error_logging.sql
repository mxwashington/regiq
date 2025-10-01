-- ============================================================================
-- Error Logging and Health Monitoring Infrastructure
-- Migration: 20251001000000
--
-- Creates comprehensive error logging and health monitoring tables for
-- RegIQ's regulatory data pipeline. Includes:
-- - error_logs: Structured error logging with severity levels
-- - Zero-results detection trigger
-- - Indexes for fast querying
-- - Row Level Security policies
-- ============================================================================

-- ============================================================================
-- TABLE: error_logs
-- Stores structured error logs from edge functions and data pipelines
-- ============================================================================

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_error_logs_severity
  ON error_logs(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_function
  ON error_logs(function_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_created
  ON error_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_error_type
  ON error_logs(error_type, created_at DESC);

-- Index on JSONB context for filtering by specific context fields
CREATE INDEX IF NOT EXISTS idx_error_logs_context_gin
  ON error_logs USING GIN (context);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
DROP POLICY IF EXISTS "Service role full access" ON error_logs;
CREATE POLICY "Service role full access" ON error_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Authenticated users can read error logs
DROP POLICY IF EXISTS "Authenticated users can read" ON error_logs;
CREATE POLICY "Authenticated users can read" ON error_logs
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE error_logs IS 'Structured error logging for RegIQ edge functions and API calls';
COMMENT ON COLUMN error_logs.function_name IS 'Name of the edge function or service that logged the error';
COMMENT ON COLUMN error_logs.error_type IS 'Type of error (e.g., FDAAPIError, NoResultsError, RSSParseError)';
COMMENT ON COLUMN error_logs.error_message IS 'Human-readable error message';
COMMENT ON COLUMN error_logs.error_stack IS 'Full stack trace of the error';
COMMENT ON COLUMN error_logs.context IS 'Additional context as JSON (endpoint, statusCode, attempt, etc.)';
COMMENT ON COLUMN error_logs.severity IS 'Severity level: info, warning, error, or critical';

-- ============================================================================
-- TRIGGER: Zero-Results Detection
-- Automatically logs critical error when data_freshness shows 0 records fetched
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_zero_results()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if fetch reports success but fetched 0 records
  IF NEW.fetch_status = 'success' AND NEW.records_fetched = 0 THEN
    INSERT INTO error_logs (
      function_name,
      error_type,
      error_message,
      context,
      severity
    ) VALUES (
      'sync_monitor',
      'zero_results',
      'Sync completed successfully but fetched 0 records - possible silent failure',
      jsonb_build_object(
        'source', NEW.source_name,
        'last_attempt', NEW.last_attempt,
        'records_fetched', NEW.records_fetched,
        'endpoint', COALESCE(NEW.endpoint_url, 'unknown')
      ),
      'critical'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS data_freshness_zero_results ON data_freshness;

-- Create trigger on data_freshness table
CREATE TRIGGER data_freshness_zero_results
  AFTER INSERT OR UPDATE ON data_freshness
  FOR EACH ROW
  EXECUTE FUNCTION notify_zero_results();

COMMENT ON FUNCTION notify_zero_results() IS
  'Automatically logs critical error when sync returns 0 records - detects silent failures';

-- ============================================================================
-- HELPER VIEWS
-- ============================================================================

-- View: Recent Critical Errors (last 24 hours)
CREATE OR REPLACE VIEW recent_critical_errors AS
SELECT
  id,
  function_name,
  error_type,
  error_message,
  context,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 AS minutes_ago
FROM error_logs
WHERE
  severity = 'critical'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

COMMENT ON VIEW recent_critical_errors IS
  'Shows critical errors from the last 24 hours with time since occurrence';

-- View: Error Summary by Function (last 7 days)
CREATE OR REPLACE VIEW error_summary_by_function AS
SELECT
  function_name,
  COUNT(*) as total_errors,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE severity = 'error') as error_count,
  COUNT(*) FILTER (WHERE severity = 'warning') as warning_count,
  COUNT(*) FILTER (WHERE severity = 'info') as info_count,
  MAX(created_at) as last_error_at
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY function_name
ORDER BY critical_count DESC, total_errors DESC;

COMMENT ON VIEW error_summary_by_function IS
  'Aggregates errors by function over the last 7 days';

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

-- Function to clean up old error logs (retention: 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_error_logs() IS
  'Deletes error logs older than 30 days. Run via cron job or manually.';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to service role
GRANT ALL ON error_logs TO service_role;
GRANT SELECT ON recent_critical_errors TO service_role;
GRANT SELECT ON error_summary_by_function TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_error_logs() TO service_role;

-- Grant read access to authenticated users
GRANT SELECT ON error_logs TO authenticated;
GRANT SELECT ON recent_critical_errors TO authenticated;
GRANT SELECT ON error_summary_by_function TO authenticated;
