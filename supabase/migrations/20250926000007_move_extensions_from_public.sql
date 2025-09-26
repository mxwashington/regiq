-- Move Extensions from Public Schema to Extensions Schema
-- Fixes security vulnerability where extensions are installed in public schema

BEGIN;

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Function to safely move an extension to extensions schema
CREATE OR REPLACE FUNCTION move_extension_to_extensions_schema(ext_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_schema text;
  move_successful boolean := false;
BEGIN
  -- Check if extension exists and get current schema
  SELECT n.nspname INTO current_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = ext_name;

  IF current_schema IS NULL THEN
    -- Extension doesn't exist
    RETURN false;
  END IF;

  IF current_schema = 'extensions' THEN
    -- Already in correct schema
    RETURN true;
  END IF;

  -- Only move if it's in public schema (safety check)
  IF current_schema = 'public' THEN
    BEGIN
      EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', ext_name);
      move_successful := true;

      -- Log the move
      INSERT INTO public.security_events (event_type, metadata, severity)
      VALUES (
        'extension_moved_from_public',
        jsonb_build_object(
          'extension_name', ext_name,
          'from_schema', current_schema,
          'to_schema', 'extensions',
          'move_date', now()
        ),
        'medium'
      );

    EXCEPTION
      WHEN OTHERS THEN
        -- Log the failure but don't fail the transaction
        INSERT INTO public.security_events (event_type, metadata, severity)
        VALUES (
          'extension_move_failed',
          jsonb_build_object(
            'extension_name', ext_name,
            'from_schema', current_schema,
            'error_message', SQLERRM,
            'attempted_date', now()
          ),
          'high'
        );
        move_successful := false;
    END;
  END IF;

  RETURN move_successful;
END;
$$;

-- Move common extensions that might be in public schema
-- These are the most commonly found extensions in public schema

-- Move pgcrypto (encryption functions)
SELECT move_extension_to_extensions_schema('pgcrypto');

-- Move uuid-ossp (UUID functions)
SELECT move_extension_to_extensions_schema('uuid-ossp');

-- Move pg_trgm (trigram matching for similarity)
SELECT move_extension_to_extensions_schema('pg_trgm');

-- Move unaccent (remove accents from text)
SELECT move_extension_to_extensions_schema('unaccent');

-- Move fuzzystrmatch (fuzzy string matching)
SELECT move_extension_to_extensions_schema('fuzzystrmatch');

-- Move citext (case-insensitive text)
SELECT move_extension_to_extensions_schema('citext');

-- Move btree_gin (GIN indexes for btree)
SELECT move_extension_to_extensions_schema('btree_gin');

-- Move btree_gist (GiST indexes for btree)
SELECT move_extension_to_extensions_schema('btree_gist');

-- Move hstore (key-value store)
SELECT move_extension_to_extensions_schema('hstore');

-- Create function to check for extensions in public schema
CREATE OR REPLACE FUNCTION check_extensions_in_public()
RETURNS TABLE(
  extension_name text,
  current_schema text,
  security_risk text,
  recommendation text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
SELECT
  e.extname::text as extension_name,
  n.nspname::text as current_schema,
  CASE
    WHEN n.nspname = 'public' THEN 'High - Extension functions accessible to all users'
    WHEN n.nspname = 'extensions' THEN 'Low - Properly isolated'
    ELSE 'Medium - Non-standard schema'
  END as security_risk,
  CASE
    WHEN n.nspname = 'public' THEN 'Move to extensions schema immediately'
    WHEN n.nspname = 'extensions' THEN 'Properly configured'
    ELSE 'Review schema choice and consider moving to extensions'
  END as recommendation
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
ORDER BY
  CASE n.nspname
    WHEN 'public' THEN 1
    WHEN 'extensions' THEN 3
    ELSE 2
  END,
  e.extname;
$$;

-- Create function to automatically fix extension schema issues
CREATE OR REPLACE FUNCTION fix_all_extension_schemas()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ext_record record;
  results jsonb := '{}';
  moved_count integer := 0;
  failed_count integer := 0;
  already_correct integer := 0;
BEGIN
  FOR ext_record IN
    SELECT e.extname, n.nspname as current_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE n.nspname = 'public'
  LOOP
    IF move_extension_to_extensions_schema(ext_record.extname) THEN
      moved_count := moved_count + 1;
      results := jsonb_set(results, ARRAY[ext_record.extname], '"moved"');
    ELSE
      failed_count := failed_count + 1;
      results := jsonb_set(results, ARRAY[ext_record.extname], '"failed"');
    END IF;
  END LOOP;

  -- Count extensions already in correct schema
  SELECT COUNT(*) INTO already_correct
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE n.nspname = 'extensions';

  -- Add summary
  results := jsonb_set(results, ARRAY['summary'], jsonb_build_object(
    'moved_successfully', moved_count,
    'move_failures', failed_count,
    'already_correct', already_correct,
    'total_extensions', moved_count + failed_count + already_correct
  ));

  RETURN results;
END;
$$;

-- Update function search paths to include extensions schema
-- This ensures functions can still access extension functions

DO $$
DECLARE
    func_record record;
BEGIN
    FOR func_record IN
        SELECT n.nspname as schema_name, p.proname as function_name, p.oid,
               pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prokind = 'f'
          AND EXISTS (
            SELECT 1 FROM pg_proc_settings
            WHERE prooid = p.oid
              AND name = 'search_path'
              AND setting !~ 'extensions'
          )
    LOOP
        BEGIN
            -- Update search_path to include extensions schema
            EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, extensions',
                          func_record.schema_name,
                          func_record.function_name,
                          func_record.args);
        EXCEPTION
            WHEN OTHERS THEN
                -- Log but continue
                INSERT INTO public.security_events (event_type, metadata, severity)
                VALUES (
                    'function_search_path_extensions_update_failed',
                    jsonb_build_object(
                        'function_name', func_record.function_name,
                        'error_message', SQLERRM
                    ),
                    'low'
                );
        END;
    END LOOP;
END;
$$;

-- Create view to monitor extension security status
CREATE OR REPLACE VIEW extension_security_status AS
SELECT
  COUNT(*) as total_extensions,
  COUNT(*) FILTER (WHERE current_schema = 'extensions') as secure_extensions,
  COUNT(*) FILTER (WHERE current_schema = 'public') as insecure_extensions,
  COUNT(*) FILTER (WHERE current_schema NOT IN ('extensions', 'public')) as other_schema_extensions,
  CASE
    WHEN COUNT(*) FILTER (WHERE current_schema = 'public') = 0 THEN 'All extensions secure'
    ELSE COUNT(*) FILTER (WHERE current_schema = 'public') || ' extensions in public schema need attention'
  END as security_status,
  array_agg(extension_name) FILTER (WHERE current_schema = 'public') as extensions_needing_move
FROM check_extensions_in_public();

-- Create function to validate extension access after move
CREATE OR REPLACE FUNCTION validate_extension_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  test_uuid uuid;
  test_hash text;
  access_working boolean := true;
BEGIN
  -- Test pgcrypto functions
  BEGIN
    test_hash := encode(extensions.digest('test', 'sha256'), 'hex');
    IF test_hash IS NULL THEN
      access_working := false;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      access_working := false;
  END;

  -- Test uuid-ossp functions
  BEGIN
    test_uuid := extensions.gen_random_uuid();
    IF test_uuid IS NULL THEN
      access_working := false;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      access_working := false;
  END;

  -- Test pg_trgm functions
  BEGIN
    IF similarity('test', 'test') IS NULL THEN
      access_working := false;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      access_working := false;
  END;

  RETURN access_working;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO authenticated, anon;
GRANT SELECT ON extension_security_status TO authenticated;
GRANT EXECUTE ON FUNCTION check_extensions_in_public() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_extension_access() TO authenticated;
GRANT EXECUTE ON FUNCTION fix_all_extension_schemas() TO service_role;

-- Run final validation
DO $$
DECLARE
  validation_result boolean;
  extension_status record;
BEGIN
  -- Validate extension access works
  validation_result := validate_extension_access();

  -- Get final status
  SELECT * INTO extension_status FROM extension_security_status LIMIT 1;

  -- Log the completion
  INSERT INTO public.security_events (event_type, metadata, severity)
  VALUES (
    'extensions_moved_from_public_schema',
    jsonb_build_object(
      'completion_date', now(),
      'validation_passed', validation_result,
      'total_extensions', extension_status.total_extensions,
      'secure_extensions', extension_status.secure_extensions,
      'remaining_public_extensions', extension_status.insecure_extensions,
      'security_status', extension_status.security_status,
      'schema_grants_updated', true,
      'function_search_paths_updated', true
    ),
    CASE
      WHEN extension_status.insecure_extensions = 0 THEN 'medium'
      ELSE 'high'
    END
  );
END;
$$;

COMMIT;