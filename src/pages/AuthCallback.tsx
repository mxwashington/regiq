
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, Home, RefreshCw } from 'lucide-react';
import { useNavigationHelper } from '@/components/NavigationHelper';

interface AuthCallbackState {
  status: 'loading' | 'success' | 'error';
  message: string;
  debugInfo: any;
  retryCount: number;
}

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<AuthCallbackState>({
    status: 'loading',
    message: 'Processing authentication...',
    debugInfo: {},
    retryCount: 0
  });
  const { user } = useAuth();
  const { navigateTo } = useNavigationHelper();
  const navigate = useNavigate();

  const handleAuthCallback = async (retryAttempt = 0) => {
    try {
      console.log('=== AUTH CALLBACK DEBUG START ===', { retryAttempt });
      
      const fullUrl = window.location.href;
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const searchParamsObj = Object.fromEntries(searchParams.entries());
      const hashParamsObj = Object.fromEntries(hashParams.entries());
      
      const debugData = {
        timestamp: new Date().toISOString(),
        retryAttempt,
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
      setState(prev => ({ ...prev, debugInfo: debugData }));

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

      if (error) {
        console.error('Auth Error Details:', { error, errorDescription, errorCode });
        setState(prev => ({
          ...prev,
          status: 'error',
          message: `Authentication failed: ${errorDescription || error}`
        }));
        return;
      }

      if (type === 'magiclink' && accessToken && refreshToken) {
        console.log('Processing magic link authentication...');
        
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
          setState(prev => ({
            ...prev,
            status: 'error',
            message: `Session setup failed: ${sessionError.message}`
          }));
          return;
        }

        if (data.user) {
          console.log('Successfully authenticated user:', {
            id: data.user.id,
            email: data.user.email,
            emailConfirmed: data.user.email_confirmed_at,
            lastSignIn: data.user.last_sign_in_at
          });
          
          setState(prev => ({
            ...prev,
            status: 'success',
            message: 'Successfully authenticated! Redirecting...'
          }));
          
          setTimeout(() => {
            console.log('Redirecting to dashboard...');
            navigateTo('/dashboard');
          }, 2000);
        } else {
          console.error('No user data received from setSession');
          setState(prev => ({
            ...prev,
            status: 'error',
            message: 'Authentication failed: No user data received'
          }));
        }
      } else if (type === 'recovery' && accessToken && refreshToken) {
        console.log('Processing password recovery...');
        
        // Set the session for password recovery
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('Recovery Session Error:', sessionError);
          setState(prev => ({
            ...prev,
            status: 'error',
            message: `Recovery session setup failed: ${sessionError.message}`
          }));
          return;
        }

        console.log('Recovery session established successfully');
        setState(prev => ({
          ...prev,
          status: 'success',
          message: 'Password recovery link verified. Redirecting to reset form...'
        }));
        
        setTimeout(() => {
          navigate('/auth/reset-password');
        }, 2000);
      } else {
        if (user) {
          console.log('User already authenticated:', {
            id: user.id,
            email: user.email
          });
          setState(prev => ({
            ...prev,
            status: 'success',
            message: 'Already authenticated! Redirecting...'
          }));
          setTimeout(() => {
            navigateTo('/dashboard');
          }, 1000);
        } else {
          console.error('Invalid authentication parameters:', {
            type,
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken
          });
          setState(prev => ({
            ...prev,
            status: 'error',
            message: 'Invalid authentication link or link has expired.'
          }));
        }
      }
    } catch (error) {
      console.error('=== AUTH CALLBACK ERROR ===');
      console.error('Error details:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      
      setState(prev => ({
        ...prev,
        status: 'error',
        message: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    } finally {
      console.log('=== AUTH CALLBACK DEBUG END ===');
    }
  };

  const handleRetry = () => {
    setState(prev => ({ 
      ...prev, 
      status: 'loading', 
      message: 'Retrying authentication...',
      retryCount: prev.retryCount + 1
    }));
    handleAuthCallback(state.retryCount + 1);
  };

  const handleGoHome = () => {
    console.log('Navigating to home from auth callback');
    navigate('/');
  };

  useEffect(() => {
    handleAuthCallback();
  }, [searchParams, user, navigateTo]);

  const getIcon = () => {
    switch (state.status) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (state.status) {
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
            {state.status === 'loading' && 'Authenticating...'}
            {state.status === 'success' && 'Success!'}
            {state.status === 'error' && 'Authentication Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{state.message}</p>
          
          {state.status === 'error' && (
            <div className="space-y-3">
              <div className="flex gap-2">
                {state.retryCount < 3 && (
                  <Button onClick={handleRetry} className="flex-1">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again ({3 - state.retryCount} left)
                  </Button>
                )}
                <Button onClick={handleGoHome} variant="outline" className="flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
              </div>
              
              <button
                onClick={() => navigateTo('/auth')}
                className="text-primary hover:underline text-sm"
              >
                Return to sign in
              </button>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="text-left text-xs bg-gray-100 p-2 rounded mt-4">
                  <summary className="cursor-pointer font-medium">
                    Debug Information (Attempt {state.retryCount + 1})
                  </summary>
                  <pre className="mt-2 overflow-auto max-h-40">
                    {JSON.stringify(state.debugInfo, null, 2)}
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
