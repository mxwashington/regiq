import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Activity, CheckCircle, XCircle } from 'lucide-react';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metadata: Record<string, any>;
  is_resolved: boolean;
  created_at: string;
}

const SecurityDashboard: React.FC = () => {
  const { isAdmin } = useAdminAuth();
  const { 
    securityAlerts, 
    loading, 
    fetchSecurityAlerts, 
    resolveAlert,
    logAdminAction 
  } = useEnhancedSecurity();

  useEffect(() => {
    if (isAdmin) {
      fetchSecurityAlerts();
    }
  }, [isAdmin, fetchSecurityAlerts]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <XCircle className="h-4 w-4" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4" />;
      case 'low':
        return <Activity className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const handleResolveAlert = async (alertId: string, alertType: string) => {
    await Promise.all([
      resolveAlert(alertId),
      logAdminAction('resolve_security_alert', 'security_alert', alertId, {
        alert_type: alertType
      })
    ]);
  };

  if (!isAdmin) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Access denied. Admin privileges required to view security dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  const unresolvedAlerts = securityAlerts.filter(alert => !alert.is_resolved);
  const criticalAlerts = unresolvedAlerts.filter(alert => alert.severity === 'critical');
  const highAlerts = unresolvedAlerts.filter(alert => alert.severity === 'high');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Security Dashboard</h1>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unresolvedAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Unresolved security alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Require immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{highAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Need attention soon
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Security Alerts</CardTitle>
          <CardDescription>
            Monitor and respond to security incidents and threats
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : unresolvedAlerts.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p>No active security alerts</p>
                <p className="text-sm">Your system appears secure</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {unresolvedAlerts.slice(0, 10).map((alert) => (
                <div 
                  key={alert.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{alert.title}</h3>
                        <Badge variant={getSeverityColor(alert.severity) as any}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {alert.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Type: {alert.alert_type}</span>
                        <span>
                          {new Date(alert.created_at).toLocaleString()}
                        </span>
                      </div>
                      {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            View Details
                          </summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                            {JSON.stringify(alert.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveAlert(alert.id, alert.alert_type)}
                  >
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Security Actions</CardTitle>
          <CardDescription>
            Quick actions for security management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={fetchSecurityAlerts}
              disabled={loading}
            >
              Refresh Alerts
            </Button>
            <Button 
              variant="outline"
              onClick={() => logAdminAction('manual_security_review', 'system', 'dashboard')}
            >
              Log Security Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;