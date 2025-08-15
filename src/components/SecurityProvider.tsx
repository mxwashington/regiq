import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useSecurityValidation } from '@/hooks/useSecurityValidation';
import { supabase } from '@/integrations/supabase/client';

interface SecurityContextValue {
  sanitizeInput: (input: string) => string;
  validateInput: (input: string, maxLength?: number) => boolean;
  logSecurityEvent: (eventType: string, metadata?: Record<string, any>) => Promise<void>;
  isSecureContext: boolean;
}

const SecurityContext = createContext<SecurityContextValue | undefined>(undefined);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within a SecurityProvider');
  }
  return context;
};

interface SecurityProviderProps {
  children: React.ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const { validateInput, sanitizeHtml } = useSecurityValidation();

  // Check if we're in a secure context (HTTPS)
  const isSecureContext = typeof window !== 'undefined' ? window.isSecureContext : true;

  const logSecurityEvent = useCallback(async (eventType: string, metadata: Record<string, any> = {}) => {
    try {
      await supabase.rpc('log_security_event', {
        event_type_param: eventType,
        metadata_param: {
          ...metadata,
          timestamp: new Date().toISOString(),
          userAgent: navigator?.userAgent || 'unknown',
          url: window?.location?.href || 'unknown'
        }
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }, []);

  // Log page access for security monitoring
  useEffect(() => {
    if (typeof window !== 'undefined') {
      logSecurityEvent('page_access', {
        path: window.location.pathname,
        isSecureContext
      });
    }
  }, [logSecurityEvent, isSecureContext]);

  // Monitor for suspicious activity
  useEffect(() => {
    const handleSecurityViolation = (event: SecurityPolicyViolationEvent) => {
      logSecurityEvent('csp_violation', {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber
      });
    };

    document.addEventListener('securitypolicyviolation', handleSecurityViolation);
    
    return () => {
      document.removeEventListener('securitypolicyviolation', handleSecurityViolation);
    };
  }, [logSecurityEvent]);

  const value: SecurityContextValue = {
    sanitizeInput: sanitizeHtml,
    validateInput,
    logSecurityEvent,
    isSecureContext
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};