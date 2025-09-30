import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';

interface SystemStatusProps {
  className?: string;
}

interface StatusMetric {
  name: string;
  status: 'operational' | 'slow' | 'issues';
  responseTime?: string;
  lastCheck?: string;
}

export function SystemStatus({ className }: SystemStatusProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [metrics, setMetrics] = useState<StatusMetric[]>([
    { name: 'Alert Data Feed', status: 'operational', responseTime: '< 1s', lastCheck: '30s ago' },
    { name: 'Search & Filters', status: 'operational', responseTime: '< 0.5s', lastCheck: '30s ago' },
    { name: 'AI Enhancement', status: 'operational', responseTime: '< 3s', lastCheck: '1m ago' },
    { name: 'User Authentication', status: 'operational', responseTime: '< 0.2s', lastCheck: '30s ago' }
  ]);

  const getOverallStatus = (): 'operational' | 'slow' | 'issues' => {
    if (metrics.some(m => m.status === 'issues')) return 'issues';
    if (metrics.some(m => m.status === 'slow')) return 'slow';
    return 'operational';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'slow':
        return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'issues':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'slow':
        return 'bg-yellow-500';
      case 'issues':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return 'All systems operational';
      case 'slow':
        return 'Slower than usual';
      case 'issues':
        return 'Service issues detected';
      default:
        return 'Status unknown';
    }
  };

  const overallStatus = getOverallStatus();

  // Simulate periodic status checks
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => ({
        ...metric,
        lastCheck: Math.random() > 0.5 ? '30s ago' : '1m ago'
      })));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 h-8 px-2 ${className || ''}`}
        aria-label={`System status: ${getStatusText(overallStatus)}`}
      >
        <div className={`h-2 w-2 rounded-full ${getStatusColor(overallStatus)}`} />
        <span className="text-xs text-muted-foreground hidden sm:block">
          {getStatusText(overallStatus)}
        </span>
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              System Status
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Overall Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  {getStatusIcon(overallStatus)}
                  {getStatusText(overallStatus)}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </CardContent>
            </Card>

            {/* Individual Metrics */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Service Components</h3>
              {metrics.map((metric, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-background"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(metric.status)}
                    <div>
                      <div className="text-sm font-medium">{metric.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Response: {metric.responseTime}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={metric.status === 'operational' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {metric.status}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {metric.lastCheck}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground mb-2">
                  Having issues?
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href="/help" target="_blank">Get Help</a>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => window.location.reload()}>
                    <Zap className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}