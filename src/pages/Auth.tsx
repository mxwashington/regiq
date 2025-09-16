
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Home, Shield, CheckCircle, AlertCircle, Mail, Clock } from 'lucide-react';
import { useNavigationHelper } from '@/components/NavigationHelper';
import { useRateLimitHandler } from '@/hooks/useRateLimitHandler';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [formError, setFormError] = useState('');
  const [searchParams] = useSearchParams();
  
  const { signInWithMagicLink, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { navigateTo } = useNavigationHelper();
  const { rateLimitState, handleRateLimit, resetRateLimit } = useRateLimitHandler();

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      if (user && !authLoading) {
        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.is_admin) {
          navigateTo('/admin/dashboard');
        } else {
          navigateTo('/dashboard');
        }
      }
    };
    
    checkUserAndRedirect();

    // Handle URL parameters for auth redirects
    const authType = searchParams.get('type');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      setFormError(errorDescription || error);
    }
    
    if (authType === 'magiclink') {
      setMagicLinkSent(false);
    }
  }, [user, authLoading, navigate, navigateTo, searchParams]);

  const validateEmail = (email: string) => {
    if (!email) {
      return 'Email is required';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address';
    }
    return '';
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rateLimitState.isRateLimited) {
      return;
    }
    
    const emailError = validateEmail(email);
    if (emailError) {
      setFormError(emailError);
      return;
    }
    
    setFormError('');
    setLoading(true);
    
    const { error } = await signInWithMagicLink(email);
    
    if (error) {
      const wasRateLimited = handleRateLimit(error);
      if (!wasRateLimited) {
        setFormError(error.message || 'Failed to send magic link');
      }
    } else {
      setMagicLinkSent(true);
      resetRateLimit();
    }
    
    setLoading(false);
  };

  const isAdminEmail = email === 'marcus@regiq.org';

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigateTo('/')}
            className="self-start"
          >
            <Home className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
              <CardDescription>
                We've sent a magic link to {email}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Click the link in your email to sign in to RegIQ{isAdminEmail ? ' Admin' : ''}
              </p>
              {isAdminEmail && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    Admin access will be granted automatically
                  </AlertDescription>
                </Alert>
              )}
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• The link will redirect you to regiq.org</p>
                <p>• Link expires after 1 hour for security</p>
                <p>• Check your spam folder if you don't see it</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setMagicLinkSent(false)}
                className="w-full"
              >
                Send Another Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => navigateTo('/')}
          className="self-start"
        >
          <Home className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to RegIQ</CardTitle>
            <CardDescription>
              Enter your email to receive a secure sign-in link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) setFormError('');
                  }}
                  className={formError ? 'border-red-500' : ''}
                  required
                />
                {formError && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {formError}
                  </p>
                )}
              </div>
              
              {rateLimitState.isRateLimited && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700">
                    Rate limit exceeded. Please wait {rateLimitState.retryAfter} seconds before trying again.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || rateLimitState.isRateLimited}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {rateLimitState.isRateLimited 
                  ? `Wait ${rateLimitState.retryAfter}s` 
                  : loading 
                    ? 'Sending Link...' 
                    : 'Send Magic Link'
                }
              </Button>
            </form>
            
            <div className="mt-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  No passwords required! We'll send you a secure link to sign in.
                </p>
              </div>
              
              {isAdminEmail && (
                <Alert className="bg-blue-50 border-blue-200">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    This email has administrative privileges
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="border-t pt-4">
                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground">
                    ✓ Secure passwordless authentication
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ✓ Works for both new and existing accounts
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ✓ Redirects to regiq.org automatically
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
