-- Alert Deduplication: Clean existing duplicates and prevent future ones
-- Addresses duplicate alerts appearing on dashboard at database level

BEGIN;

-- First, let's analyze current duplicates (if any exist)
-- This creates a temporary view to identify duplicates
CREATE TEMP VIEW duplicate_analysis AS
SELECT
  source,
  external_id,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY coalesce(date_updated, date_published) DESC, created_at DESC) as alert_ids
FROM public.alerts
GROUP BY source, external_id
HAVING COUNT(*) > 1;

-- Log duplicate analysis for reference
DO $$
DECLARE
  dup_count integer;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM duplicate_analysis;

  IF dup_count > 0 THEN
    RAISE NOTICE 'Found % sets of duplicate alerts to clean up', dup_count;

    -- Log details to a temporary table for reference
    CREATE TEMP TABLE IF NOT EXISTS cleanup_log AS
    SELECT
      now() as cleanup_timestamp,
      source,
      external_id,
      duplicate_count,
      alert_ids
    FROM duplicate_analysis;
  ELSE
    RAISE NOTICE 'No duplicate alerts found - database is clean';
  END IF;
END $$;

-- Clean up duplicates by (source, external_id) - keep the most recent
DELETE FROM public.alerts a
USING public.alerts b
WHERE a.id <> b.id
  AND a.source = b.source
  AND a.external_id = b.external_id
  AND (
    -- Keep the one with the latest date_updated if both have it
    (a.date_updated IS NOT NULL AND b.date_updated IS NOT NULL AND a.date_updated < b.date_updated)
    OR
    -- If only one has date_updated, keep that one
    (a.date_updated IS NULL AND b.date_updated IS NOT NULL)
    OR
    -- If neither has date_updated, keep the one with latest date_published
    (a.date_updated IS NULL AND b.date_updated IS NULL AND a.date_published < b.date_published)
    OR
    -- If dates are equal, keep the one with latest created_at
    (
      coalesce(a.date_updated, a.date_published) = coalesce(b.date_updated, b.date_published)
      AND a.created_at < b.created_at
    )
  );

-- Clean up duplicates by hash - keep the most recent
DELETE FROM public.alerts a
USING public.alerts b
WHERE a.id <> b.id
  AND a.hash = b.hash
  AND (
    coalesce(a.date_updated, a.date_published) < coalesce(b.date_updated, b.date_published)
    OR (
      coalesce(a.date_updated, a.date_published) = coalesce(b.date_updated, b.date_published)
      AND a.created_at < b.created_at
    )
  );

-- Ensure we have the pg_trgm extension for similarity searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram index for fuzzy matching (helpful for near-duplicates)
CREATE INDEX IF NOT EXISTS idx_alerts_title_trgm ON public.alerts USING gin (title gin_trgm_ops);

-- Create composite indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_alerts_source_date_published ON public.alerts (source, date_published DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_source_external_id ON public.alerts (source, external_id);

-- Create a view that ensures distinct alerts (fallback for UI if needed)
CREATE OR REPLACE VIEW public.alerts_distinct AS
SELECT DISTINCT ON (source, external_id)
  id,
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
  created_at,
  updated_at
FROM public.alerts
ORDER BY source, external_id, coalesce(date_updated, date_published) DESC, created_at DESC;

-- Grant access to the distinct view
GRANT SELECT ON public.alerts_distinct TO authenticated;

-- Create a function to detect potential near-duplicates
CREATE OR REPLACE FUNCTION detect_near_duplicates(
  similarity_threshold real DEFAULT 0.8,
  date_window_hours integer DEFAULT 24
)
RETURNS TABLE (
  alert1_id uuid,
  alert2_id uuid,
  title_similarity real,
  source1 text,
  source2 text,
  external_id1 text,
  external_id2 text,
  title1 text,
  title2 text,
  date_diff_hours numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a1.id as alert1_id,
    a2.id as alert2_id,
    similarity(a1.title, a2.title) as title_similarity,
    a1.source as source1,
    a2.source as source2,
    a1.external_id as external_id1,
    a2.external_id as external_id2,
    a1.title as title1,
    a2.title as title2,
    EXTRACT(EPOCH FROM (a2.date_published - a1.date_published)) / 3600 as date_diff_hours
  FROM public.alerts a1
  JOIN public.alerts a2 ON (
    a1.id < a2.id -- Avoid duplicates in results
    AND similarity(a1.title, a2.title) >= similarity_threshold
    AND abs(EXTRACT(EPOCH FROM (a2.date_published - a1.date_published)) / 3600) <= date_window_hours
  )
  WHERE a1.source = a2.source OR a1.source <> a2.source -- Allow same or different sources
  ORDER BY title_similarity DESC, date_diff_hours;
END;
$$;

-- Grant execute permission to admins only
GRANT EXECUTE ON FUNCTION detect_near_duplicates TO service_role;

-- Create an improved upsert function that handles hash conflicts intelligently
CREATE OR REPLACE FUNCTION upsert_alert_improved(
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
  alert_id uuid,
  was_duplicate boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_alert_id uuid;
  new_alert_id uuid;
  hash_conflict_id uuid;
  content_changed boolean := false;
BEGIN
  -- Check if alert with this (source, external_id) already exists
  SELECT id INTO existing_alert_id
  FROM public.alerts
  WHERE source = p_source AND external_id = p_external_id;

  -- Check if there's a hash conflict with a different alert
  SELECT id INTO hash_conflict_id
  FROM public.alerts
  WHERE hash = p_hash AND (source <> p_source OR external_id <> p_external_id);

  IF hash_conflict_id IS NOT NULL THEN
    -- Hash conflict detected - regenerate hash with timestamp
    p_hash := encode(sha256((p_source || '|' || p_external_id || '|' || coalesce(p_date_updated::text, p_date_published::text) || '|' || extract(epoch from now())::text)::bytea), 'hex');
  END IF;

  IF existing_alert_id IS NOT NULL THEN
    -- Check if content has actually changed
    SELECT (
      title <> p_title OR
      summary IS DISTINCT FROM p_summary OR
      link_url IS DISTINCT FROM p_link_url OR
      date_published <> p_date_published OR
      date_updated IS DISTINCT FROM p_date_updated OR
      jurisdiction IS DISTINCT FROM p_jurisdiction OR
      locations <> p_locations OR
      product_types <> p_product_types OR
      category IS DISTINCT FROM p_category OR
      severity IS DISTINCT FROM p_severity
    ) INTO content_changed
    FROM public.alerts
    WHERE id = existing_alert_id;

    IF content_changed THEN
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
        hash = p_hash,
        updated_at = now()
      WHERE id = existing_alert_id;

      RETURN QUERY SELECT 'updated'::text, existing_alert_id, false;
    ELSE
      -- No changes, skip update
      RETURN QUERY SELECT 'skipped'::text, existing_alert_id, false;
    END IF;
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

    RETURN QUERY SELECT 'inserted'::text, new_alert_id, (hash_conflict_id IS NOT NULL);
  END IF;
END;
$$;

-- Replace the old upsert function
DROP FUNCTION IF EXISTS upsert_alert(text, text, text, text, text, timestamptz, timestamptz, text, text[], text[], text, integer, jsonb, text);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION upsert_alert_improved TO service_role;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Alert deduplication migration completed successfully';
  RAISE NOTICE 'Created improved upsert function and duplicate detection utilities';
  RAISE NOTICE 'Added trigram indexes for near-duplicate detection';
END $$;

COMMIT;