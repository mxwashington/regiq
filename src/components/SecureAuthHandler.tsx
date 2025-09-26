import React, { useState } from 'react';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Clock, User, Lock } from 'lucide-react';

import { logger } from '@/lib/logger';
interface SecureAuthHandlerProps {
  mode: 'signin' | 'signup';
  onSuccess?: () => void;
}

export const SecureAuthHandler: React.FC<SecureAuthHandlerProps> = ({ mode, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState<{
    isLocked: boolean;  
    retryAfter: number;
    failedAttempts: number;
  } | null>(null);

  const { checkAccountLockout, logSecurityEvent } = useEnhancedSecurity();
  const { toast } = useToast();

  const handleAuthAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please enter both email and password",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Check for account lockout before attempting auth
      const lockout = await checkAccountLockout(email);
      if (lockout.isLocked) {
        setLockoutInfo(lockout);
        toast({
          title: "Account Temporarily Locked",
          description: `Too many failed attempts. Try again in ${Math.ceil(lockout.retryAfter / 60)} minutes.`,
          variant: "destructive"
        });
        return;
      }

      // Rate limit check
      const { data: rateLimitCheck } = await supabase.rpc('check_enhanced_rate_limit', {
        endpoint_param: 'auth_attempt',
        user_rate_limit: 5,
        ip_rate_limit: 10
      });

      const rateLimitResult = rateLimitCheck as { allowed: boolean } | null;
      if (!rateLimitResult?.allowed) {
        await logSecurityEvent('rate_limit_exceeded', {
          endpoint: 'auth_attempt',
          email: email
        }, 'medium');
        
        toast({
          title: "Rate Limit Exceeded",
          description: "Too many authentication attempts. Please wait before trying again.",
          variant: "destructive"
        });
        return;
      }

      let result;
      
      if (mode === 'signin') {
        result = await supabase.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password
        });
      } else {
        result = await supabase.auth.signUp({
          email: email.toLowerCase().trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim()
            },
            emailRedirectTo: `${window.location.origin}/`
          }
        });
      }

      if (result.error) {
        // Log failed authentication attempt
        await logSecurityEvent('failed_login', {
          email: email,
          reason: result.error.message,
          attempt_type: mode
        }, 'medium');

        // Check if this was due to invalid credentials
        if (result.error.message.includes('Invalid login credentials')) {
          const updatedLockout = await checkAccountLockout(email);
          if (updatedLockout.failedAttempts >= 3) {
            toast({
              title: "Warning",
              description: `${5 - updatedLockout.failedAttempts} attempts remaining before account lockout`,
              variant: "destructive"
            });
          }
        }

        throw result.error;
      }

      // Log successful authentication
      await logSecurityEvent('successful_login', {
        email: email,
        method: mode === 'signin' ? 'password' : 'signup'
      }, 'low');

      if (mode === 'signup') {
        toast({
          title: "Account Created",
          description: "Please check your email to verify your account",
          variant: "default"
        });
      } else {
        toast({
          title: "Welcome Back",
          description: "Successfully signed in",
          variant: "default"
        });
      }

      onSuccess?.();

    } catch (error: any) {
      logger.error('Authentication error:', error);
      toast({
        title: "Authentication Failed",
        description: error.message || "An error occurred during authentication",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address first",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`
      });

      if (error) throw error;

      await logSecurityEvent('password_reset_requested', {
        email: email
      }, 'low');

      toast({
        title: "Reset Link Sent",
        description: "Check your email for password reset instructions",
        variant: "default"
      });
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl text-center">
          {mode === 'signin' ? 'Sign In' : 'Create Account'}
        </CardTitle>
        <CardDescription className="text-center">
          {mode === 'signin' 
            ? 'Enter your credentials to access your account' 
            : 'Create a new account to get started'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {lockoutInfo?.isLocked && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Account temporarily locked due to multiple failed attempts. 
              Try again in {Math.ceil(lockoutInfo.retryAfter / 60)} minutes.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleAuthAttempt} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name
              </label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                maxLength={100}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Email
            </label>
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Password
            </label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || lockoutInfo?.isLocked}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </div>
            ) : (
              mode === 'signin' ? 'Sign In' : 'Create Account'
            )}
          </Button>

          {mode === 'signin' && (
            <Button 
              type="button" 
              variant="ghost" 
              className="w-full"
              onClick={handlePasswordReset}
              disabled={loading}
            >
              <Clock className="h-4 w-4 mr-2" />
              Reset Password
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
};