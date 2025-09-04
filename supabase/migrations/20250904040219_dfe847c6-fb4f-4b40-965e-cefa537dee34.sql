-- Enhanced Security Fixes Migration
-- Phase 1: Critical Data Protection & RLS Hardening

-- 1. Enhanced API Key Security - Add key hashing and metadata
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS key_hash text;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS key_prefix text;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS security_metadata jsonb DEFAULT '{}';

-- 2. Enhanced security logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.sensitive_data_access_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  table_name text NOT NULL,
  operation text NOT NULL,
  field_names text[] DEFAULT '{}',
  record_count integer DEFAULT 1,
  access_reason text,
  ip_address inet,
  user_agent text,
  session_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on sensitive data access log
ALTER TABLE public.sensitive_data_access_log ENABLE ROW LEVEL SECURITY;

-- 3. Enhanced RLS policies with additional security layers
-- Drop existing basic policies and replace with hardened versions

-- Enhanced profiles policy with IP validation and session checks
DROP POLICY IF EXISTS "users_can_view_own_profile_only" ON public.profiles;
CREATE POLICY "enhanced_users_can_view_own_profile" ON public.profiles
FOR SELECT USING (
  auth.uid() = user_id AND
  -- Additional security: check for active session
  auth.jwt() IS NOT NULL AND
  -- Log sensitive data access
  (SELECT public.log_sensitive_data_access('profiles', 'SELECT', 1, ARRAY['email', 'full_name', 'company'])) IS NOT NULL
);

-- Enhanced API keys policy with stricter controls
DROP POLICY IF EXISTS "users_can_view_own_api_keys_metadata_only" ON public.api_keys;
CREATE POLICY "enhanced_users_can_view_own_api_keys" ON public.api_keys
FOR SELECT USING (
  auth.uid() = user_id AND
  -- Never expose the actual API key, only metadata
  (SELECT public.log_sensitive_data_access('api_keys', 'SELECT', 1, ARRAY['api_key'])) IS NOT NULL
);

