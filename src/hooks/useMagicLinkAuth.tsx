
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { buildMagicLinkRedirectUrl } from '@/lib/domain';

export const useMagicLinkAuth = () => {
  const { toast } = useToast();

  const signInWithMagicLink = useCallback(async (email: string) => {
    try {
      const redirectUrl = buildMagicLinkRedirectUrl();
      
      console.log('=== MAGIC LINK SIGN IN ===');
      console.log('Email:', email);
      console.log('Redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            admin_request: email === 'marcus@fsqahelp.org'
          }
        }
      });
      
      console.log('Magic link request result:', { error });
      
      if (error) {
        console.error('=== MAGIC LINK ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error code:', error.status);
        
        // Enhanced rate limiting detection
        const isRateLimit = error.message?.includes('rate limit') || 
                           error.message?.includes('429') ||
                           error.status === 429;
        
        if (isRateLimit) {
          console.error('Rate limit detected');
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
        console.log('Magic link sent successfully');
        toast({
          title: "Check your email",
          description: "We've sent you a magic link to sign in.",
        });
      }
      
      return { error };
    } catch (error: any) {
      console.error('=== UNEXPECTED MAGIC LINK ERROR ===');
      console.error('Error:', error);
      
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
