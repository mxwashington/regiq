import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Bell,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useEmergencyAlerts } from '@/hooks/useEmergencyAlerts';
import { useAuth } from '@/contexts/AuthContext';

export const EmergencyAlertsDashboard: React.FC = () => {
  const { user, isHealthy } = useAuth();
  const { alerts, loading, error, totalCount, retryCount, retryLoad } = useEmergencyAlerts(50);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSystemStatusIcon = () => {
    if (!isHealthy) {
      return <XCircle className="h-5 w-5 text-red-600" />;
    }
    if (error) {
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  };

  const getSystemStatusText = () => {
    if (!isHealthy) {
      return 'System Offline';
    }
    if (error) {
      return 'Limited Functionality';
    }
    return 'System Operational';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Emergency Header */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <div>
              <h1 className="text-lg font-semibold text-red-800">RegIQ Emergency Mode</h1>
              <p className="text-sm text-red-700">
                System recovery in progress - limited functionality available
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getSystemStatusIcon()}
            <span className="text-sm font-medium">{getSystemStatusText()}</span>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {user ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Active</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm">Offline</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alerts Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span className="text-lg font-semibold">{totalCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Recovery Mode</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Retry Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-4 w-4" />
              <span className="text-lg font-semibold">{retryCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={retryLoad}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading emergency alerts...</p>
        </div>
      )}

      {/* Alerts List */}
      {!loading && alerts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Regulatory Alerts</h2>
            <Button variant="outline" size="sm" onClick={retryLoad}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <Badge className={getUrgencyColor(alert.urgency)}>
                          {alert.urgency}
                        </Badge>
                        <Badge variant="outline">
                          {alert.agency}
                        </Badge>
                        <Badge variant="secondary">
                          {alert.source}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg leading-tight">
                        {alert.title}
                      </CardTitle>
                    </div>
                    {alert.external_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a
                          href={alert.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3">
                    {alert.summary}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Published: {new Date(alert.published_date).toLocaleDateString()}
                    </span>
                    {alert.urgency_score && (
                      <span>
                        Score: {alert.urgency_score}/100
                      </span>
                    )}
                  </div>
                  {user && alert.ai_summary && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <p className="text-sm text-blue-800">
                        <strong>AI Summary:</strong> {alert.ai_summary}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Alerts State */}
      {!loading && alerts.length === 0 && !error && (
        <Card>
          <CardContent className="text-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No alerts available</h3>
            <p className="text-muted-foreground mb-4">
              System is in emergency mode. Alert data may be temporarily unavailable.
            </p>
            <Button onClick={retryLoad}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};