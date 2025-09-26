// KPI Cards Component
// Overview metrics and sparkline charts for the admin dashboard

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { formatNumber, formatTimeAgo, formatSource } from '@/lib/format';
import { useAdminFetch } from '@/hooks/useAdminFetch';

interface MetricsData {
  totalAlerts: number;
  last24hAlerts: number;
  sourcesHealth: Array<{
    source: string;
    lastSuccess: string | null;
    lastFailure: string | null;
    last24hInserts: number;
    last24hFailures: number;
    status: 'healthy' | 'unhealthy' | 'unknown';
  }>;
  sparklineData: Array<{
    date: string;
    alerts: number;
  }>;
  duplicatesCount: number;
  lastSyncTime: string | null;
}

export function KpiCards() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const { execute, loading } = useAdminFetch<MetricsData>();

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    const data = await execute('/api/admin/metrics');
    if (data) {
      setMetrics(data);
    }
  };

  if (loading || !metrics) {
    return <KpiCardsSkeleton />;
  }

  const healthySources = metrics.sourcesHealth.filter(s => s.status === 'healthy').length;
  const totalFailures = metrics.sourcesHealth.reduce((sum, s) => sum + s.last24hFailures, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Alerts */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatNumber(metrics.totalAlerts)}</div>
          <p className="text-xs text-muted-foreground">
            All sources combined
          </p>
          <div className="mt-3 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.sparklineData}>
                <Line
                  type="monotone"
                  dataKey="alerts"
                  stroke="#8884d8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Last 24 Hours */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatNumber(metrics.last24hAlerts)}
          </div>
          <p className="text-xs text-muted-foreground">
            New alerts ingested
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {metrics.sourcesHealth.map(source => (
              source.last24hInserts > 0 && (
                <Badge key={source.source} variant="outline" className="text-xs">
                  {source.source}: {source.last24hInserts}
                </Badge>
              )
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">System Health</CardTitle>
          {healthySources === 4 ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {healthySources}/4
          </div>
          <p className="text-xs text-muted-foreground">
            Sources healthy
          </p>
          <div className="mt-3 space-y-1">
            {metrics.sourcesHealth.map(source => {
              const sourceConfig = formatSource(source.source);
              return (
                <div key={source.source} className="flex items-center justify-between text-xs">
                  <span className={sourceConfig.color}>{source.source}</span>
                  {source.status === 'healthy' ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Last Sync & Issues */}
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {totalFailures === 0 ? (
              <span className="text-green-600">Clean</span>
            ) : (
              <span className="text-red-600">{totalFailures}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {totalFailures === 0 ? 'No failures' : 'Failures in 24h'}
          </p>
          <div className="mt-3">
            {metrics.lastSyncTime ? (
              <p className="text-xs text-muted-foreground">
                Last sync: {formatTimeAgo(metrics.lastSyncTime)}
              </p>
            ) : (
              <p className="text-xs text-red-500">No recent sync</p>
            )}
            {metrics.duplicatesCount > 0 && (
              <Badge variant="destructive" className="mt-1 text-xs">
                {metrics.duplicatesCount} duplicates
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-3"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}