import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SecurityPosture {
  security_score: number;
  posture: 'EXCELLENT' | 'GOOD' | 'ADEQUATE' | 'NEEDS_IMPROVEMENT';
  rls_coverage_percent: number;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  assessed_at: string;
}

interface SecurityDashboard {
  security_status: 'SECURE' | 'HIGH_RISK' | 'CRITICAL';
  metrics: {
    critical_alerts: number;
    failed_logins_24h: number;
    admin_actions_24h: number;
    api_key_usage_24h: number;
  };
  recommendations: string[];
  generated_at: string;
}

export const EnhancedSecurityMonitor: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [securityPosture, setSecurityPosture] = useState<SecurityPosture | null>(null);
  const [securityDashboard, setSecurityDashboard] = useState<SecurityDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch security posture
      const { data: postureData, error: postureError } = await supabase.rpc(
        'get_current_security_posture'
      );
      
      if (postureError) {
        console.error('Error fetching security posture:', postureError);
      } else {
        setSecurityPosture(postureData as unknown as SecurityPosture);
      }

      // Try to fetch enhanced security dashboard (admin only)
      const { data: dashboardData, error: dashboardError } = await supabase.rpc(
        'get_security_dashboard_enhanced'
      );
      
      if (dashboardError) {
        // If user is not admin, show basic security info
        console.log('Enhanced dashboard not available:', dashboardError.message);
      } else {
        setSecurityDashboard(dashboardData as unknown as SecurityDashboard);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: "Security Check Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [user]);

  const getPostureBadgeVariant = (posture: string) => {
    switch (posture) {
      case 'EXCELLENT': return 'default';
      case 'GOOD': return 'secondary';
      case 'ADEQUATE': return 'outline';
      case 'NEEDS_IMPROVEMENT': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXCELLENT':
      case 'SECURE':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'HIGH_RISK':
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'CRITICAL':
      case 'NEEDS_IMPROVEMENT':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Shield className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Checking security status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load security data: {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={fetchSecurityData} 
            variant="outline" 
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Posture Card */}
      {securityPosture && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Posture
              <Badge variant={getPostureBadgeVariant(securityPosture.posture)}>
                {securityPosture.posture}
              </Badge>
            </CardTitle>
            <CardDescription>
              Overall security assessment for your RegIQ instance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {securityPosture.security_score}
                </div>
                <div className="text-sm text-muted-foreground">
                  Security Score
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {securityPosture.rls_coverage_percent}%
                </div>
                <div className="text-sm text-muted-foreground">
                  RLS Coverage
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {securityPosture.issues.length}
                </div>
                <div className="text-sm text-muted-foreground">
                  Active Issues
                </div>
              </div>
            </div>

            {securityPosture.issues.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Security Issues:</h4>
                <div className="space-y-2">
                  {securityPosture.issues.map((issue, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {getStatusIcon(issue.severity)}
                      <Badge variant={issue.severity === 'critical' ? 'destructive' : 'outline'}>
                        {issue.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Security Dashboard (Admin Only) */}
      {securityDashboard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(securityDashboard.security_status)}
              Security Dashboard
              <Badge variant={
                securityDashboard.security_status === 'SECURE' ? 'default' :
                securityDashboard.security_status === 'HIGH_RISK' ? 'outline' : 'destructive'
              }>
                {securityDashboard.security_status}
              </Badge>
            </CardTitle>
            <CardDescription>
              Real-time security monitoring and threat detection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">
                  {securityDashboard.metrics.critical_alerts}
                </div>
                <div className="text-sm text-muted-foreground">
                  Critical Alerts
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-warning">
                  {securityDashboard.metrics.failed_logins_24h}
                </div>
                <div className="text-sm text-muted-foreground">
                  Failed Logins (24h)
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {securityDashboard.metrics.admin_actions_24h}
                </div>
                <div className="text-sm text-muted-foreground">
                  Admin Actions (24h)
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {securityDashboard.metrics.api_key_usage_24h}
                </div>
                <div className="text-sm text-muted-foreground">
                  API Usage (24h)
                </div>
              </div>
            </div>

            {securityDashboard.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Recommendations:</h4>
                <ul className="space-y-1">
                  {securityDashboard.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <Button onClick={fetchSecurityData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Security Status
        </Button>
        <div className="text-xs text-muted-foreground">
          Last updated: {securityPosture ? new Date(securityPosture.assessed_at).toLocaleString() : 'Never'}
        </div>
      </div>
    </div>
  );
};