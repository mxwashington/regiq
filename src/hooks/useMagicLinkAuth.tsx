
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildMagicLinkRedirectUrl } from '@/lib/domain';

import { logger } from '@/lib/logger';
export const useMagicLinkAuth = () => {
  const { toast } = useToast();

  const signInWithMagicLink = useCallback(async (email: string) => {
    try {
      const redirectUrl = buildMagicLinkRedirectUrl();
      
      logger.info('=== MAGIC LINK SIGN IN ===');
      logger.info('Email:', email);
      logger.info('Redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            admin_request: email === 'marcus@regiq.org'
          }
        }
      });
      
      logger.info('Magic link request result:', { error });
      
      if (error) {
        logger.error('=== MAGIC LINK ERROR ===');
        logger.error('Error message:', error.message);
        logger.error('Error code:', error.status);
        
        // Enhanced rate limiting detection
        const isRateLimit = error.message?.includes('rate limit') || 
                           error.message?.includes('429') ||
                           error.status === 429;
        
        if (isRateLimit) {
          logger.error('Rate limit detected');
          toast({
            title: "Rate limit exceeded",
            description: "Please wait a moment before requesting another magic link.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Magic link failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        logger.info('Magic link sent successfully');
        toast({
          title: "Check your email",
          description: "We've sent you a magic link to sign in.",
        });
      }
      
      return { error };
    } catch (error: any) {
      logger.error('=== UNEXPECTED MAGIC LINK ERROR ===');
      logger.error('Error:', error);
      
      toast({
        title: "Magic link failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return { error };
    }
  }, [toast]);

  return { signInWithMagicLink };
};
