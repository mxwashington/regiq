import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string; // Allow any string from database
  title: string;
  description: string;
  metadata: Record<string, any>;
  is_resolved: boolean;
  created_at: string;
}

interface RateLimitResult {
  allowed: boolean;
  limit_type: string;
  user_requests: number;
  ip_requests: number;
  retry_after: number;
}

export const useEnhancedSecurity = () => {
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Enhanced rate limiting check
  const checkRateLimit = useCallback(async (endpoint: string): Promise<RateLimitResult> => {
    try {
      const { data, error } = await supabase.rpc('check_enhanced_rate_limit', {
        endpoint_param: endpoint,
        user_rate_limit: 60,
        ip_rate_limit: 100
      });

      if (error) {
        console.error('Rate limit check failed:', error);
        return { allowed: true, limit_type: 'none', user_requests: 0, ip_requests: 0, retry_after: 0 };
      }

      // Type assertion for the RPC result (using unknown for safe conversion)
      const result = data as unknown as RateLimitResult;

      if (!result.allowed) {
        toast({
          title: "Rate Limit Exceeded",
          description: `Too many requests. Please wait ${result.retry_after} seconds before trying again.`,
          variant: "destructive"
        });
      }

      return result;
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true, limit_type: 'none', user_requests: 0, ip_requests: 0, retry_after: 0 };
    }
  }, [toast]);

  // Enhanced security event logging
  const logSecurityEvent = useCallback(async (
    eventType: string,
    metadata: Record<string, any> = {},
    threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ) => {
    try {
      await supabase.rpc('log_security_event_enhanced', {
        event_type_param: eventType,
        metadata_param: metadata,
        threat_level_param: threatLevel
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }, []);

  // Log sensitive data access
  const logSensitiveDataAccess = useCallback(async (
    tableName: string,
    operation: string,
    recordCount: number = 1,
    sensitiveFields: string[] = []
  ) => {
    try {
      await supabase.rpc('log_sensitive_data_access', {
        table_name_param: tableName,
        operation_param: operation,
        record_count_param: recordCount,
        sensitive_fields: sensitiveFields
      });
    } catch (error) {
      console.error('Failed to log sensitive data access:', error);
    }
  }, []);

  // Fetch security alerts for admins
  const fetchSecurityAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSecurityAlerts(data as SecurityAlert[] || []);
    } catch (error) {
      console.error('Failed to fetch security alerts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch security alerts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Resolve security alert
  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({ 
          is_resolved: true, 
          resolved_by: (await supabase.auth.getUser()).data.user?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      // Update local state
      setSecurityAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, is_resolved: true }
            : alert
        )
      );

      toast({
        title: "Success",
        description: "Security alert resolved",
        variant: "default"
      });
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      toast({
        title: "Error", 
        description: "Failed to resolve security alert",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Enhanced admin action logging
  const logAdminAction = useCallback(async (
    actionType: string,
    targetType?: string,
    targetId?: string,
    details: Record<string, any> = {}
  ) => {
    try {
      await supabase.rpc('log_admin_action_enhanced', {
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        details,
        require_admin: true
      });
    } catch (error) {
      console.error('Failed to log admin action:', error);
    }
  }, []);

  // Monitor authentication events
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case 'SIGNED_IN':
          logSecurityEvent('user_login', {
            user_id: session?.user?.id,
            login_method: 'magic_link'
          }, 'low');
          break;
        case 'SIGNED_OUT':
          logSecurityEvent('user_logout', {
            user_id: session?.user?.id
          }, 'low');
          break;
        case 'TOKEN_REFRESHED':
          logSecurityEvent('token_refresh', {
            user_id: session?.user?.id
          }, 'low');
          break;
      }
    });

    return () => subscription.unsubscribe();
  }, [logSecurityEvent]);

  return {
    securityAlerts,
    loading,
    checkRateLimit,
    logSecurityEvent,
    logSensitiveDataAccess,
    fetchSecurityAlerts,
    resolveAlert,
    logAdminAction
  };
};