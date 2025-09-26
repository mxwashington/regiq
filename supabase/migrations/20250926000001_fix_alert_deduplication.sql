-- Fix Alert Reposting and Deduplication Issues
-- This migration adds better duplicate detection and cleans up existing duplicates

BEGIN;

-- Create function to find duplicate alerts based on enhanced criteria
CREATE OR REPLACE FUNCTION find_duplicate_alerts(
  input_title text,
  input_source text,
  input_url text DEFAULT NULL,
  lookback_days integer DEFAULT 14
)
RETURNS TABLE (
  id uuid,
  title text,
  external_url text,
  published_date timestamp with time zone,
  similarity_score numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  lookback_date timestamp with time zone;
BEGIN
  lookback_date := now() - (lookback_days || ' days')::interval;

  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.external_url,
    a.published_date,
    CASE
      -- Exact title match gets 100% similarity
      WHEN lower(trim(a.title)) = lower(trim(input_title)) THEN 1.0
      -- Same URL gets 100% similarity
      WHEN input_url IS NOT NULL AND a.external_url IS NOT NULL
           AND lower(trim(a.external_url)) = lower(trim(input_url)) THEN 1.0
      -- Use basic similarity for other cases (simplified for PostgreSQL)
      ELSE similarity(lower(trim(a.title)), lower(trim(input_title)))
    END::numeric as similarity_score
  FROM public.alerts a
  WHERE a.source = input_source
    AND a.published_date >= lookback_date
    AND (
      -- Exact matches
      lower(trim(a.title)) = lower(trim(input_title))
      OR (input_url IS NOT NULL AND a.external_url IS NOT NULL
          AND lower(trim(a.external_url)) = lower(trim(input_url)))
      -- High similarity matches
      OR similarity(lower(trim(a.title)), lower(trim(input_title))) >= 0.8
    )
  ORDER BY similarity_score DESC, a.published_date DESC;
END;
$$;

-- Enable pg_trgm extension for similarity function
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create function to clean up duplicate alerts (keep the most recent one)
CREATE OR REPLACE FUNCTION cleanup_duplicate_alerts()
RETURNS TABLE (
  duplicates_removed integer,
  sources_processed text[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  source_record record;
  alert_record record;
  duplicate_record record;
  total_removed integer := 0;
  processed_sources text[] := ARRAY[]::text[];
BEGIN
  -- Process each source separately
  FOR source_record IN
    SELECT DISTINCT source FROM public.alerts
    WHERE created_at >= now() - interval '30 days'
    ORDER BY source
  LOOP
    processed_sources := array_append(processed_sources, source_record.source);

    -- For each alert in this source, find and remove duplicates
    FOR alert_record IN
      SELECT id, title, external_url, published_date, created_at
      FROM public.alerts
      WHERE source = source_record.source
        AND created_at >= now() - interval '30 days'
      ORDER BY published_date DESC, created_at DESC
    LOOP
      -- Find duplicates of this alert (excluding itself)
      FOR duplicate_record IN
        SELECT a.id, a.title, a.published_date, a.created_at
        FROM public.alerts a
        WHERE a.source = source_record.source
          AND a.id != alert_record.id
          AND a.created_at >= now() - interval '30 days'
          AND (
            -- Exact title match
            lower(trim(a.title)) = lower(trim(alert_record.title))
            -- Same URL
            OR (alert_record.external_url IS NOT NULL
                AND a.external_url IS NOT NULL
                AND lower(trim(a.external_url)) = lower(trim(alert_record.external_url)))
            -- High similarity
            OR similarity(lower(trim(a.title)), lower(trim(alert_record.title))) >= 0.85
          )
      LOOP
        -- Keep the newer alert, remove the older duplicate
        IF duplicate_record.created_at < alert_record.created_at THEN
          -- Log the removal
          INSERT INTO public.security_events (event_type, metadata, severity)
          VALUES (
            'duplicate_alert_removed',
            jsonb_build_object(
              'removed_alert_id', duplicate_record.id,
              'kept_alert_id', alert_record.id,
              'removed_title', duplicate_record.title,
              'source', source_record.source
            ),
            'low'
          );

          -- Remove the duplicate
          DELETE FROM public.alerts WHERE id = duplicate_record.id;
          total_removed := total_removed + 1;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT total_removed, processed_sources;
END;
$$;

-- Create index to improve duplicate detection performance
CREATE INDEX IF NOT EXISTS idx_alerts_source_published_date
  ON public.alerts (source, published_date DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_source_title_similarity
  ON public.alerts USING gin (source, lower(title) gin_trgm_ops);

-- Add constraint to prevent future exact duplicates at database level
-- This will help catch duplicates even if application logic fails
DO $$
BEGIN
  -- Try to create unique constraint, ignore if it already exists
  BEGIN
    -- Create unique constraint on normalized title + source + date (within 1 hour window)
    -- Note: This is a partial unique constraint that only applies to recent alerts
    ALTER TABLE public.alerts
    ADD CONSTRAINT unique_alert_source_title_date
    UNIQUE (source, title, date_trunc('hour', published_date))
    WHERE published_date >= '2025-09-01'::date; -- Only apply to new alerts
  EXCEPTION
    WHEN duplicate_table THEN
      -- Constraint already exists, skip
      NULL;
  END;
END;
$$;

-- Run initial cleanup of duplicates (only for recent alerts to avoid long execution)
DO $$
DECLARE
  cleanup_result record;
BEGIN
  SELECT * INTO cleanup_result FROM cleanup_duplicate_alerts();

  -- Log the cleanup results
  INSERT INTO public.security_events (event_type, metadata, severity)
  VALUES (
    'duplicate_cleanup_completed',
    jsonb_build_object(
      'duplicates_removed', cleanup_result.duplicates_removed,
      'sources_processed', cleanup_result.sources_processed,
      'cleanup_date', now()
    ),
    'medium'
  );
END;
$$;

-- Create trigger to prevent duplicate alerts on insert
CREATE OR REPLACE FUNCTION prevent_duplicate_alerts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  existing_count integer;
BEGIN
  -- Check for existing alerts with same title/source within 24 hours
  SELECT COUNT(*) INTO existing_count
  FROM public.alerts
  WHERE source = NEW.source
    AND published_date >= NEW.published_date - interval '24 hours'
    AND published_date <= NEW.published_date + interval '24 hours'
    AND (
      lower(trim(title)) = lower(trim(NEW.title))
      OR (NEW.external_url IS NOT NULL
          AND external_url IS NOT NULL
          AND lower(trim(external_url)) = lower(trim(NEW.external_url)))
      OR similarity(lower(trim(title)), lower(trim(NEW.title))) >= 0.9
    );

  IF existing_count > 0 THEN
    -- Log the prevented duplicate
    INSERT INTO public.security_events (event_type, metadata, severity)
    VALUES (
      'duplicate_alert_prevented',
      jsonb_build_object(
        'title', NEW.title,
        'source', NEW.source,
        'external_url', NEW.external_url,
        'published_date', NEW.published_date
      ),
      'low'
    );

    -- Prevent the insert
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply the trigger to the alerts table
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_alerts ON public.alerts;
CREATE TRIGGER trigger_prevent_duplicate_alerts
  BEFORE INSERT ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_alerts();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION find_duplicate_alerts(text, text, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_duplicate_alerts() TO service_role;
GRANT EXECUTE ON FUNCTION prevent_duplicate_alerts() TO service_role;

COMMIT;