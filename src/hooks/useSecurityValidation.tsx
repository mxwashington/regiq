import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
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
      // Use enhanced rate limiting function
      const { data, error } = await supabase.rpc('check_enhanced_rate_limit', {
        endpoint_param: endpoint,
        user_rate_limit: 60,
        ip_rate_limit: 100
      });

      if (error) {
        logger.error('Rate limit check failed:', error);
        return true; // Allow on error to prevent blocking legitimate users
      }

      // Type assertion for the RPC result
      if (!(data as any).allowed) {
        setRateLimitState({
          isRateLimited: true,
          retryAfter: (data as any).retry_after,
          attempts: (data as any).user_requests + (data as any).ip_requests
        });

        toast({
          title: "Rate Limit Exceeded",
          description: `Too many requests (${(data as any).limit_type} limit). Please wait ${(data as any).retry_after} seconds.`,
          variant: "destructive"
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Rate limit check failed:', error);
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