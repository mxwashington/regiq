import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
interface RateLimitResult {
  allowed: boolean;
  userRequests: number;
  ipRequests: number;
  userLimit: number;
  ipLimit: number;
  isBlocked: boolean;
  retryAfter?: number;
}

export const useSecureRateLimit = () => {
  const { toast } = useToast();
  const [rateLimitStatus, setRateLimitStatus] = useState<Record<string, RateLimitResult>>({});

  const checkRateLimit = useCallback(async (
    endpoint: string,
    userLimit = 60,
    ipLimit = 100
  ): Promise<boolean> => {
    try {
      const { data, error } = await (supabase as any).rpc('enhanced_rate_limit_check', {
        endpoint_name: endpoint,
        user_limit: userLimit,
        ip_limit: ipLimit
      });

      if (error) {
        logger.error('Rate limit check error:', error);
        // Fail open - allow request if rate limit service is down
        return true;
      }

      const result = data as unknown as RateLimitResult;
      
      setRateLimitStatus(prev => ({
        ...prev,
        [endpoint]: result
      }));

      if (!result.allowed) {
        const reason = result.isBlocked 
          ? 'Your IP has been temporarily blocked due to suspicious activity'
          : result.userRequests >= result.userLimit 
            ? 'User rate limit exceeded'
            : 'IP rate limit exceeded';

        toast({
          title: "Rate Limit Exceeded",
          description: `${reason}. Please wait before making more requests.`,
          variant: "destructive"
        });

        return false;
      }

      return true;
    } catch (err) {
      logger.error('Rate limit check failed:', err);
      // Fail open in case of errors
      return true;
    }
  }, [toast]);

  const getRateLimitStatus = useCallback((endpoint: string): RateLimitResult | null => {
    return rateLimitStatus[endpoint] || null;
  }, [rateLimitStatus]);

  const resetRateLimit = useCallback((endpoint?: string) => {
    if (endpoint) {
      setRateLimitStatus(prev => {
        const { [endpoint]: _, ...rest } = prev;
        return rest;
      });
    } else {
      setRateLimitStatus({});
    }
  }, []);

  return {
    checkRateLimit,
    getRateLimitStatus,
    resetRateLimit,
    rateLimitStatus
  };
};