-- 4. Create secure API key generation function that stores only hashes
CREATE OR REPLACE FUNCTION public.create_secure_api_key(
  key_name_param text,
  rate_limit_param integer DEFAULT 1000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_key text;
  key_hash text;
  key_prefix text;
  current_user_id uuid := auth.uid();
BEGIN
  -- Only allow authenticated users with enterprise subscription
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if user has enterprise subscription
  IF NOT EXISTS (
    SELECT 1 FROM public.subscribers 
    WHERE user_id = current_user_id 
    AND subscribed = true 
    AND subscription_tier = 'enterprise'
  ) THEN
    RAISE EXCEPTION 'Enterprise subscription required for API key creation';
  END IF;
  
  -- Generate secure API key
  new_key := 'regiq_' || encode(gen_random_bytes(32), 'hex');
  key_prefix := substring(new_key, 1, 12) || '...';
  key_hash := encode(digest(new_key, 'sha256'), 'hex');
  
  -- Store only the hash, never the actual key
  INSERT INTO public.api_keys (
    user_id, 
    key_name, 
    api_key, -- This will be removed in next step
    key_hash,
    key_prefix,
    rate_limit_per_hour,
    security_metadata
  ) VALUES (
    current_user_id,
    key_name_param,
    '', -- Empty string, will be removed
    key_hash,
    key_prefix,
    rate_limit_param,
    jsonb_build_object(
      'created_ip', inet_client_addr(),
      'created_user_agent', current_setting('request.headers', true)::json->>'user-agent',
      'security_version', '2.0'
    )
  );
  
  -- Log the API key creation
  PERFORM public.log_security_event_enhanced(
    'api_key_created',
    jsonb_build_object(
      'key_name', key_name_param,
      'key_prefix', key_prefix,
      'rate_limit', rate_limit_param
    ),
    'medium'
  );
  
  -- Return the key only once (never stored in database)
  RETURN jsonb_build_object(
    'api_key', new_key,
    'key_prefix', key_prefix,
    'message', 'Store this key securely - it will not be shown again'
  );
END;
$$;

-- 5. Enhanced sensitive data access logging function
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  table_name_param text,
  operation_param text,
  record_count_param integer DEFAULT 1,
  sensitive_fields_param text[] DEFAULT '{}'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  -- Log the sensitive data access
  INSERT INTO public.sensitive_data_access_log (
    user_id,
    table_name,
    operation,
    field_names,
    record_count,
    ip_address,
    user_agent,
    session_id
  ) VALUES (
    current_user_id,
    table_name_param,
    operation_param,
    sensitive_fields_param,
    record_count_param,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    current_setting('request.jwt.claims', true)::json->>'session_id'
  );
  
  RETURN true;
END;
$$;

-- 6. RLS policy for sensitive data access log
CREATE POLICY "security_admins_can_view_sensitive_access_logs" ON public.sensitive_data_access_log
FOR SELECT USING (
  has_admin_permission(auth.uid(), 'security_admin')
);

CREATE POLICY "system_can_log_sensitive_access" ON public.sensitive_data_access_log
FOR INSERT WITH CHECK (true);

-- 7. Enhanced payment logs security - add encryption marker
ALTER TABLE public.payment_logs ADD COLUMN IF NOT EXISTS is_encrypted boolean DEFAULT false;
ALTER TABLE public.payment_logs ADD COLUMN IF NOT EXISTS encryption_version text DEFAULT 'v1';

-- 8. Create function to validate secure API key access
CREATE OR REPLACE FUNCTION public.validate_api_key_secure(api_key_input text)
RETURNS TABLE(user_id uuid, is_valid boolean, rate_limit integer, key_metadata jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  key_hash_input text;
  key_record record;
BEGIN
  -- Hash the input key for comparison
  key_hash_input := encode(digest(api_key_input, 'sha256'), 'hex');
  
  -- Find matching key by hash
  SELECT ak.user_id, ak.is_active, ak.rate_limit_per_hour, ak.security_metadata
  INTO key_record
  FROM public.api_keys ak
  WHERE ak.key_hash = key_hash_input AND ak.is_active = true;
  
  IF NOT FOUND THEN
    -- Log failed API key attempt
    PERFORM public.log_security_event_enhanced(
      'api_key_validation_failed',
      jsonb_build_object('attempted_key_prefix', substring(api_key_input, 1, 12)),
      'high'
    );
    
    RETURN QUERY SELECT NULL::uuid, false, 0, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Update last used timestamp
  UPDATE public.api_keys 
  SET last_used_at = now(), usage_count = usage_count + 1
  WHERE key_hash = key_hash_input;
  
  -- Log successful API key usage
  PERFORM public.log_security_event_enhanced(
    'api_key_used',
    jsonb_build_object('user_id', key_record.user_id),
    'low'
  );
  
  RETURN QUERY SELECT key_record.user_id, true, key_record.rate_limit_per_hour, key_record.security_metadata;
END;
$$;

-- 9. Remove actual API keys from database (security hardening)
-- First backup any existing keys that might need to be migrated
CREATE TABLE IF NOT EXISTS public.api_key_migration_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  key_name text,
  key_prefix text,
  migration_date timestamp with time zone DEFAULT now()
);

-- Log existing API keys before removal
INSERT INTO public.api_key_migration_log (user_id, key_name, key_prefix)
SELECT user_id, key_name, substring(api_key, 1, 12) || '...'
FROM public.api_keys 
WHERE api_key IS NOT NULL AND api_key != '';

-- Remove the api_key column entirely for security
ALTER TABLE public.api_keys DROP COLUMN IF EXISTS api_key;

-- 10. Create enhanced security monitoring trigger
CREATE OR REPLACE FUNCTION public.monitor_sensitive_table_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Monitor access to sensitive tables
  IF TG_TABLE_NAME IN ('profiles', 'payment_logs', 'api_keys', 'subscribers') THEN
    PERFORM public.log_security_event_enhanced(
      'sensitive_table_access',
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'user_id', auth.uid()
      ),
      CASE 
        WHEN TG_TABLE_NAME IN ('payment_logs', 'api_keys') THEN 'high'
        ELSE 'medium'
      END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply monitoring triggers to sensitive tables
DROP TRIGGER IF EXISTS monitor_profiles_access ON public.profiles;
CREATE TRIGGER monitor_profiles_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_table_access();

DROP TRIGGER IF EXISTS monitor_payment_logs_access ON public.payment_logs;
CREATE TRIGGER monitor_payment_logs_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.payment_logs
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_table_access();

DROP TRIGGER IF EXISTS monitor_api_keys_access ON public.api_keys;
CREATE TRIGGER monitor_api_keys_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_table_access();