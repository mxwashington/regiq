import { useEffect } from 'react';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';
import { useAuth } from '@/contexts/SafeAuthContext';

export const EnhancedAuthHandler: React.FC = () => {
  const { user } = useAuth();
  const { logSecurityEvent, checkRateLimit } = useEnhancedSecurity();

  useEffect(() => {
    // Enhanced login success tracking with security logging
    if (user) {
      logSecurityEvent('user_authenticated', {
        user_id: user.id,
        authentication_method: 'magic_link',
        session_start: new Date().toISOString()
      }, 'low');
    }
  }, [user, logSecurityEvent]);

  // Enhanced rate limit checking for authentication attempts
  useEffect(() => {
    const handleAuthAttempt = async () => {
      if (!user) {
        const rateLimitResult = await checkRateLimit('auth_attempt');
        if (!rateLimitResult.allowed) {
          // Log suspicious authentication pattern
          logSecurityEvent('auth_rate_limit_exceeded', {
            limit_type: rateLimitResult.limit_type,
            attempts: rateLimitResult.user_requests + rateLimitResult.ip_requests
          }, 'medium');
        }
      }
    };

    handleAuthAttempt();
  }, [user, checkRateLimit, logSecurityEvent]);

  return null; // This is a logic-only component
};