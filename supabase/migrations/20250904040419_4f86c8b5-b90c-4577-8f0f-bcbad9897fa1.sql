-- Enhanced Security Fixes Migration (Corrected)
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

-- 3. Enhanced sensitive data access logging function
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

-- 4. RLS policy for sensitive data access log
CREATE POLICY "security_admins_can_view_sensitive_access_logs" ON public.sensitive_data_access_log
FOR SELECT USING (
  has_admin_permission(auth.uid(), 'security_admin')
);

CREATE POLICY "system_can_log_sensitive_access" ON public.sensitive_data_access_log
FOR INSERT WITH CHECK (true);

-- 5. Enhanced RLS policies with additional security layers
-- Enhanced profiles policy with session validation
DROP POLICY IF EXISTS "users_can_view_own_profile_only" ON public.profiles;
CREATE POLICY "enhanced_users_can_view_own_profile" ON public.profiles
FOR SELECT USING (
  auth.uid() = user_id AND
  -- Additional security: check for active session
  auth.jwt() IS NOT NULL
);

-- Enhanced API keys policy with stricter controls  
DROP POLICY IF EXISTS "users_can_view_own_api_keys_metadata_only" ON public.api_keys;
CREATE POLICY "enhanced_users_can_view_own_api_keys" ON public.api_keys
FOR SELECT USING (
  auth.uid() = user_id AND
  -- Additional validation for API key access
  auth.jwt() IS NOT NULL
);

-- 6. Create secure API key generation function
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
  -- Only allow authenticated users
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Generate secure API key
  new_key := 'regiq_' || encode(gen_random_bytes(32), 'hex');
  key_prefix := substring(new_key, 1, 12) || '...';
  key_hash := encode(digest(new_key, 'sha256'), 'hex');
  
  -- Store key with hash
  INSERT INTO public.api_keys (
    user_id, 
    key_name, 
    key_hash,
    key_prefix,
    rate_limit_per_hour,
    security_metadata,
    is_active
  ) VALUES (
    current_user_id,
    key_name_param,
    key_hash,
    key_prefix,
    rate_limit_param,
    jsonb_build_object(
      'created_ip', inet_client_addr(),
      'created_user_agent', current_setting('request.headers', true)::json->>'user-agent',
      'security_version', '2.0'
    ),
    true
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
  
  -- Return the key only once (never stored in database again)
  RETURN jsonb_build_object(
    'api_key', new_key,
    'key_prefix', key_prefix,
    'message', 'Store this key securely - it will not be shown again'
  );
END;
$$;

-- 7. Enhanced payment logs security - add encryption markers
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

-- 9. Enhanced security monitoring trigger for data modifications
CREATE OR REPLACE FUNCTION public.monitor_sensitive_table_modifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Monitor modifications to sensitive tables
  IF TG_TABLE_NAME IN ('profiles', 'payment_logs', 'api_keys', 'subscribers') THEN
    PERFORM public.log_security_event_enhanced(
      'sensitive_table_modification',
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'user_id', auth.uid(),
        'record_id', COALESCE(NEW.id, OLD.id)
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

-- Apply monitoring triggers to sensitive tables (INSERT, UPDATE, DELETE only)
DROP TRIGGER IF EXISTS monitor_profiles_modifications ON public.profiles;
CREATE TRIGGER monitor_profiles_modifications
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_table_modifications();

DROP TRIGGER IF EXISTS monitor_payment_logs_modifications ON public.payment_logs;  
CREATE TRIGGER monitor_payment_logs_modifications
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_logs
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_table_modifications();

DROP TRIGGER IF EXISTS monitor_api_keys_modifications ON public.api_keys;
CREATE TRIGGER monitor_api_keys_modifications
  AFTER INSERT OR UPDATE OR DELETE ON public.api_keys  
  FOR EACH ROW EXECUTE FUNCTION public.monitor_sensitive_table_modifications();