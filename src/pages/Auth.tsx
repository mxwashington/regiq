import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { Loader2, Home, Shield, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { useNavigationHelper } from '@/components/NavigationHelper';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [formError, setFormError] = useState('');
  
  const { signInWithMagicLink, user } = useAuth();
  const navigate = useNavigate();
  const { navigateTo } = useNavigationHelper();

  useEffect(() => {
    if (user) {
      navigateTo('/dashboard');
    }

    // Handle URL parameters for auth redirects
    const urlParams = new URLSearchParams(window.location.search);
    const authType = urlParams.get('type');
    
    if (authType === 'magiclink') {
      setMagicLinkSent(false);
    }
  }, [user, navigate, navigateTo]);

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
    
    const emailError = validateEmail(email);
    if (emailError) {
      setFormError(emailError);
      return;
    }
    
    setFormError('');
    setLoading(true);
    
    const { error } = await signInWithMagicLink(email);
    if (error) {
      setFormError(error.message || 'Failed to send magic link');
    } else {
      setMagicLinkSent(true);
    }
    setLoading(false);
  };

  const isAdminEmail = email === 'marcus@fsqahelp.org';

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
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Sending Link...' : 'Send Magic Link'}
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
                    ✓ Link expires automatically for security
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