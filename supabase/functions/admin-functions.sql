-- Admin Dashboard RPC Functions
-- Essential database functions for the admin dashboard

-- Create admin_operations table for logging
CREATE TABLE IF NOT EXISTS public.admin_operations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type TEXT NOT NULL,
  performed_by UUID REFERENCES public.profiles(id),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_config table
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_schedule TEXT DEFAULT '0 */4 * * *',
  max_alerts_per_sync INTEGER DEFAULT 1000,
  retention_days INTEGER DEFAULT 365,
  auto_dedupe_enabled BOOLEAN DEFAULT true,
  rate_limit_per_hour INTEGER DEFAULT 1000,
  maintenance_mode BOOLEAN DEFAULT false,
  webhook_url TEXT,
  notification_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default config if none exists
INSERT INTO public.system_config (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.system_config);

-- Function to get sources health
CREATE OR REPLACE FUNCTION get_sources_health()
RETURNS TABLE (
  source TEXT,
  last_success TIMESTAMP WITH TIME ZONE,
  last_failure TIMESTAMP WITH TIME ZONE,
  last_24h_inserts BIGINT,
  last_24h_failures BIGINT,
  status TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH source_stats AS (
    SELECT
      a.source,
      COUNT(*) FILTER (WHERE a.created_at >= NOW() - INTERVAL '24 hours') as inserts_24h,
      MAX(sl_success.run_finished) as last_success,
      MAX(sl_failure.run_finished) as last_failure,
      COUNT(*) FILTER (WHERE sl_failure.status = 'failure' AND sl_failure.run_started >= NOW() - INTERVAL '24 hours') as failures_24h
    FROM alerts a
    LEFT JOIN sync_logs sl_success ON sl_success.source = a.source AND sl_success.status = 'success'
    LEFT JOIN sync_logs sl_failure ON sl_failure.source = a.source AND sl_failure.status = 'failure'
    GROUP BY a.source
  )
  SELECT
    ss.source,
    ss.last_success,
    ss.last_failure,
    ss.inserts_24h,
    ss.failures_24h,
    CASE
      WHEN ss.last_success IS NULL THEN 'unknown'
      WHEN ss.failures_24h > 5 THEN 'unhealthy'
      WHEN ss.last_success < NOW() - INTERVAL '6 hours' THEN 'unhealthy'
      ELSE 'healthy'
    END as status
  FROM source_stats ss;
END;
$$;

-- Function to get daily alert counts for sparkline
CREATE OR REPLACE FUNCTION get_daily_alert_counts(start_date DATE, end_date DATE)
RETURNS TABLE (
  date TEXT,
  alerts BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(start_date::date, end_date::date, '1 day'::interval)::date as day
  )
  SELECT
    ds.day::text as date,
    COALESCE(COUNT(a.id), 0) as alerts
  FROM date_series ds
  LEFT JOIN alerts a ON DATE(a.date_published) = ds.day
  GROUP BY ds.day
  ORDER BY ds.day;
END;
$$;

-- Function to count potential duplicates
CREATE OR REPLACE FUNCTION count_potential_duplicates()
RETURNS BIGINT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  duplicate_count BIGINT;
BEGIN
  SELECT COUNT(*) - COUNT(DISTINCT external_id, source)
  INTO duplicate_count
  FROM alerts
  WHERE external_id IS NOT NULL;

  RETURN COALESCE(duplicate_count, 0);
END;
$$;

-- Function to get health status
CREATE OR REPLACE FUNCTION get_health_status()
RETURNS TABLE (
  name TEXT,
  source TEXT,
  status TEXT,
  latency INTEGER,
  message TEXT,
  lastChecked TIMESTAMP WITH TIME ZONE,
  lastSuccess TIMESTAMP WITH TIME ZONE,
  lastFailure TIMESTAMP WITH TIME ZONE,
  successRate24h NUMERIC,
  totalChecks24h BIGINT,
  failedChecks24h BIGINT,
  avgLatency24h NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH health_metrics AS (
    SELECT
      COALESCE(a.source, 'Unknown') as source_name,
      a.source,
      CASE
        WHEN MAX(sl_success.run_finished) IS NULL THEN 'unknown'
        WHEN COUNT(*) FILTER (WHERE sl.status = 'failure' AND sl.run_started >= NOW() - INTERVAL '24 hours') > 3 THEN 'unhealthy'
        WHEN MAX(sl_success.run_finished) < NOW() - INTERVAL '6 hours' THEN 'unhealthy'
        ELSE 'healthy'
      END as health_status,
      COALESCE(EXTRACT(EPOCH FROM (NOW() - MAX(sl_success.run_finished)))::integer * 1000, 5000) as response_latency,
      CASE
        WHEN MAX(sl_success.run_finished) IS NULL THEN 'No successful syncs recorded'
        WHEN MAX(sl_success.run_finished) < NOW() - INTERVAL '6 hours' THEN 'Last sync over 6 hours ago'
        ELSE 'Operating normally'
      END as status_message,
      NOW() as last_checked,
      MAX(sl_success.run_finished) as last_success_time,
      MAX(sl_failure.run_finished) as last_failure_time,
      CASE
        WHEN COUNT(*) FILTER (WHERE sl.run_started >= NOW() - INTERVAL '24 hours') = 0 THEN 100
        ELSE (COUNT(*) FILTER (WHERE sl.status = 'success' AND sl.run_started >= NOW() - INTERVAL '24 hours')::numeric /
              COUNT(*) FILTER (WHERE sl.run_started >= NOW() - INTERVAL '24 hours')::numeric * 100)
      END as success_rate,
      COUNT(*) FILTER (WHERE sl.run_started >= NOW() - INTERVAL '24 hours') as total_checks,
      COUNT(*) FILTER (WHERE sl.status = 'failure' AND sl.run_started >= NOW() - INTERVAL '24 hours') as failed_checks,
      AVG(EXTRACT(EPOCH FROM (sl.run_finished - sl.run_started))::numeric * 1000) FILTER (WHERE sl.run_finished IS NOT NULL AND sl.run_started >= NOW() - INTERVAL '24 hours') as avg_latency
    FROM (SELECT DISTINCT source FROM alerts WHERE source IS NOT NULL) a
    LEFT JOIN sync_logs sl ON sl.source = a.source
    LEFT JOIN sync_logs sl_success ON sl_success.source = a.source AND sl_success.status = 'success'
    LEFT JOIN sync_logs sl_failure ON sl_failure.source = a.source AND sl_failure.status = 'failure'
    GROUP BY a.source
  )
  SELECT
    hm.source_name,
    hm.source,
    hm.health_status,
    hm.response_latency,
    hm.status_message,
    hm.last_checked,
    hm.last_success_time,
    hm.last_failure_time,
    hm.success_rate,
    hm.total_checks,
    hm.failed_checks,
    hm.avg_latency
  FROM health_metrics hm;
END;
$$;

-- Function to run health check
CREATE OR REPLACE FUNCTION run_health_check(triggered_by TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Insert health check operation
  INSERT INTO admin_operations (operation_type, details)
  VALUES ('health_check', jsonb_build_object('triggered_by', triggered_by, 'timestamp', NOW()));

  -- Return health status
  SELECT jsonb_build_object(
    'status', 'completed',
    'timestamp', NOW(),
    'triggered_by', triggered_by
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to trigger manual sync
CREATE OR REPLACE FUNCTION trigger_manual_sync(
  days_back INTEGER DEFAULT 1,
  source_filter TEXT[] DEFAULT NULL,
  triggered_by TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  sync_id UUID;
  result JSONB;
BEGIN
  -- Generate sync ID
  sync_id := gen_random_uuid();

  -- Insert sync operation
  INSERT INTO admin_operations (operation_type, details)
  VALUES ('manual_sync', jsonb_build_object(
    'sync_id', sync_id,
    'days_back', days_back,
    'source_filter', source_filter,
    'triggered_by', triggered_by,
    'timestamp', NOW()
  ));

  -- Insert sync log entry
  INSERT INTO sync_logs (id, source, status, trigger_type, triggered_by, run_started)
  VALUES (sync_id, 'manual', 'running', 'manual', triggered_by, NOW());

  -- Return sync information
  SELECT jsonb_build_object(
    'sync_id', sync_id,
    'status', 'initiated',
    'message', 'Manual sync started',
    'results', jsonb_build_array()
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to trigger backfill
CREATE OR REPLACE FUNCTION trigger_backfill(
  days_back INTEGER DEFAULT 30,
  source_filter TEXT[] DEFAULT NULL,
  triggered_by TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  backfill_id UUID;
  result JSONB;
BEGIN
  -- Generate backfill ID
  backfill_id := gen_random_uuid();

  -- Insert backfill operation
  INSERT INTO admin_operations (operation_type, details)
  VALUES ('backfill', jsonb_build_object(
    'backfill_id', backfill_id,
    'days_back', days_back,
    'source_filter', source_filter,
    'triggered_by', triggered_by,
    'timestamp', NOW()
  ));

  -- Insert sync log entry for backfill
  INSERT INTO sync_logs (id, source, status, trigger_type, triggered_by, run_started)
  VALUES (backfill_id, 'backfill', 'running', 'manual', triggered_by, NOW());

  -- Return backfill information
  SELECT jsonb_build_object(
    'backfill_id', backfill_id,
    'status', 'initiated',
    'message', 'Backfill started',
    'results', jsonb_build_array()
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to deduplicate alerts
CREATE OR REPLACE FUNCTION deduplicate_alerts(triggered_by TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  removed_count INTEGER;
  result JSONB;
BEGIN
  -- Remove exact duplicates based on external_id and source
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY external_id, source ORDER BY created_at ASC) as rn
    FROM alerts
    WHERE external_id IS NOT NULL
  )
  DELETE FROM alerts
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );

  GET DIAGNOSTICS removed_count = ROW_COUNT;

  -- Log the operation
  INSERT INTO admin_operations (operation_type, details)
  VALUES ('deduplication', jsonb_build_object(
    'removed_count', removed_count,
    'triggered_by', triggered_by,
    'timestamp', NOW()
  ));

  -- Return result
  SELECT jsonb_build_object(
    'removed_count', removed_count,
    'status', 'completed',
    'message', format('Removed %s duplicate alerts', removed_count)
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to reindex database
CREATE OR REPLACE FUNCTION reindex_database(triggered_by TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  indexes_created INTEGER := 0;
  result JSONB;
BEGIN
  start_time := NOW();

  -- Create/recreate common indexes
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_source ON alerts(source);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_date_published ON alerts(date_published);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_external_id ON alerts(external_id);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_severity ON alerts(severity);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_logs_source ON sync_logs(source);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sync_logs_run_started ON sync_logs(run_started);

  indexes_created := 8;
  end_time := NOW();

  -- Log the operation
  INSERT INTO admin_operations (operation_type, details)
  VALUES ('reindex', jsonb_build_object(
    'indexes_created', indexes_created,
    'duration', EXTRACT(EPOCH FROM (end_time - start_time)) || 's',
    'triggered_by', triggered_by,
    'timestamp', NOW()
  ));

  -- Return result
  SELECT jsonb_build_object(
    'indexes_created', indexes_created,
    'duration', EXTRACT(EPOCH FROM (end_time - start_time)) || 's',
    'status', 'completed',
    'message', format('Created %s database indexes', indexes_created)
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to get agencies with stats
CREATE OR REPLACE FUNCTION get_agencies_with_stats(
  search_term TEXT DEFAULT NULL,
  source_filter TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  jurisdiction_filter TEXT DEFAULT NULL,
  page_number INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 25
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  total_count INTEGER;
  offset_val INTEGER;
BEGIN
  offset_val := (page_number - 1) * page_size;

  -- Get total count
  WITH agency_base AS (
    SELECT DISTINCT
      COALESCE(a.source, 'Unknown') as name,
      a.source,
      COALESCE(a.jurisdiction, 'Unknown') as jurisdiction
    FROM alerts a
    WHERE (search_term IS NULL OR a.source ILIKE '%' || search_term || '%')
      AND (source_filter IS NULL OR a.source = source_filter)
      AND (jurisdiction_filter IS NULL OR a.jurisdiction = jurisdiction_filter)
  )
  SELECT COUNT(*) INTO total_count FROM agency_base;

  -- Get paginated results with stats
  WITH agency_stats AS (
    SELECT
      COALESCE(a.source, 'Unknown') as name,
      a.source,
      COALESCE(a.jurisdiction, 'Unknown') as jurisdiction,
      array_agg(DISTINCT a.category) FILTER (WHERE a.category IS NOT NULL) as product_types,
      COUNT(*) as alert_count,
      MAX(a.date_published) as last_alert_date,
      MAX(sl_success.run_finished) as last_sync_success,
      MAX(sl_failure.run_finished) as last_sync_failure,
      COUNT(*) FILTER (WHERE sl_failure.status = 'failure' AND sl_failure.run_started >= NOW() - INTERVAL '24 hours') as sync_failures_24h,
      CASE
        WHEN MAX(sl_success.run_finished) IS NULL THEN 'inactive'
        WHEN COUNT(*) FILTER (WHERE sl_failure.status = 'failure' AND sl_failure.run_started >= NOW() - INTERVAL '24 hours') > 3 THEN 'error'
        ELSE 'active'
      END as status,
      MIN(a.created_at) as created_at,
      MAX(a.updated_at) as updated_at
    FROM alerts a
    LEFT JOIN sync_logs sl_success ON sl_success.source = a.source AND sl_success.status = 'success'
    LEFT JOIN sync_logs sl_failure ON sl_failure.source = a.source AND sl_failure.status = 'failure'
    WHERE (search_term IS NULL OR a.source ILIKE '%' || search_term || '%')
      AND (source_filter IS NULL OR a.source = source_filter)
      AND (jurisdiction_filter IS NULL OR a.jurisdiction = jurisdiction_filter)
    GROUP BY a.source, a.jurisdiction
  )
  SELECT jsonb_build_object(
    'agencies', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', gen_random_uuid(),
          'name', name,
          'source', source,
          'jurisdiction', jurisdiction,
          'product_types', COALESCE(product_types, ARRAY[]::text[]),
          'alert_count', alert_count,
          'last_alert_date', last_alert_date,
          'last_sync_success', last_sync_success,
          'last_sync_failure', last_sync_failure,
          'sync_failures_24h', sync_failures_24h,
          'status', status,
          'created_at', created_at,
          'updated_at', updated_at
        )
      )
      FROM agency_stats
      ORDER BY alert_count DESC
      LIMIT page_size OFFSET offset_val
    ),
    'total', total_count
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to get duplicate groups
CREATE OR REPLACE FUNCTION get_duplicate_groups()
RETURNS TABLE (
  id TEXT,
  external_id TEXT,
  source TEXT,
  title TEXT,
  count BIGINT,
  earliest_date TIMESTAMP WITH TIME ZONE,
  latest_date TIMESTAMP WITH TIME ZONE,
  alert_ids TEXT[],
  similarity_score NUMERIC,
  duplicate_type TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH duplicate_groups AS (
    SELECT
      a.external_id,
      a.source,
      a.title,
      COUNT(*) as dup_count,
      MIN(a.date_published) as earliest,
      MAX(a.date_published) as latest,
      array_agg(a.id::text) as ids,
      100.0 as similarity,
      'external_id' as dup_type
    FROM alerts a
    WHERE a.external_id IS NOT NULL
    GROUP BY a.external_id, a.source, a.title
    HAVING COUNT(*) > 1
  )
  SELECT
    dg.external_id || '_' || dg.source as id,
    dg.external_id,
    dg.source,
    dg.title,
    dg.dup_count,
    dg.earliest,
    dg.latest,
    dg.ids,
    dg.similarity,
    dg.dup_type
  FROM duplicate_groups dg
  ORDER BY dg.dup_count DESC;
END;
$$;

-- Function to get duplicate stats
CREATE OR REPLACE FUNCTION get_duplicate_stats()
RETURNS TABLE (
  total_duplicates BIGINT,
  space_saved BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) - COUNT(DISTINCT external_id, source) FROM alerts WHERE external_id IS NOT NULL) as total_duplicates,
    (SELECT COUNT(*) - COUNT(DISTINCT external_id, source) FROM alerts WHERE external_id IS NOT NULL) * 1024 as space_saved;
END;
$$;

-- Function to get database stats
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
  total_alerts BIGINT,
  total_size TEXT,
  oldest_alert TIMESTAMP WITH TIME ZONE,
  newest_alert TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_alerts,
    pg_size_pretty(pg_total_relation_size('alerts')) as total_size,
    MIN(date_published) as oldest_alert,
    MAX(date_published) as newest_alert
  FROM alerts;
END;
$$;

-- Enable RLS on admin tables
ALTER TABLE public.admin_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin tables
CREATE POLICY "Admin operations are viewable by admins" ON public.admin_operations
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "System config is viewable by admins" ON public.system_config
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'super_admin'));

CREATE POLICY "System config is editable by super admins" ON public.system_config
  FOR ALL USING (auth.jwt() ->> 'role' = 'super_admin');

-- Grant necessary permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.admin_operations TO authenticated;
GRANT ALL ON TABLE public.system_config TO authenticated;