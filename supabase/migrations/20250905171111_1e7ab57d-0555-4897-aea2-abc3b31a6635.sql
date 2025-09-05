-- Final Security Fix: Move Extensions from Public Schema

-- Check and move extensions from public to extensions schema
-- This addresses the "Extension in Public" security warning

-- First, identify and move common PostgreSQL extensions that might be in public
DO $$
DECLARE
    ext_record RECORD;
    ext_name TEXT;
BEGIN
    -- Loop through extensions in public schema and move them
    FOR ext_record IN 
        SELECT extname as extension_name
        FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE n.nspname = 'public'
        AND extname NOT IN ('plpgsql') -- Skip built-in extensions that can't be moved
    LOOP
        ext_name := ext_record.extension_name;
        
        -- Log the extension move for security audit
        INSERT INTO public.security_events (
            user_id,
            event_type,
            metadata
        ) VALUES (
            NULL,
            'extension_schema_migration',
            jsonb_build_object(
                'extension_name', ext_name,
                'from_schema', 'public',
                'to_schema', 'extensions',
                'migration_time', now()
            )
        );
        
        -- Move extension to extensions schema
        -- Note: Some extensions may need to be dropped and recreated
        EXECUTE format('ALTER EXTENSION %I SET SCHEMA extensions', ext_name);
        
    EXCEPTION WHEN OTHERS THEN
        -- If extension can't be moved, log the issue
        INSERT INTO public.security_events (
            user_id,
            event_type,
            metadata
        ) VALUES (
            NULL,
            'extension_migration_failed',
            jsonb_build_object(
                'extension_name', ext_name,
                'error_message', SQLERRM,
                'error_code', SQLSTATE,
                'migration_time', now()
            )
        );
        CONTINUE;
    END LOOP;
END $$;

-- Update default search path for database to prefer extensions schema
-- This ensures new extensions are created in the correct schema
ALTER DATABASE postgres SET search_path = extensions, public;

-- Grant appropriate permissions for the extensions schema
GRANT USAGE ON SCHEMA extensions TO PUBLIC;
GRANT CREATE ON SCHEMA extensions TO postgres;

-- Set default privileges for future extension objects
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres;

-- Create a security function to monitor extension installations
CREATE OR REPLACE FUNCTION monitor_extension_installations()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
    obj RECORD;
BEGIN
    -- Log all extension operations for security audit
    FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() WHERE command_tag = 'CREATE EXTENSION'
    LOOP
        INSERT INTO public.security_events (
            user_id,
            event_type,
            metadata
        ) VALUES (
            auth.uid(),
            'extension_installed',
            jsonb_build_object(
                'extension_name', obj.object_identity,
                'schema_name', obj.schema_name,
                'command_tag', obj.command_tag,
                'installed_by', current_user,
                'installation_time', now()
            )
        );
    END LOOP;
END;
$$;

-- Create event trigger to monitor extension installations (if supported)
-- Note: This may not work in all Supabase environments due to permissions
DO $$
BEGIN
    CREATE EVENT TRIGGER monitor_extensions
        ON ddl_command_end
        WHEN TAG IN ('CREATE EXTENSION', 'DROP EXTENSION', 'ALTER EXTENSION')
        EXECUTE FUNCTION monitor_extension_installations();
EXCEPTION WHEN insufficient_privilege THEN
    -- Log that event trigger couldn't be created (expected in Supabase)
    INSERT INTO public.security_events (
        user_id,
        event_type,
        metadata
    ) VALUES (
        NULL,
        'extension_monitoring_setup',
        jsonb_build_object(
            'status', 'event_trigger_not_supported',
            'reason', 'insufficient_privilege',
            'alternative', 'manual_monitoring_enabled',
            'setup_time', now()
        )
    );
END $$;

-- Final security validation function
CREATE OR REPLACE FUNCTION validate_security_setup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    validation_result jsonb;
    extensions_in_public integer;
    rls_enabled_tables integer;
    total_tables integer;
BEGIN
    -- Only security admins can run validation
    IF NOT (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'security_admin')) THEN
        RAISE EXCEPTION 'Access denied: Security admin required';
    END IF;
    
    -- Count extensions still in public schema
    SELECT COUNT(*) INTO extensions_in_public
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE n.nspname = 'public'
    AND extname NOT IN ('plpgsql');
    
    -- Count tables with RLS enabled
    SELECT 
        COUNT(*) FILTER (WHERE relrowsecurity = true) as rls_enabled,
        COUNT(*) as total
    INTO rls_enabled_tables, total_tables
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' 
    AND c.relkind = 'r';
    
    validation_result := jsonb_build_object(
        'validation_time', now(),
        'security_status', CASE 
            WHEN extensions_in_public > 0 THEN 'warning'
            WHEN rls_enabled_tables < total_tables THEN 'warning'
            ELSE 'secure'
        END,
        'metrics', jsonb_build_object(
            'extensions_in_public', extensions_in_public,
            'rls_enabled_tables', rls_enabled_tables,
            'total_public_tables', total_tables,
            'rls_coverage_percent', ROUND((rls_enabled_tables::float / NULLIF(total_tables, 0)) * 100, 2)
        ),
        'recommendations', CASE
            WHEN extensions_in_public > 0 THEN ARRAY['Move remaining extensions to extensions schema']
            WHEN rls_enabled_tables < total_tables THEN ARRAY['Enable RLS on remaining tables']
            ELSE ARRAY['Security posture is optimal']
        END
    );
    
    -- Log security validation
    PERFORM log_security_event_enhanced(
        'security_validation_completed',
        validation_result,
        'low'
    );
    
    RETURN validation_result;
END;
$$;