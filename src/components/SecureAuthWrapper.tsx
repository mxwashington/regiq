import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock } from 'lucide-react';
import { useEnhancedSecurity } from '@/components/stubs/MissingComponents';
import { logger } from '@/lib/logger';

interface SecureAuthWrapperProps {
  children: React.ReactNode;
}

export const SecureAuthWrapper: React.FC<SecureAuthWrapperProps> = ({ children }) => {
  const { toast } = useToast();
  const { checkAccountLockout, logSecurityEvent } = useEnhancedSecurity();
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState<{
    retry_after_seconds: number;
    failed_attempts: number;
  } | null>(null);

  const handleAuthAttempt = useCallback(async (email: string, isSuccess: boolean) => {
    try {
      // Log the authentication attempt
      await logSecurityEvent(
        isSuccess ? 'successful_login' : 'failed_login',
        { email, timestamp: Date.now() },
        isSuccess ? 'low' : 'medium'
      );

      // Check for account lockout on failed attempts
      if (!isSuccess) {
        const lockoutStatus = await checkAccountLockout(email);
        
        if (lockoutStatus.is_locked) {
          setIsLocked(true);
          setLockoutInfo({
            retry_after_seconds: lockoutStatus.retry_after_seconds,
            failed_attempts: lockoutStatus.failed_attempts || 0
          });
          
          toast({
            title: "Account Temporarily Locked",
            description: `Too many failed attempts. Try again in ${Math.ceil(lockoutStatus.retry_after_seconds / 60)} minutes.`,
            variant: "destructive"
          });
        }
      } else {
        // Reset lockout state on successful login
        setIsLocked(false);
        setLockoutInfo(null);
      }
    } catch (error) {
      logger.error('Auth security check failed:', error);
    }
  }, [checkAccountLockout, logSecurityEvent, toast]);

  // Enhanced sign in with security checks
  const secureSignIn = useCallback(async (email: string, password: string) => {
    try {
      // Check account lockout first
      const lockoutStatus = await checkAccountLockout(email);
      
      if (lockoutStatus.is_locked) {
        setIsLocked(true);
        setLockoutInfo({
          retry_after_seconds: lockoutStatus.retry_after_seconds,
          failed_attempts: lockoutStatus.failed_attempts || 0
        });
        
        throw new Error(`Account locked. Try again in ${Math.ceil(lockoutStatus.retry_after_seconds / 60)} minutes.`);
      }

      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      await handleAuthAttempt(email, !error);

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      await handleAuthAttempt(email, false);
      throw error;
    }
  }, [checkAccountLockout, handleAuthAttempt]);

  // Enhanced sign up with security logging
  const secureSignUp = useCallback(async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: metadata
        }
      });

      // Log registration attempt
      await logSecurityEvent(
        'user_registration_attempt',
        { 
          email, 
          success: !error,
          metadata: metadata || {}
        },
        'low'
      );

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      throw error;
    }
  }, [logSecurityEvent]);

  // Provide secure auth methods to children
  const authMethods = {
    secureSignIn,
    secureSignUp,
    handleAuthAttempt
  };

  // Inject auth methods into child components
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { ...authMethods } as any);
    }
    return child;
  });

  return (
    <>
      {isLocked && lockoutInfo && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Account locked due to {lockoutInfo.failed_attempts} failed login attempts.
              Please wait {Math.ceil(lockoutInfo.retry_after_seconds / 60)} minutes before trying again.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="ml-4"
            >
              <Clock className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {childrenWithProps}
    </>
  );
};