import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';
import { Loader2, Home, Shield, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigationHelper } from '@/components/NavigationHelper';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const { signIn, signUp, signInWithMagicLink, resetPassword, user } = useAuth();
  const navigate = useNavigate();
  const { navigateTo } = useNavigationHelper();

  useEffect(() => {
    if (user) {
      navigateTo('/dashboard');
    }
    
    // Check if user was previously remembered
    const rememberMeStored = localStorage.getItem('regiq_remember_me') === 'true';
    setRememberMe(rememberMeStored);
    
    // Auto-fill email if stored
    const storedEmail = localStorage.getItem('regiq_email');
    if (storedEmail) {
      setEmail(storedEmail);
    }

    // Handle URL parameters for auth redirects
    const urlParams = new URLSearchParams(window.location.search);
    const authType = urlParams.get('type');
    
    if (authType === 'recovery') {
      // Redirect to password reset component
      navigateTo('/reset-password');
      return;
    } else if (authType === 'magiclink') {
      setMagicLinkSent(false);
    }
  }, [user, navigate, navigateTo]);

  const validateForm = (type: 'signin' | 'signup' | 'magic' | 'reset') => {
    const errors: Record<string, string> = {};
    
    // Email validation
    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation for signin and signup
    if ((type === 'signin' || type === 'signup') && !password) {
      errors.password = 'Password is required';
    }
    
    if (type === 'signup') {
      if (!fullName.trim()) {
        errors.fullName = 'Full name is required';
      }
      if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters long';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm('signin')) return;
    
    setLoading(true);
    
    // Store email for remember me
    if (rememberMe) {
      localStorage.setItem('regiq_email', email);
    } else {
      localStorage.removeItem('regiq_email');
    }
    
    await signIn(email, password, rememberMe);
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm('signup')) return;
    
    setLoading(true);
    const { error } = await signUp(email, password, fullName, rememberMe);
    
    if (!error && rememberMe) {
      localStorage.setItem('regiq_email', email);
    }
    
    setLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm('magic')) return;
    
    setLoading(true);
    const { error } = await signInWithMagicLink(email);
    if (!error) {
      setMagicLinkSent(true);
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm('reset')) return;
    
    setLoading(true);
    const { error } = await resetPassword(email);
    if (!error) {
      setResetEmailSent(true);
    }
    setLoading(false);
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, text: '', color: '' };
    if (password.length < 6) return { strength: 1, text: 'Too short', color: 'text-red-500' };
    if (password.length < 8) return { strength: 2, text: 'Weak', color: 'text-orange-500' };
    if (password.length < 12) return { strength: 3, text: 'Good', color: 'text-yellow-500' };
    return { strength: 4, text: 'Strong', color: 'text-green-500' };
  };

  const isAdminEmail = email === 'marcus@fsqahelp.org';
  const passwordStrength = getPasswordStrength(password);

  if (resetEmailSent) {
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
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
              <CardDescription>
                We've sent a password reset link to {email}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Click the link in your email to reset your password. The link will expire in 24 hours.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setResetEmailSent(false)}
                className="w-full"
              >
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                Back to Sign In
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
            <CardTitle className="text-2xl font-bold">Welcome to RegIQ</CardTitle>
            <CardDescription>
              Access your regulatory intelligence dashboard
            </CardDescription>
          </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
              <TabsTrigger value="signin" className="text-xs md:text-sm">Sign In</TabsTrigger>
              <TabsTrigger value="signup" className="text-xs md:text-sm">Sign Up</TabsTrigger>
              <TabsTrigger value="magic" className="text-xs md:text-sm">Magic Link</TabsTrigger>
              <TabsTrigger value="reset" className="text-xs md:text-sm">Reset</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors.email) {
                        setFormErrors({...formErrors, email: ''});
                      }
                    }}
                    className={formErrors.email ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.email && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (formErrors.password) {
                          setFormErrors({...formErrors, password: ''});
                        }
                      }}
                      className={`pr-10 ${formErrors.password ? 'border-red-500' : ''}`}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {formErrors.password && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.password}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-signin"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label htmlFor="remember-signin" className="text-sm">
                    Remember me
                  </Label>
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
                
                <div className="text-center">
                  <Button 
                    type="button" 
                    variant="link" 
                    onClick={() => setActiveTab('reset')}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    Forgot your password?
                  </Button>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (formErrors.fullName) {
                        setFormErrors({...formErrors, fullName: ''});
                      }
                    }}
                    className={formErrors.fullName ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.fullName && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.fullName}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors.email) {
                        setFormErrors({...formErrors, email: ''});
                      }
                    }}
                    className={formErrors.email ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.email && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.email}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (formErrors.password) {
                          setFormErrors({...formErrors, password: ''});
                        }
                      }}
                      className={`pr-10 ${formErrors.password ? 'border-red-500' : ''}`}
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {password && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            passwordStrength.strength === 1 ? 'bg-red-500 w-1/4' :
                            passwordStrength.strength === 2 ? 'bg-orange-500 w-2/4' :
                            passwordStrength.strength === 3 ? 'bg-yellow-500 w-3/4' :
                            passwordStrength.strength === 4 ? 'bg-green-500 w-full' : 'w-0'
                          }`}
                        />
                      </div>
                      <span className={`text-xs ${passwordStrength.color}`}>
                        {passwordStrength.text}
                      </span>
                    </div>
                  )}
                  {formErrors.password && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.password}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-signup"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label htmlFor="remember-signup" className="text-sm">
                    Remember me
                  </Label>
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </p>
              </form>
            </TabsContent>
            
            <TabsContent value="magic">
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="magic-email">Email Address</Label>
                  <Input
                    id="magic-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors.email) {
                        setFormErrors({...formErrors, email: ''});
                      }
                    }}
                    className={formErrors.email ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.email && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.email}
                    </p>
                  )}
                </div>
                
                {isAdminEmail && (
                  <Alert className="bg-green-50 border-green-200">
                    <Shield className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700">
                      Admin access detected - you'll be granted admin privileges
                    </AlertDescription>
                  </Alert>
                )}
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Magic Link
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  We'll send you a secure link to sign in without a password
                </p>
              </form>
            </TabsContent>

            <TabsContent value="reset">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email Address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (formErrors.email) {
                        setFormErrors({...formErrors, email: ''});
                      }
                    }}
                    className={formErrors.email ? 'border-red-500' : ''}
                    required
                  />
                  {formErrors.email && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {formErrors.email}
                    </p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  We'll send you a link to reset your password. The link will expire in 24 hours.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}