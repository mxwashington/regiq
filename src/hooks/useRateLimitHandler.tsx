
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
interface RateLimitState {
  isRateLimited: boolean;
  retryAfter: number;
  attempts: number;
}

export const useRateLimitHandler = () => {
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    isRateLimited: false,
    retryAfter: 0,
    attempts: 0
  });
  const { toast } = useToast();

  const handleRateLimit = useCallback((error: any) => {
    logger.info('=== RATE LIMIT HANDLER ===');
    logger.info('Error object:', error);
    logger.info('Error message:', error?.message);
    logger.info('Error status:', error?.status);
    
    // Enhanced rate limit detection
    const isRateLimit = error?.message?.includes('rate limit') || 
                       error?.message?.includes('429') ||
                       error?.status === 429 ||
                       error?.message?.includes('Too Many Requests');
    
    logger.info('Is rate limit detected:', isRateLimit);
    
    if (isRateLimit) {
      const retryAfter = 60; // Default to 60 seconds
      
      logger.info('Setting rate limit state:', { retryAfter });
      
      setRateLimitState(prev => ({
        isRateLimited: true,
        retryAfter,
        attempts: prev.attempts + 1
      }));

      toast({
        title: "Rate limit exceeded",
        description: `Please wait ${retryAfter} seconds before trying again.`,
        variant: "destructive",
      });

      // Start countdown
      const interval = setInterval(() => {
        setRateLimitState(prev => {
          if (prev.retryAfter <= 1) {
            clearInterval(interval);
            logger.info('Rate limit countdown finished');
            return {
              ...prev,
              isRateLimited: false,
              retryAfter: 0
            };
          }
          return {
            ...prev,
            retryAfter: prev.retryAfter - 1
          };
        });
      }, 1000);

      return true; // Rate limited
    }
    return false; // Not rate limited
  }, [toast]);

  const resetRateLimit = useCallback(() => {
    logger.info('Resetting rate limit state');
    setRateLimitState({
      isRateLimited: false,
      retryAfter: 0,
      attempts: 0
    });
  }, []);

  return {
    rateLimitState,
    handleRateLimit,
    resetRateLimit
  };
};
