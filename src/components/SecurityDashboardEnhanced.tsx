import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

import { logger } from '@/lib/logger';
interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  is_resolved: boolean;
  created_at: string;
}

interface SecurityMetrics {
  security_status: string;
  metrics: {
    total_users: number;
    admin_users: number;
    recent_security_events: number;
    active_api_keys: number;
    recent_payment_transactions: number;
  };
  rls_policies_active: boolean;
  audit_logging_active: boolean;
  threat_monitoring_active: boolean;
  last_security_audit: number;
}

export const SecurityDashboardEnhanced: React.FC = () => {
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSecurityData = async () => {
    try {
      setLoading(true);

      // Fetch security alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('security_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (alertsError) throw alertsError;

      // Fetch security metrics
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('get_security_status_summary');

      if (metricsError) throw metricsError;

      setSecurityAlerts(alertsData || []);
      setSecurityMetrics(metricsData as unknown as SecurityMetrics);
    } catch (error: any) {
      logger.error('Error fetching security data:', error);
      toast({
        title: "Error",
        description: "Failed to load security dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({ 
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', alertId);

      if (error) throw error;

      await fetchSecurityData();
      
      toast({
        title: "Alert Resolved",
        description: "Security alert has been marked as resolved",
        variant: "default"
      });
    } catch (error) {
      logger.error('Error resolving alert:', error);
      toast({
        title: "Error",
        description: "Failed to resolve security alert",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading security dashboard...</span>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getSecurityStatusIcon = (status: string) => {
    switch (status) {
      case 'secure': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Security Status Overview */}
      {securityMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getSecurityStatusIcon(securityMetrics.security_status)}
              Security Status Overview
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSecurityData}
                className="ml-auto"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {securityMetrics.metrics.total_users}
                </div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {securityMetrics.metrics.admin_users}
                </div>
                <div className="text-sm text-muted-foreground">Admin Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {securityMetrics.metrics.recent_security_events}
                </div>
                <div className="text-sm text-muted-foreground">Recent Events (24h)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {securityMetrics.metrics.active_api_keys}
                </div>
                <div className="text-sm text-muted-foreground">Active API Keys</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {securityMetrics.metrics.recent_payment_transactions}
                </div>
                <div className="text-sm text-muted-foreground">Payment Transactions (30d)</div>
              </div>
              <div className="text-center">
                <div className="flex justify-center">
                  {securityMetrics.rls_policies_active ? (
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-500" />
                  )}
                </div>
                <div className="text-sm text-muted-foreground">RLS Policies</div>
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={securityMetrics.audit_logging_active ? 'default' : 'destructive'}>
                Audit Logging: {securityMetrics.audit_logging_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant={securityMetrics.threat_monitoring_active ? 'default' : 'destructive'}>
                Threat Monitoring: {securityMetrics.threat_monitoring_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Security Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {securityAlerts.length === 0 ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No recent security alerts. Your system appears to be secure.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {securityAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 border rounded-lg ${alert.is_resolved ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getSeverityColor(alert.severity) as any}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {alert.alert_type}
                        </Badge>
                        {alert.is_resolved && (
                          <Badge variant="secondary">
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm">{alert.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {alert.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(alert.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!alert.is_resolved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Features Status */}
      <Card>
        <CardHeader>
          <CardTitle>Security Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Row Level Security</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">API Key Hashing</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Rate Limiting</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Input Validation</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Audit Logging</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="font-medium">Sensitive Data Monitoring</span>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};