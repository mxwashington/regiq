-- Move pg_net extension from public schema to extensions schema for security
-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_net extension to extensions schema
ALTER EXTENSION pg_net SET SCHEMA extensions;

-- Grant necessary permissions to maintain functionality
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;