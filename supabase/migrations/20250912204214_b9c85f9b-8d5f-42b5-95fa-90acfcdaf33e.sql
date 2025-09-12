-- Fix trigger conflicts and complete security setup

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS monitor_profiles_admin_access ON public.profiles;
DROP TRIGGER IF EXISTS monitor_api_keys_admin_access ON public.api_keys;

-- Create enhanced admin monitoring trigger function
CREATE OR REPLACE FUNCTION log_admin_activities_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log for admin users
  IF is_admin(auth.uid()) THEN
    PERFORM log_security_event_enhanced(
      'admin_database_action',
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'admin_id', auth.uid(),
        'timestamp', now()
      ),
      'medium'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Apply admin monitoring to sensitive tables
CREATE TRIGGER monitor_profiles_admin_access
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION log_admin_activities_trigger();

CREATE TRIGGER monitor_api_keys_admin_access
  AFTER INSERT OR UPDATE OR DELETE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION log_admin_activities_trigger();

-- Create function to get current security posture
CREATE OR REPLACE FUNCTION get_current_security_posture()
RETURNS jsonb AS $$
DECLARE
  security_score INTEGER := 100;
  issues jsonb := '[]'::jsonb;
  rls_enabled_tables INTEGER;
  total_tables INTEGER;
  recent_security_events INTEGER;
BEGIN
  -- Check RLS coverage
  SELECT COUNT(*) INTO rls_enabled_tables
  FROM information_schema.tables t
  JOIN pg_class c ON c.relname = t.table_name
  WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND c.relrowsecurity = true;
    
  SELECT COUNT(*) INTO total_tables
  FROM information_schema.tables
  WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE';
  
  -- Check recent security events
  SELECT COUNT(*) INTO recent_security_events
  FROM security_events 
  WHERE created_at > now() - interval '24 hours'
    AND metadata->>'threat_level' IN ('high', 'critical');
  
  -- Calculate security score
  IF rls_enabled_tables < total_tables THEN
    security_score := security_score - 20;
    issues := issues || jsonb_build_object('type', 'missing_rls', 'severity', 'high');
  END IF;
  
  IF recent_security_events > 5 THEN
    security_score := security_score - 30;
    issues := issues || jsonb_build_object('type', 'high_threat_activity', 'severity', 'critical');
  END IF;
  
  RETURN jsonb_build_object(
    'security_score', security_score,
    'posture', CASE 
      WHEN security_score >= 90 THEN 'EXCELLENT'
      WHEN security_score >= 70 THEN 'GOOD'
      WHEN security_score >= 50 THEN 'ADEQUATE'
      ELSE 'NEEDS_IMPROVEMENT'
    END,
    'rls_coverage_percent', ROUND((rls_enabled_tables::float / NULLIF(total_tables, 0)) * 100, 1),
    'issues', issues,
    'assessed_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create comprehensive security audit function  
CREATE OR REPLACE FUNCTION run_security_audit()
RETURNS jsonb AS $$
DECLARE
  audit_results jsonb;
  critical_issues INTEGER := 0;
  high_issues INTEGER := 0;
  medium_issues INTEGER := 0;
  findings jsonb := '[]'::jsonb;
BEGIN
  -- Only security admins can run audits
  IF NOT (is_admin(auth.uid()) AND has_admin_permission(auth.uid(), 'security_admin')) THEN
    RAISE EXCEPTION 'Access denied: Security admin privileges required';
  END IF;
  
  -- Check for users without profiles (data consistency)
  IF EXISTS (
    SELECT 1 FROM auth.users au 
    LEFT JOIN profiles p ON au.id = p.user_id 
    WHERE p.user_id IS NULL
  ) THEN
    critical_issues := critical_issues + 1;
    findings := findings || jsonb_build_object(
      'type', 'orphaned_users',
      'severity', 'critical',
      'description', 'Users exist without corresponding profiles'
    );
  END IF;
  
  -- Check for API keys without proper security metadata
  IF EXISTS (
    SELECT 1 FROM api_keys 
    WHERE security_metadata IS NULL OR security_metadata = '{}'::jsonb
  ) THEN
    high_issues := high_issues + 1;
    findings := findings || jsonb_build_object(
      'type', 'insecure_api_keys',
      'severity', 'high', 
      'description', 'API keys found without security metadata'
    );
  END IF;
  
  -- Check for payment logs without encryption flags
  IF EXISTS (
    SELECT 1 FROM payment_logs 
    WHERE is_encrypted = false OR is_encrypted IS NULL
  ) THEN
    high_issues := high_issues + 1;
    findings := findings || jsonb_build_object(
      'type', 'unencrypted_payment_data',
      'severity', 'high',
      'description', 'Payment logs found without encryption'
    );
  END IF;
  
  audit_results := jsonb_build_object(
    'audit_timestamp', now(),
    'audited_by', auth.uid(),
    'security_score', CASE 
      WHEN critical_issues > 0 THEN 0
      WHEN high_issues > 3 THEN 40
      WHEN high_issues > 0 THEN 70
      ELSE 95
    END,
    'issues_summary', jsonb_build_object(
      'critical', critical_issues,
      'high', high_issues, 
      'medium', medium_issues
    ),
    'findings', findings,
    'next_audit_recommended', now() + interval '7 days'
  );
  
  -- Log the audit
  PERFORM log_security_event_enhanced(
    'security_audit_completed',
    audit_results,
    'medium'
  );
  
  RETURN audit_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';