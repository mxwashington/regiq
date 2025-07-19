
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigationHelper } from '@/components/NavigationHelper';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');
  const { user } = useAuth();
  const { navigateTo } = useNavigationHelper();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the hash parameters from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // Also check search params as fallback
        const searchAccessToken = searchParams.get('access_token');
        const searchRefreshToken = searchParams.get('refresh_token');
        const searchType = searchParams.get('type');

        const finalAccessToken = accessToken || searchAccessToken;
        const finalRefreshToken = refreshToken || searchRefreshToken;
        const finalType = type || searchType;

        console.log('Auth callback params:', {
          type: finalType,
          hasAccessToken: !!finalAccessToken,
          hasRefreshToken: !!finalRefreshToken,
          hash: window.location.hash,
          search: window.location.search
        });

        if (finalType === 'magiclink' && finalAccessToken && finalRefreshToken) {
          // Set the session with the tokens from the magic link
          const { data, error } = await supabase.auth.setSession({
            access_token: finalAccessToken,
            refresh_token: finalRefreshToken,
          });

          if (error) {
            console.error('Error setting session:', error);
            setStatus('error');
            setMessage(`Authentication failed: ${error.message}`);
            return;
          }

          if (data.user) {
            console.log('Successfully authenticated user:', data.user.email);
            setStatus('success');
            setMessage('Successfully authenticated! Redirecting...');
            
            // Wait a moment to show success message, then redirect
            setTimeout(() => {
              navigateTo('/dashboard');
            }, 2000);
          } else {
            setStatus('error');
            setMessage('Authentication failed: No user data received');
          }
        } else if (finalType === 'recovery') {
          // Handle password recovery
          setStatus('success');
          setMessage('Password recovery link verified. You can now reset your password.');
          setTimeout(() => {
            navigateTo('/auth?mode=reset');
          }, 2000);
        } else {
          // Check if user is already authenticated
          if (user) {
            setStatus('success');
            setMessage('Already authenticated! Redirecting...');
            setTimeout(() => {
              navigateTo('/dashboard');
            }, 1000);
          } else {
            setStatus('error');
            setMessage('Invalid authentication link or link has expired.');
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred during authentication.');
      }
    };

    handleAuthCallback();
  }, [searchParams, user, navigateTo]);

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'text-primary';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {getIcon()}
          </div>
          <CardTitle className={`text-xl font-bold ${getStatusColor()}`}>
            {status === 'loading' && 'Authenticating...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authentication Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">{message}</p>
          {status === 'error' && (
            <button
              onClick={() => navigateTo('/auth')}
              className="text-primary hover:underline"
            >
              Return to sign in
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
