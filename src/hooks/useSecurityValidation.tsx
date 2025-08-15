import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RateLimitState {
  isRateLimited: boolean;
  retryAfter: number;
  attempts: number;
}

export const useSecurityValidation = () => {
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    isRateLimited: false,
    retryAfter: 0,
    attempts: 0
  });
  const { toast } = useToast();

  const validateInput = useCallback((input: string, maxLength = 1000): boolean => {
    if (!input || input.trim().length === 0) {
      toast({
        title: "Validation Error",
        description: "Input cannot be empty",
        variant: "destructive"
      });
      return false;
    }

    if (input.length > maxLength) {
      toast({
        title: "Validation Error", 
        description: `Input too long. Maximum ${maxLength} characters allowed.`,
        variant: "destructive"
      });
      return false;
    }

    // Basic XSS prevention
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<embed/i,
      /<object/i
    ];

    if (dangerousPatterns.some(pattern => pattern.test(input))) {
      toast({
        title: "Security Error",
        description: "Invalid characters detected in input",
        variant: "destructive"
      });
      return false;
    }

    return true;
  }, [toast]);

  const checkRateLimit = useCallback(async (endpoint: string): Promise<boolean> => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      // Check current rate limit status
      const { data: rateLimits } = await supabase
        .from('rate_limits')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('endpoint', endpoint)
        .gte('window_start', new Date(Date.now() - 60000).toISOString()) // Last minute
        .order('created_at', { ascending: false })
        .limit(1);

      if (rateLimits && rateLimits.length > 0) {
        const latestLimit = rateLimits[0];
        if (latestLimit.requests_count >= 60) { // 60 requests per minute limit
          setRateLimitState({
            isRateLimited: true,
            retryAfter: 60,
            attempts: latestLimit.requests_count
          });

          toast({
            title: "Rate Limit Exceeded",
            description: "Too many requests. Please wait a minute before trying again.",
            variant: "destructive"
          });
          return false;
        }
      }

      // Update rate limit counter
      await supabase
        .from('rate_limits')
        .insert({
          user_id: user.user.id,
          endpoint,
          requests_count: 1,
          window_start: new Date().toISOString()
        });

      return true;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return true; // Allow on error to prevent blocking legitimate users
    }
  }, [toast]);

  const sanitizeHtml = useCallback((html: string): string => {
    // Enhanced HTML sanitization - remove all dangerous elements
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
      .replace(/<input\b[^>]*>/gi, '')
      .replace(/<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:[^"'\s]*/gi, '')
      .replace(/data:[^"'\s]*/gi, '')
      .replace(/vbscript:[^"'\s]*/gi, '')
      .replace(/expression\s*\([^)]*\)/gi, '')
      .trim();
  }, []);

  const resetRateLimit = useCallback(() => {
    setRateLimitState({
      isRateLimited: false,
      retryAfter: 0,
      attempts: 0
    });
  }, []);

  return {
    validateInput,
    checkRateLimit,
    sanitizeHtml,
    resetRateLimit,
    rateLimitState
  };
};