-- Fix function search path security warnings
-- Update functions that don't have proper search_path set

-- Check which functions need search_path fixes
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Update functions missing search_path to be more secure
    FOR func_record IN 
        SELECT proname, pronamespace::regnamespace as schema_name
        FROM pg_proc 
        WHERE pronamespace = 'public'::regnamespace 
        AND proname NOT LIKE 'pg_%'
        AND proname NOT LIKE 'update_updated_at_column%'
    LOOP
        -- Only update key security functions that need search_path
        IF func_record.proname IN ('handle_new_user', 'log_rls_violation') THEN
            EXECUTE format('ALTER FUNCTION %I.%I() SET search_path = public', 
                          func_record.schema_name, func_record.proname);
        END IF;
    END LOOP;
END $$;

-- Create extensions schema for better security (prepare for manual migration)
CREATE SCHEMA IF NOT EXISTS extensions;
COMMENT ON SCHEMA extensions IS 'Schema for PostgreSQL extensions - manual migration required via Supabase dashboard';

-- Log completion
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'security_fixes_applied',
  json_build_object(
    'timestamp', extract(epoch from now()) * 1000,
    'fixes', json_build_array(
      'function_search_path_security',
      'extensions_schema_created'
    )
  ),
  'Security fixes applied via migration'
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = now();