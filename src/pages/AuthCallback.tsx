
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
  const [debugInfo, setDebugInfo] = useState<any>({});
  const { user } = useAuth();
  const { navigateTo } = useNavigationHelper();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('=== AUTH CALLBACK DEBUG START ===');
        
        // Enhanced URL parameter logging
        const fullUrl = window.location.href;
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParamsObj = Object.fromEntries(searchParams.entries());
        const hashParamsObj = Object.fromEntries(hashParams.entries());
        
        const debugData = {
          timestamp: new Date().toISOString(),
          fullUrl,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          searchParams: searchParamsObj,
          hashParams: hashParamsObj,
          userAgent: navigator.userAgent,
          referrer: document.referrer
        };
        
        console.log('URL Debug Info:', debugData);
        setDebugInfo(debugData);

        // Extract parameters with enhanced logging
        const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
        const type = hashParams.get('type') || searchParams.get('type');
        const error = hashParams.get('error') || searchParams.get('error');
        const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
        const errorCode = hashParams.get('error_code') || searchParams.get('error_code');

        const tokenInfo = {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type,
          error,
          errorDescription,
          errorCode,
          accessTokenLength: accessToken?.length || 0,
          refreshTokenLength: refreshToken?.length || 0
        };

        console.log('Token Info:', tokenInfo);

        // Check for errors first
        if (error) {
          console.error('Auth Error Details:', { error, errorDescription, errorCode });
          setStatus('error');
          setMessage(`Authentication failed: ${errorDescription || error}`);
          return;
        }

        // Enhanced session handling
        if (type === 'magiclink' && accessToken && refreshToken) {
          console.log('Processing magic link authentication...');
          
          try {
            // Log current session state before setting
            const { data: currentSession } = await supabase.auth.getSession();
            console.log('Current session before setSession:', {
              hasSession: !!currentSession.session,
              userId: currentSession.session?.user?.id,
              expires: currentSession.session?.expires_at
            });

            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            console.log('setSession result:', {
              hasData: !!data,
              hasUser: !!data.user,
              hasSession: !!data.session,
              userId: data.user?.id,
              userEmail: data.user?.email,
              sessionExpiresAt: data.session?.expires_at,
              error: sessionError
            });

            if (sessionError) {
              console.error('Session Error Details:', sessionError);
              setStatus('error');
              setMessage(`Session setup failed: ${sessionError.message}`);
              return;
            }

            if (data.user) {
              console.log('Successfully authenticated user:', {
                id: data.user.id,
                email: data.user.email,
                emailConfirmed: data.user.email_confirmed_at,
                lastSignIn: data.user.last_sign_in_at,
                userMetadata: data.user.user_metadata
              });
              
              setStatus('success');
              setMessage('Successfully authenticated! Redirecting...');
              
              // Wait a moment to show success message, then redirect
              setTimeout(() => {
                console.log('Redirecting to dashboard...');
                navigateTo('/dashboard');
              }, 2000);
            } else {
              console.error('No user data received from setSession');
              setStatus('error');
              setMessage('Authentication failed: No user data received');
            }
          } catch (sessionSetupError) {
            console.error('Session setup error:', sessionSetupError);
            setStatus('error');
            setMessage(`Session setup error: ${sessionSetupError}`);
          }
        } else if (type === 'recovery') {
          console.log('Processing password recovery...');
          setStatus('success');
          setMessage('Password recovery link verified. You can now reset your password.');
          setTimeout(() => {
            navigateTo('/auth?mode=reset');
          }, 2000);
        } else {
          // Check if user is already authenticated
          if (user) {
            console.log('User already authenticated:', {
              id: user.id,
              email: user.email
            });
            setStatus('success');
            setMessage('Already authenticated! Redirecting...');
            setTimeout(() => {
              navigateTo('/dashboard');
            }, 1000);
          } else {
            console.error('Invalid authentication parameters:', {
              type,
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken
            });
            setStatus('error');
            setMessage('Invalid authentication link or link has expired.');
          }
        }
      } catch (error) {
        console.error('=== AUTH CALLBACK ERROR ===');
        console.error('Error details:', error);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        
        setStatus('error');
        setMessage(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        console.log('=== AUTH CALLBACK DEBUG END ===');
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
            <div className="space-y-4">
              <button
                onClick={() => navigateTo('/auth')}
                className="text-primary hover:underline"
              >
                Return to sign in
              </button>
              
              {/* Debug info display in development */}
              {process.env.NODE_ENV === 'development' && (
                <details className="text-left text-xs bg-gray-100 p-2 rounded mt-4">
                  <summary className="cursor-pointer font-medium">Debug Information</summary>
                  <pre className="mt-2 overflow-auto max-h-40">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
