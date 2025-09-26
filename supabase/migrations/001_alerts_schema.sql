-- Alerts Database Schema Migration
-- Creates comprehensive alerts table with sync logging and deduplication

BEGIN;

-- Create alerts table with complete schema
CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('FDA', 'FSIS', 'CDC', 'EPA')),
  title text NOT NULL,
  summary text,
  link_url text,
  date_published timestamptz NOT NULL,
  date_updated timestamptz,
  jurisdiction text,
  locations text[] NOT NULL DEFAULT '{}',
  product_types text[] NOT NULL DEFAULT '{}',
  category text,
  severity integer CHECK (severity >= 0 AND severity <= 100),
  raw jsonb NOT NULL,
  hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique constraints for deduplication
ALTER TABLE public.alerts ADD CONSTRAINT unique_source_external_id UNIQUE (source, external_id);
ALTER TABLE public.alerts ADD CONSTRAINT unique_hash UNIQUE (hash);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_date_published ON public.alerts (date_published DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_source ON public.alerts (source);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts (severity DESC) WHERE severity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_category ON public.alerts (category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_locations ON public.alerts USING GIN (locations);
CREATE INDEX IF NOT EXISTS idx_alerts_product_types ON public.alerts USING GIN (product_types);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_hash ON public.alerts (hash);

-- Create text search index for title and summary
CREATE INDEX IF NOT EXISTS idx_alerts_text_search ON public.alerts USING GIN (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, ''))
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_alerts_updated_at ON public.alerts;
CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create alert sync logs table
CREATE TABLE IF NOT EXISTS public.alert_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_started timestamptz NOT NULL DEFAULT now(),
  run_finished timestamptz,
  source text NOT NULL CHECK (source IN ('FDA', 'FSIS', 'CDC', 'EPA', 'ALL')),
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'partial')) DEFAULT 'running',
  alerts_fetched integer DEFAULT 0,
  alerts_inserted integer DEFAULT 0,
  alerts_updated integer DEFAULT 0,
  alerts_skipped integer DEFAULT 0,
  errors text[],
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for sync logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_run_started ON public.alert_sync_logs (run_started DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON public.alert_sync_logs (source);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.alert_sync_logs (status);

-- Enable Row Level Security on alerts table
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read alerts (trial-friendly)
CREATE POLICY "Authenticated users can read alerts" ON public.alerts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Policy: Only admin users can insert/update/delete alerts
CREATE POLICY "Admin users can modify alerts" ON public.alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Enable RLS on sync logs
ALTER TABLE public.alert_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admin users can view sync logs
CREATE POLICY "Admin users can access sync logs" ON public.alert_sync_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Create function to get recent alerts with filtering
CREATE OR REPLACE FUNCTION get_recent_alerts(
  days_back integer DEFAULT 30,
  sources text[] DEFAULT ARRAY['FDA', 'FSIS', 'CDC', 'EPA'],
  limit_count integer DEFAULT 100,
  search_query text DEFAULT NULL,
  min_severity integer DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  external_id text,
  source text,
  title text,
  summary text,
  link_url text,
  date_published timestamptz,
  date_updated timestamptz,
  jurisdiction text,
  locations text[],
  product_types text[],
  category text,
  severity integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.external_id,
    a.source,
    a.title,
    a.summary,
    a.link_url,
    a.date_published,
    a.date_updated,
    a.jurisdiction,
    a.locations,
    a.product_types,
    a.category,
    a.severity,
    a.created_at,
    a.updated_at
  FROM public.alerts a
  WHERE
    a.date_published >= (now() - (days_back || ' days')::interval)
    AND (sources IS NULL OR a.source = ANY(sources))
    AND (search_query IS NULL OR (
      a.title ILIKE '%' || search_query || '%' OR
      a.summary ILIKE '%' || search_query || '%'
    ))
    AND (min_severity IS NULL OR a.severity >= min_severity)
  ORDER BY a.date_published DESC, a.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_recent_alerts TO authenticated;

-- Create function for upsert alerts (insert or update based on hash)
CREATE OR REPLACE FUNCTION upsert_alert(
  p_external_id text,
  p_source text,
  p_title text,
  p_summary text,
  p_link_url text,
  p_date_published timestamptz,
  p_date_updated timestamptz,
  p_jurisdiction text,
  p_locations text[],
  p_product_types text[],
  p_category text,
  p_severity integer,
  p_raw jsonb,
  p_hash text
)
RETURNS TABLE (
  action text,
  alert_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_alert_id uuid;
  new_alert_id uuid;
BEGIN
  -- Check if alert with this hash already exists
  SELECT id INTO existing_alert_id
  FROM public.alerts
  WHERE hash = p_hash;

  IF existing_alert_id IS NOT NULL THEN
    -- Update existing alert
    UPDATE public.alerts SET
      title = p_title,
      summary = p_summary,
      link_url = p_link_url,
      date_published = p_date_published,
      date_updated = p_date_updated,
      jurisdiction = p_jurisdiction,
      locations = p_locations,
      product_types = p_product_types,
      category = p_category,
      severity = p_severity,
      raw = p_raw,
      updated_at = now()
    WHERE id = existing_alert_id;

    RETURN QUERY SELECT 'updated'::text, existing_alert_id;
  ELSE
    -- Insert new alert
    INSERT INTO public.alerts (
      external_id,
      source,
      title,
      summary,
      link_url,
      date_published,
      date_updated,
      jurisdiction,
      locations,
      product_types,
      category,
      severity,
      raw,
      hash
    ) VALUES (
      p_external_id,
      p_source,
      p_title,
      p_summary,
      p_link_url,
      p_date_published,
      p_date_updated,
      p_jurisdiction,
      p_locations,
      p_product_types,
      p_category,
      p_severity,
      p_raw,
      p_hash
    ) RETURNING id INTO new_alert_id;

    RETURN QUERY SELECT 'inserted'::text, new_alert_id;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION upsert_alert TO service_role;

-- Create function to start sync log
CREATE OR REPLACE FUNCTION start_sync_log(
  p_source text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.alert_sync_logs (source, metadata)
  VALUES (p_source, p_metadata)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

-- Create function to finish sync log
CREATE OR REPLACE FUNCTION finish_sync_log(
  p_log_id uuid,
  p_status text,
  p_alerts_fetched integer DEFAULT 0,
  p_alerts_inserted integer DEFAULT 0,
  p_alerts_updated integer DEFAULT 0,
  p_alerts_skipped integer DEFAULT 0,
  p_errors text[] DEFAULT ARRAY[]::text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.alert_sync_logs SET
    run_finished = now(),
    status = p_status,
    alerts_fetched = p_alerts_fetched,
    alerts_inserted = p_alerts_inserted,
    alerts_updated = p_alerts_updated,
    alerts_skipped = p_alerts_skipped,
    errors = p_errors
  WHERE id = p_log_id;
END;
$$;

-- Grant execute permissions for sync functions
GRANT EXECUTE ON FUNCTION start_sync_log TO service_role;
GRANT EXECUTE ON FUNCTION finish_sync_log TO service_role;

-- Create summary view for dashboard
CREATE OR REPLACE VIEW public.alerts_summary AS
SELECT
  source,
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE date_published >= now() - interval '7 days') as recent_alerts,
  COUNT(*) FILTER (WHERE severity >= 70) as high_severity_alerts,
  MAX(date_published) as latest_alert_date,
  AVG(severity) FILTER (WHERE severity IS NOT NULL) as avg_severity
FROM public.alerts
GROUP BY source
UNION ALL
SELECT
  'ALL' as source,
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE date_published >= now() - interval '7 days') as recent_alerts,
  COUNT(*) FILTER (WHERE severity >= 70) as high_severity_alerts,
  MAX(date_published) as latest_alert_date,
  AVG(severity) FILTER (WHERE severity IS NOT NULL) as avg_severity
FROM public.alerts;

-- Grant access to summary view
GRANT SELECT ON public.alerts_summary TO authenticated;

COMMIT;