
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
    console.log('=== RATE LIMIT HANDLER ===');
    console.log('Error object:', error);
    console.log('Error message:', error?.message);
    console.log('Error status:', error?.status);
    
    // Enhanced rate limit detection
    const isRateLimit = error?.message?.includes('rate limit') || 
                       error?.message?.includes('429') ||
                       error?.status === 429 ||
                       error?.message?.includes('Too Many Requests');
    
    console.log('Is rate limit detected:', isRateLimit);
    
    if (isRateLimit) {
      const retryAfter = 60; // Default to 60 seconds
      
      console.log('Setting rate limit state:', { retryAfter });
      
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
            console.log('Rate limit countdown finished');
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
    console.log('Resetting rate limit state');
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
