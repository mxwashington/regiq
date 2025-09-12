import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  id: string;
  event_type: string;
  metadata: Record<string, any>;
  created_at: string;
  threat_level?: string;
}

interface SecurityContextValue {
  logSecurityEvent: (eventType: string, metadata?: Record<string, any>, threatLevel?: 'low' | 'medium' | 'high' | 'critical') => Promise<void>;
  checkAccountLockout: (email: string) => Promise<{ isLocked: boolean; retryAfter: number; failedAttempts: number }>;
  extendSession: (hours?: number) => Promise<boolean>;
  getSecurityPosture: () => Promise<any>;
  isSecureContext: boolean;
  securityScore: number;
  recentSecurityEvents: SecurityEvent[];
}

const SecurityContext = createContext<SecurityContextValue | undefined>(undefined);

export const useEnhancedSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useEnhancedSecurity must be used within EnhancedSecurityProvider');
  }
  return context;
};

interface EnhancedSecurityProviderProps {
  children: React.ReactNode;
}

export const EnhancedSecurityProvider: React.FC<EnhancedSecurityProviderProps> = ({ children }) => {
  const { toast } = useToast();
  const [securityScore, setSecurityScore] = useState(100);
  const [recentSecurityEvents, setRecentSecurityEvents] = useState<SecurityEvent[]>([]);
  
  // Check if we're in a secure context (HTTPS)
  const isSecureContext = typeof window !== 'undefined' ? window.isSecureContext : true;

  const logSecurityEvent = useCallback(async (
    eventType: string, 
    metadata: Record<string, any> = {},
    threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low'
  ) => {
    try {
      await supabase.rpc('log_security_event_enhanced', {
        event_type_param: eventType,
        metadata_param: {
          ...metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator?.userAgent || 'unknown',
          url: window?.location?.href || 'unknown',
          threat_level: threatLevel
        },
        threat_level_param: threatLevel
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }, []);

  const checkAccountLockout = useCallback(async (email: string) => {
    try {
      const { data, error } = await supabase.rpc('check_account_lockout_status', {
        user_email_param: email
      });
      
      if (error) throw error;
      
      const result = data as { 
        is_locked: boolean; 
        retry_after_seconds: number; 
        failed_attempts: number; 
      };
      
      return {
        isLocked: result.is_locked || false,
        retryAfter: result.retry_after_seconds || 0,
        failedAttempts: result.failed_attempts || 0
      };
    } catch (error) {
      console.error('Failed to check account lockout:', error);
      return { isLocked: false, retryAfter: 0, failedAttempts: 0 };
    }
  }, []);

  const extendSession = useCallback(async (hours: number = 2) => {
    try {
      const { data, error } = await supabase.rpc('extend_user_session_secure', {
        hours_to_extend: hours
      });
      
      if (error) throw error;
      
      const result = data as { 
        success: boolean; 
        hours_extended: number; 
      };
      
      if (result.success) {
        toast({
          title: "Session Extended",
          description: `Session extended by ${result.hours_extended} hours`,
          variant: "default"
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to extend session:', error);
      toast({
        title: "Session Extension Failed",
        description: "Unable to extend your session at this time",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  const getSecurityPosture = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_current_security_posture');
      if (error) throw error;
      
      const result = data as { security_score: number };
      setSecurityScore(result.security_score || 100);
      return data;
    } catch (error) {
      console.error('Failed to get security posture:', error);
      return null;
    }
  }, []);

  // Monitor for suspicious activity patterns
  useEffect(() => {
    const handleSecurityViolation = (event: SecurityPolicyViolationEvent) => {
      logSecurityEvent('csp_violation', {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber
      }, 'high');
    };

    // Monitor for suspicious navigation patterns
    const handleBeforeUnload = () => {
      logSecurityEvent('page_unload', {
        path: window.location.pathname,
        duration: Date.now() - (window as any).loadTime
      });
    };

    document.addEventListener('securitypolicyviolation', handleSecurityViolation);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Store page load time for duration calculation
    (window as any).loadTime = Date.now();
    
    return () => {
      document.removeEventListener('securitypolicyviolation', handleSecurityViolation);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [logSecurityEvent]);

  // Periodic security posture check
  useEffect(() => {
    getSecurityPosture();
    
    const interval = setInterval(() => {
      getSecurityPosture();
    }, 300000); // Check every 5 minutes
    
    return () => clearInterval(interval);
  }, [getSecurityPosture]);

  // Log initial page access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      logSecurityEvent('page_access', {
        path: window.location.pathname,
        isSecureContext,
        referrer: document.referrer
      });
    }
  }, [logSecurityEvent, isSecureContext]);

  const value: SecurityContextValue = {
    logSecurityEvent,
    checkAccountLockout,
    extendSession,
    getSecurityPosture,
    isSecureContext,
    securityScore,
    recentSecurityEvents
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};