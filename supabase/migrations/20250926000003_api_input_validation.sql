-- API Input Validation and Security Enhancement
-- Adds input validation functions and triggers for critical database operations

BEGIN;

-- Create comprehensive input validation function
CREATE OR REPLACE FUNCTION validate_user_input(
  input_value text,
  input_type text DEFAULT 'text',
  max_length integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  is_valid boolean := true;
  errors text[] := ARRAY[]::text[];
  sanitized_value text;
BEGIN
  -- Initialize
  sanitized_value := COALESCE(input_value, '');

  -- Check length
  IF LENGTH(sanitized_value) > max_length THEN
    errors := array_append(errors, format('Input too long (max %s characters)', max_length));
    sanitized_value := LEFT(sanitized_value, max_length);
    is_valid := false;
  END IF;

  -- Check for dangerous patterns
  IF sanitized_value ~* '(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b)' THEN
    errors := array_append(errors, 'SQL injection patterns detected');
    -- Remove SQL keywords
    sanitized_value := regexp_replace(sanitized_value, '(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b)', '', 'gi');
    is_valid := false;
  END IF;

  -- Check for script injection
  IF sanitized_value ~* '<script[^>]*>.*?</script>' THEN
    errors := array_append(errors, 'Script injection detected');
    sanitized_value := regexp_replace(sanitized_value, '<script[^>]*>.*?</script>', '', 'gi');
    is_valid := false;
  END IF;

  -- Check for HTML injection
  IF sanitized_value ~* '<\s*/?[^>]*(script|iframe|object|embed|form|input|meta|link)[^>]*>' THEN
    errors := array_append(errors, 'HTML injection detected');
    sanitized_value := regexp_replace(sanitized_value, '<[^>]*>', '', 'g');
    is_valid := false;
  END IF;

  -- Check for path traversal
  IF sanitized_value ~* '\.\.[/\\]' THEN
    errors := array_append(errors, 'Path traversal detected');
    sanitized_value := regexp_replace(sanitized_value, '\.\.[/\\]', '', 'g');
    is_valid := false;
  END IF;

  -- Type-specific validation
  CASE input_type
    WHEN 'email' THEN
      IF sanitized_value !~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' THEN
        errors := array_append(errors, 'Invalid email format');
        is_valid := false;
      END IF;

    WHEN 'supplier_name' THEN
      IF sanitized_value !~ '^[a-zA-Z0-9\s\.,&\-\(\)Inc\.LLCCorpLtd]*$' THEN
        errors := array_append(errors, 'Supplier name contains invalid characters');
        sanitized_value := regexp_replace(sanitized_value, '[^a-zA-Z0-9\s\.,&\-\(\)]', '', 'g');
        is_valid := false;
      END IF;

    WHEN 'search_query' THEN
      -- Search queries are more permissive but still need basic safety
      IF LENGTH(TRIM(sanitized_value)) < 2 AND LENGTH(TRIM(sanitized_value)) > 0 THEN
        errors := array_append(errors, 'Search query too short (minimum 2 characters)');
        is_valid := false;
      END IF;
    ELSE
      -- Default text validation
      NULL;
  END CASE;

  -- HTML encode special characters
  sanitized_value := replace(sanitized_value, '&', '&amp;');
  sanitized_value := replace(sanitized_value, '<', '&lt;');
  sanitized_value := replace(sanitized_value, '>', '&gt;');
  sanitized_value := replace(sanitized_value, '"', '&quot;');
  sanitized_value := replace(sanitized_value, '''', '&#x27;');

  -- Trim whitespace
  sanitized_value := TRIM(sanitized_value);

  -- Build result
  result := jsonb_build_object(
    'is_valid', is_valid,
    'sanitized_value', sanitized_value,
    'errors', errors,
    'original_length', LENGTH(COALESCE(input_value, '')),
    'sanitized_length', LENGTH(sanitized_value)
  );

  RETURN result;
END;
$$;

-- Create trigger function to validate supplier names
CREATE OR REPLACE FUNCTION validate_supplier_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validation_result jsonb;
BEGIN
  -- Validate supplier_name if present
  IF NEW.supplier_name IS NOT NULL THEN
    validation_result := validate_user_input(NEW.supplier_name, 'supplier_name', 200);

    IF NOT (validation_result->>'is_valid')::boolean THEN
      -- Log the validation error
      INSERT INTO public.security_events (event_type, metadata, severity, user_id)
      VALUES (
        'input_validation_failed',
        jsonb_build_object(
          'table', 'supplier_watches',
          'field', 'supplier_name',
          'errors', validation_result->'errors',
          'original_value', NEW.supplier_name
        ),
        'medium',
        NEW.user_id
      );

      -- Reject the operation
      RAISE EXCEPTION 'Invalid supplier name: %', (validation_result->>'errors');
    END IF;

    -- Use sanitized value
    NEW.supplier_name := validation_result->>'sanitized_value';
  END IF;

  RETURN NEW;
END;
$$;

-- Apply validation triggers to critical tables
DROP TRIGGER IF EXISTS trigger_validate_supplier_input ON public.supplier_watches;
CREATE TRIGGER trigger_validate_supplier_input
  BEFORE INSERT OR UPDATE ON public.supplier_watches
  FOR EACH ROW
  EXECUTE FUNCTION validate_supplier_input();

-- Create function to validate profile updates
CREATE OR REPLACE FUNCTION validate_profile_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validation_result jsonb;
BEGIN
  -- Validate company_name if present
  IF NEW.company_name IS NOT NULL THEN
    validation_result := validate_user_input(NEW.company_name, 'supplier_name', 200);

    IF NOT (validation_result->>'is_valid')::boolean THEN
      INSERT INTO public.security_events (event_type, metadata, severity, user_id)
      VALUES (
        'input_validation_failed',
        jsonb_build_object(
          'table', 'profiles',
          'field', 'company_name',
          'errors', validation_result->'errors'
        ),
        'medium',
        NEW.user_id
      );

      RAISE EXCEPTION 'Invalid company name: %', (validation_result->>'errors');
    END IF;

    NEW.company_name := validation_result->>'sanitized_value';
  END IF;

  -- Validate full_name if present
  IF NEW.full_name IS NOT NULL THEN
    validation_result := validate_user_input(NEW.full_name, 'text', 100);

    IF NOT (validation_result->>'is_valid')::boolean THEN
      INSERT INTO public.security_events (event_type, metadata, severity, user_id)
      VALUES (
        'input_validation_failed',
        jsonb_build_object(
          'table', 'profiles',
          'field', 'full_name',
          'errors', validation_result->'errors'
        ),
        'medium',
        NEW.user_id
      );

      RAISE EXCEPTION 'Invalid full name: %', (validation_result->>'errors');
    END IF;

    NEW.full_name := validation_result->>'sanitized_value';
  END IF;

  RETURN NEW;
END;
$$;

-- Apply profile validation trigger
DROP TRIGGER IF EXISTS trigger_validate_profile_input ON public.profiles;
CREATE TRIGGER trigger_validate_profile_input
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_profile_input();

-- Create function for API key validation
CREATE OR REPLACE FUNCTION validate_api_key_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validation_result jsonb;
BEGIN
  -- Validate name if present
  IF NEW.name IS NOT NULL THEN
    validation_result := validate_user_input(NEW.name, 'text', 100);

    IF NOT (validation_result->>'is_valid')::boolean THEN
      INSERT INTO public.security_events (event_type, metadata, severity, user_id)
      VALUES (
        'input_validation_failed',
        jsonb_build_object(
          'table', 'api_keys',
          'field', 'name',
          'errors', validation_result->'errors'
        ),
        'high', -- API key operations are high severity
        NEW.user_id
      );

      RAISE EXCEPTION 'Invalid API key name: %', (validation_result->>'errors');
    END IF;

    NEW.name := validation_result->>'sanitized_value';
  END IF;

  RETURN NEW;
END;
$$;

-- Apply API key validation trigger
DROP TRIGGER IF EXISTS trigger_validate_api_key_input ON public.api_keys;
CREATE TRIGGER trigger_validate_api_key_input
  BEFORE INSERT OR UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION validate_api_key_input();

-- Create rate limiting for validation failures
CREATE OR REPLACE FUNCTION check_validation_rate_limit(user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  failure_count integer;
BEGIN
  -- Count validation failures in the last 5 minutes
  SELECT COUNT(*) INTO failure_count
  FROM public.security_events
  WHERE user_id = user_id_param
    AND event_type = 'input_validation_failed'
    AND created_at >= now() - interval '5 minutes';

  -- If more than 10 failures in 5 minutes, consider it suspicious
  IF failure_count > 10 THEN
    -- Log rate limit hit
    INSERT INTO public.security_events (event_type, metadata, severity, user_id)
    VALUES (
      'validation_rate_limit_exceeded',
      jsonb_build_object(
        'failure_count', failure_count,
        'time_window', '5 minutes'
      ),
      'high',
      user_id_param
    );

    RETURN false; -- Block further operations
  END IF;

  RETURN true; -- Allow operation
END;
$$;

-- Create comprehensive input sanitization view
CREATE OR REPLACE VIEW input_validation_stats AS
SELECT
  user_id,
  event_type,
  COUNT(*) as event_count,
  MIN(created_at) as first_occurrence,
  MAX(created_at) as last_occurrence,
  array_agg(DISTINCT metadata->>'table') as affected_tables,
  array_agg(DISTINCT metadata->>'field') as affected_fields
FROM public.security_events
WHERE event_type IN ('input_validation_failed', 'validation_rate_limit_exceeded')
  AND created_at >= now() - interval '30 days'
GROUP BY user_id, event_type
ORDER BY event_count DESC;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_user_input(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION check_validation_rate_limit(uuid) TO authenticated;
GRANT SELECT ON input_validation_stats TO authenticated;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_security_events_validation_lookup
  ON public.security_events (user_id, event_type, created_at)
  WHERE event_type IN ('input_validation_failed', 'validation_rate_limit_exceeded');

-- Log the security enhancement
INSERT INTO public.security_events (event_type, metadata, severity)
VALUES (
  'api_input_validation_implemented',
  jsonb_build_object(
    'implementation_date', now(),
    'protected_tables', ARRAY['supplier_watches', 'profiles', 'api_keys'],
    'validation_functions', ARRAY['validate_user_input', 'check_validation_rate_limit'],
    'security_level', 'comprehensive'
  ),
  'medium'
);

COMMIT;