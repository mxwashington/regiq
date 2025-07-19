
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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
    if (error?.message?.includes('rate limit') || error?.message?.includes('429')) {
      const retryAfter = 60; // Default to 60 seconds
      
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
