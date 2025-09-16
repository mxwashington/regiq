-- Phase 3: Extension & Infrastructure Security (R-032, R-033)
-- Fix extension placement and prepare for version upgrade

-- Move extensions from public schema (security best practice)
-- Note: This requires manual intervention for some extensions
-- Extensions should be in their own schema, not public

-- Create dedicated schema for extensions if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Add comment about Postgres version upgrade requirement
COMMENT ON DATABASE postgres IS 'Database requires upgrade to latest Postgres version for security patches. See: https://supabase.com/docs/guides/platform/upgrading';

-- Phase 4: RegIQ-Specific Security Hardening
-- Enhanced rate limiting for compliance data access

CREATE OR REPLACE FUNCTION public.check_compliance_data_rate_limit(
  user_uuid uuid,
  operation_type text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_hour timestamp := date_trunc('hour', now());
  operation_count integer;
  rate_limit integer;
BEGIN
  -- Get current hour's operation count
  SELECT COALESCE(SUM(record_count), 0) INTO operation_count
  FROM public.sensitive_data_access_log
  WHERE user_id = user_uuid 
    AND operation = operation_type
    AND created_at >= current_hour;
  
  -- Set rate limits based on operation type
  CASE operation_type
    WHEN 'regulatory_search' THEN rate_limit := 100;
    WHEN 'alert_export' THEN rate_limit := 50;
    WHEN 'compliance_report' THEN rate_limit := 25;
    ELSE rate_limit := 10;
  END CASE;
  
  -- Check if under limit
  RETURN operation_count < rate_limit;
END;
$$;

-- Enhanced audit logging for compliance
CREATE OR REPLACE FUNCTION public.log_compliance_access(
  operation_type text,
  table_accessed text,
  record_count integer DEFAULT 1,
  additional_data jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log to sensitive data access log
  INSERT INTO public.sensitive_data_access_log (
    user_id,
    table_name,
    operation,
    record_count,
    field_names,
    access_reason,
    ip_address,
    user_agent,
    session_id
  ) VALUES (
    auth.uid(),
    table_accessed,
    operation_type,
    record_count,
    COALESCE(additional_data->>'fields_accessed', '{}')::text[],
    COALESCE(additional_data->>'reason', 'compliance_data_access'),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    COALESCE(additional_data->>'session_id', gen_random_uuid()::text)
  );
  
  -- Also log to audit_log for compliance tracking
  INSERT INTO public.audit_log (
    user_id,
    action,
    table_name,
    record_id,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    operation_type,
    table_accessed,
    COALESCE(additional_data->>'record_id', 'multiple'),
    jsonb_build_object(
      'operation_type', operation_type,
      'record_count', record_count,
      'compliance_context', true,
      'additional_data', additional_data
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;

-- Create compliance-specific security policies
-- Fix profiles table RLS to be more restrictive
DROP POLICY IF EXISTS "strict_users_can_view_own_profile_only" ON public.profiles;
CREATE POLICY "users_own_profile_access_only" ON public.profiles
FOR ALL USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Enhanced team member security
DROP POLICY IF EXISTS "Team owners can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view team info" ON public.team_members;
CREATE POLICY "secure_team_member_access" ON public.team_members
FOR ALL USING (
  auth.uid() = team_owner OR 
  (member_email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND status = 'active')
)
WITH CHECK (
  auth.uid() = team_owner
);

-- Create immutable audit policy
CREATE POLICY "audit_immutable_policy" ON public.audit_log
FOR DELETE USING (false);

CREATE POLICY "audit_no_updates" ON public.audit_log  
FOR UPDATE USING (false);

-- Add compliance data validation trigger
CREATE OR REPLACE FUNCTION public.validate_compliance_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check rate limit for compliance operations
  IF NOT public.check_compliance_data_rate_limit(
    auth.uid(), 
    TG_OP || '_' || TG_TABLE_NAME
  ) THEN
    RAISE EXCEPTION 'Rate limit exceeded for compliance data access';
  END IF;
  
  -- Log the access
  PERFORM public.log_compliance_access(
    TG_OP || '_' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    1,
    jsonb_build_object(
      'trigger_fired', now(),
      'operation', TG_OP,
      'record_id', COALESCE(NEW.id::text, OLD.id::text)
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply compliance validation to sensitive tables
DROP TRIGGER IF EXISTS compliance_validation_profiles ON public.profiles;
CREATE TRIGGER compliance_validation_profiles
  BEFORE INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_compliance_data_access();

DROP TRIGGER IF EXISTS compliance_validation_alerts ON public.alerts;
CREATE TRIGGER compliance_validation_alerts  
  BEFORE SELECT OR INSERT OR UPDATE OR DELETE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.validate_compliance_data_access();