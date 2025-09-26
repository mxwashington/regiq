import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useSSO } from '@/hooks/useSSO';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

import { logger } from '@/lib/logger';
export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { provisionSSOUser } = useSSO();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the auth callback from Supabase
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Auth callback error:', error);
          setStatus('error');
          setMessage(error.message || 'Authentication failed');
          return;
        }

        if (data.session?.user) {
          const user = data.session.user;
          const provider = user.app_metadata?.provider;
          
          // If this is an SSO login, provision the user
          if (provider && provider !== 'email') {
            const ssoUser = {
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.full_name || user.email || '',
              domain: user.email?.split('@')[1],
              provider: provider,
              providerId: user.app_metadata?.provider_id || user.id
            };

            await provisionSSOUser(ssoUser);
          }

          // Check if user is admin and redirect accordingly
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('user_id', user.id)
            .single();

          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          
          setTimeout(() => {
            if (profile?.is_admin) {
              navigate('/admin/dashboard');
            } else {
              navigate('/dashboard');
            }
          }, 2000);
        } else {
          setStatus('error');
          setMessage('No user session found. Please try signing in again.');
        }
      } catch (error: any) {
        logger.error('Unexpected error in auth callback:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleAuthCallback();
  }, [navigate, provisionSSOUser]);

  const handleRetry = () => {
    navigate('/auth');
  };

  const getIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
      default:
        return <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'success':
        return 'Authentication Successful';
      case 'error':
        return 'Authentication Failed';
      default:
        return 'Completing Sign In...';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-background flex items-center justify-center border">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">{getTitle()}</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        
        {status === 'error' && (
          <CardContent className="space-y-4">
            <Button onClick={handleRetry} className="w-full">
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              Go Home
            </Button>
          </CardContent>
        )}

        {status === 'loading' && (
          <CardContent>
            <div className="text-center text-sm text-muted-foreground">
              Please wait while we complete your authentication...
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}