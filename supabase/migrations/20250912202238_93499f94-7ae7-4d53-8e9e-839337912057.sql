-- Fix remaining security warnings from linter

-- Fix search_path issues for functions that don't have it set
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';
ALTER FUNCTION public.dismiss_alert_for_user(uuid, uuid) SET search_path = 'public';
ALTER FUNCTION public.clear_all_alerts_for_user(uuid) SET search_path = 'public';
ALTER FUNCTION public.reset_data_pipeline_timestamps() SET search_path = 'public';
ALTER FUNCTION public.upsert_system_setting(text, jsonb, text) SET search_path = 'public';
ALTER FUNCTION public.log_source_finder_result(integer, integer, text, text) SET search_path = 'public';
ALTER FUNCTION public.get_analytics_overview(integer) SET search_path = 'public';
ALTER FUNCTION public.update_user_admin_permissions(uuid, text[]) SET search_path = 'public';
ALTER FUNCTION public.secure_api_key_access() SET search_path = 'public';
ALTER FUNCTION public.prevent_direct_role_modification() SET search_path = 'public';
ALTER FUNCTION public.enforce_facility_limit() SET search_path = 'public';
ALTER FUNCTION public.cleanup_old_data() SET search_path = 'public';
ALTER FUNCTION public.enforce_supplier_watch_limit() SET search_path = 'public';
ALTER FUNCTION public.log_security_event(text, jsonb) SET search_path = 'public';
ALTER FUNCTION public.update_user_profile(uuid, text, text, text) SET search_path = 'public';
ALTER FUNCTION public.log_admin_action(text, text, text, jsonb) SET search_path = 'public';
ALTER FUNCTION public.detect_suspicious_activity(uuid) SET search_path = 'public';
ALTER FUNCTION public.grant_admin_permission(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.revoke_admin_permission(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.generate_api_key() SET search_path = 'public';
ALTER FUNCTION public.provision_enterprise_api_key(uuid) SET search_path = 'public';
ALTER FUNCTION public.revoke_user_api_keys(uuid) SET search_path = 'public';
ALTER FUNCTION public.validate_enterprise_api_key(text) SET search_path = 'public';
ALTER FUNCTION public.handle_subscription_change() SET search_path = 'public';
ALTER FUNCTION public.update_api_keys_updated_at() SET search_path = 'public';
ALTER FUNCTION public.has_enterprise_feature(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.get_feature_usage(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.clean_expired_cache() SET search_path = 'public';
ALTER FUNCTION public.get_security_status_summary() SET search_path = 'public';
ALTER FUNCTION public.log_data_access_attempt(text, text, integer) SET search_path = 'public';
ALTER FUNCTION public.get_api_rate_limit(uuid) SET search_path = 'public';
ALTER FUNCTION public.log_suspicious_activity() SET search_path = 'public';
ALTER FUNCTION public.is_account_locked(text) SET search_path = 'public';
ALTER FUNCTION public.get_security_dashboard() SET search_path = 'public';
ALTER FUNCTION public.log_critical_data_access(text, text, integer, jsonb) SET search_path = 'public';
ALTER FUNCTION public.get_security_implementation_summary() SET search_path = 'public';
ALTER FUNCTION public.validate_api_key_secure(text) SET search_path = 'public';
ALTER FUNCTION public.get_user_entitlements(uuid) SET search_path = 'public';
ALTER FUNCTION public.check_enhanced_rate_limit(text, inet, integer, integer) SET search_path = 'public';
ALTER FUNCTION public.log_sensitive_data_access(text, text, integer, jsonb) SET search_path = 'public';
ALTER FUNCTION public.create_security_alert(text, text, text, text, jsonb) SET search_path = 'public';
ALTER FUNCTION public.monitor_security_events() SET search_path = 'public';
ALTER FUNCTION public.log_admin_action_enhanced(text, text, text, jsonb, boolean) SET search_path = 'public';
ALTER FUNCTION public.check_feature_access(uuid, text) SET search_path = 'public';
ALTER FUNCTION public.log_sensitive_data_access(text, text, integer, text[]) SET search_path = 'public';
ALTER FUNCTION public.create_secure_api_key(text, integer) SET search_path = 'public';
ALTER FUNCTION public.monitor_sensitive_table_modifications() SET search_path = 'public';
ALTER FUNCTION public.check_current_security_status() SET search_path = 'public';

-- Fix typo in session extension function
CREATE OR REPLACE FUNCTION extend_user_session_secure(hours_to_extend INTEGER DEFAULT 2)
RETURNS jsonb AS $$
DECLARE
  current_user_id uuid := auth.uid();
  max_extension_hours INTEGER := 8;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Limit session extension
  IF hours_to_extend > max_extension_hours THEN
    hours_to_extend := max_extension_hours;
  END IF;
  
  -- Update session extension in profiles
  UPDATE profiles 
  SET session_extended_until = now() + (hours_to_extend || ' hours')::interval
  WHERE user_id = current_user_id;
  
  -- Log session extension
  PERFORM log_security_event_enhanced(
    'session_extended',
    jsonb_build_object(
      'hours_extended', hours_to_extend,
      'extended_until', now() + (hours_to_extend || ' hours')::interval
    ),
    'low'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'extended_until', now() + (hours_to_extend || ' hours')::interval,
    'hours_extended', hours_to_extend
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Set search_path for new functions as well
ALTER FUNCTION public.check_account_lockout_status(text) SET search_path = 'public';
ALTER FUNCTION public.get_security_dashboard_enhanced() SET search_path = 'public';

-- Additional security enhancements: Create trigger to monitor admin activities
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