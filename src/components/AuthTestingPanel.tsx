import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Mail, 
  Shield, 
  Key, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export default function AuthTestingPanel() {
  const { 
    user, 
    session, 
    subscribed, 
    subscriptionTier, 
    isAdmin, 
    adminRole, 
    adminPermissions,
    loading,
    refreshSubscription,
    checkAdminStatus 
  } = useAuth();
  
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const runAuthTests = () => {
    const results: Record<string, boolean> = {};
    
    // Test 1: Session persistence
    results.sessionPersistence = !!session && !!localStorage.getItem('sb-piyikxxgoekawboitrzz-auth-token');
    
    // Test 2: User data completeness
    results.userDataComplete = !!user && !!user.email && !!user.id;
    
    // Test 3: Remember me functionality
    results.rememberMeWorks = localStorage.getItem('regiq_remember_me') !== null;
    
    // Test 4: Auto-login check
    results.autoLoginReady = localStorage.getItem('regiq_email') !== null;
    
    // Test 5: Admin permissions (if admin)
    results.adminPermissions = !isAdmin || (isAdmin && adminPermissions.length > 0);
    
    // Test 6: Subscription status sync
    results.subscriptionSync = typeof subscribed === 'boolean';
    
    setTestResults(results);
  };

  const getAuthStatus = () => {
    if (loading) return { status: 'loading', color: 'yellow', icon: Clock };
    if (!user) return { status: 'unauthenticated', color: 'red', icon: XCircle };
    if (!session) return { status: 'session-expired', color: 'orange', icon: AlertTriangle };
    return { status: 'authenticated', color: 'green', icon: CheckCircle };
  };

  const authStatus = getAuthStatus();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication System Status
          </CardTitle>
          <CardDescription>
            Real-time monitoring of auth state, session persistence, and security features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auth Status */}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              <authStatus.icon className={`h-5 w-5 text-${authStatus.color}-500`} />
              <span className="font-medium">Authentication Status</span>
            </div>
            <Badge variant={authStatus.color === 'green' ? 'default' : 'destructive'}>
              {authStatus.status.replace('-', ' ').toUpperCase()}
            </Badge>
          </div>

          {/* User Information */}
          {user && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">User Details</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p><strong>ID:</strong> {user.id.substring(0, 8)}...</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Confirmed:</strong> {user.email_confirmed_at ? '✅' : '❌'}</p>
                  <p><strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="h-4 w-4" />
                  <span className="font-medium">Session Info</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p><strong>Active:</strong> {session ? '✅' : '❌'}</p>
                  <p><strong>Provider:</strong> {session?.user.app_metadata.provider || 'email'}</p>
                  <p><strong>Expires:</strong> {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'Never'}</p>
                  <p><strong>Auto-refresh:</strong> ✅</p>
                </div>
              </div>
            </div>
          )}

          {/* Subscription & Permissions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4" />
                <span className="font-medium">Subscription</span>
              </div>
              <div className="space-y-1 text-sm">
                <p><strong>Status:</strong> {subscribed ? '✅ Active' : '❌ Free'}</p>
                <p><strong>Tier:</strong> {subscriptionTier || 'Free'}</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={refreshSubscription}
                  className="mt-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4" />
                <span className="font-medium">Admin Access</span>
              </div>
              <div className="space-y-1 text-sm">
                <p><strong>Is Admin:</strong> {isAdmin ? '✅' : '❌'}</p>
                <p><strong>Role:</strong> {adminRole || 'User'}</p>
                <p><strong>Permissions:</strong> {adminPermissions.length}</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={checkAdminStatus}
                  className="mt-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Check
                </Button>
              </div>
            </div>
          </div>

          {/* Persistence Tests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Persistence & Security Tests</h4>
              <Button size="sm" onClick={runAuthTests}>
                Run Tests
              </Button>
            </div>
            
            {Object.keys(testResults).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(testResults).map(([test, passed]) => (
                  <div key={test} className="flex items-center gap-2 text-sm">
                    {passed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={passed ? 'text-green-700' : 'text-red-700'}>
                      {test.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Local Storage Info */}
          <div className="p-3 border rounded-lg bg-muted/50">
            <h4 className="font-medium mb-2">Local Storage Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <div>
                <strong>Auth Token:</strong> {localStorage.getItem('sb-piyikxxgoekawboitrzz-auth-token') ? '✅' : '❌'}
              </div>
              <div>
                <strong>Remember Me:</strong> {localStorage.getItem('regiq_remember_me') ? '✅' : '❌'}
              </div>
              <div>
                <strong>Saved Email:</strong> {localStorage.getItem('regiq_email') ? '✅' : '❌'}
              </div>
            </div>
          </div>

          {/* Email Configuration Status */}
          <Alert className={user?.email_confirmed_at ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              {user?.email_confirmed_at ? (
                <span className="text-green-700">
                  ✅ Email confirmed - Full auth functionality enabled
                </span>
              ) : (
                <span className="text-yellow-700">
                  ⚠️ Email auto-confirmation is enabled for testing - Production should require confirmation
                </span>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}