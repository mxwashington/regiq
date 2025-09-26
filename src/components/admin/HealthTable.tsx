// Health Table Component
// Real-time monitoring of data source health and sync status

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Activity,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
  Database,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { useHealthCheck, useAdminFetch } from '@/hooks/useAdminFetch';
import { formatTimeAgo, formatDuration, formatSource } from '@/lib/format';
import { generateCSV, downloadCSV, generateFilename, HEALTH_CSV_COLUMNS } from '@/lib/csv';

interface HealthMetric {
  name: string;
  source: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency: number;
  message: string;
  lastChecked: string;
  lastSuccess: string | null;
  lastFailure: string | null;
  successRate24h: number;
  totalChecks24h: number;
  failedChecks24h: number;
  avgLatency24h: number;
  endpoint?: string;
  responseSize?: number;
  metadata?: Record<string, any>;
}

interface HealthResponse {
  sources: HealthMetric[];
  lastUpdated: string;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
}

export function HealthTable() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const { runHealthCheck, loading: healthLoading } = useHealthCheck();
  const { execute, loading } = useAdminFetch<HealthResponse>();

  const loadHealthData = useCallback(async () => {
    const data = await execute('/api/admin/health');
    if (data) {
      setHealthData(data);
    }
  }, [execute]);

  const handleManualHealthCheck = async () => {
    const result = await runHealthCheck();
    if (result) {
      toast.success('Health check completed');
      await loadHealthData();
    }
  };

  const handleExportCSV = async () => {
    if (!healthData?.sources) {
      toast.error('No health data to export');
      return;
    }

    try {
      const csv = generateCSV(healthData.sources, HEALTH_CSV_COLUMNS);
      downloadCSV(csv, generateFilename('health_status'));
      toast.success(`Exported ${healthData.sources.length} health records to CSV`);
    } catch (error) {
      toast.error('Failed to export health data');
    }
  };

  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      setAutoRefresh(false);
      toast.info('Auto-refresh disabled');
    } else {
      const interval = setInterval(loadHealthData, 30000); // Refresh every 30 seconds
      setRefreshInterval(interval);
      setAutoRefresh(true);
      toast.info('Auto-refresh enabled (30s interval)');
    }
  };

  useEffect(() => {
    loadHealthData();

    // Cleanup interval on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [loadHealthData]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'unknown':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      case 'unknown':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 500) return 'text-green-600';
    if (latency < 2000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const overallStatusColor = healthData?.overallStatus === 'healthy'
    ? 'text-green-600'
    : healthData?.overallStatus === 'degraded'
    ? 'text-yellow-600'
    : 'text-red-600';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-3">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Health Monitoring</span>
          </CardTitle>
          {healthData && (
            <Badge className={`${overallStatusColor} capitalize`}>
              {healthData.overallStatus}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={toggleAutoRefresh}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? 'Auto' : 'Manual'}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleManualHealthCheck}
            disabled={healthLoading}
            className="flex items-center space-x-2"
          >
            <Zap className="h-4 w-4" />
            <span>Run Check</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || !healthData}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {healthData?.lastUpdated && (
          <div className="mb-4 text-sm text-muted-foreground">
            Last updated: {formatTimeAgo(healthData.lastUpdated)}
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead>Success Rate (24h)</TableHead>
                <TableHead>Last Success</TableHead>
                <TableHead>Last Failure</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || !healthData ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : healthData.sources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No health data available
                  </TableCell>
                </TableRow>
              ) : (
                healthData.sources.map(source => {
                  const sourceConfig = formatSource(source.source);
                  const successRate = source.totalChecks24h > 0
                    ? ((source.totalChecks24h - source.failedChecks24h) / source.totalChecks24h * 100)
                    : 0;

                  return (
                    <TableRow key={source.name}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge className={sourceConfig.color}>
                            {source.source}
                          </Badge>
                          <span className="font-medium">{source.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(source.status)}
                          <Badge className={`${getStatusColor(source.status)} capitalize`}>
                            {source.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right">
                          <div className={`font-medium ${getLatencyColor(source.latency)}`}>
                            {source.latency}ms
                          </div>
                          {source.avgLatency24h && (
                            <div className="text-xs text-muted-foreground">
                              Avg: {Math.round(source.avgLatency24h)}ms
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right">
                          <div className={`font-medium ${getSuccessRateColor(successRate)}`}>
                            {successRate.toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {source.totalChecks24h - source.failedChecks24h}/{source.totalChecks24h}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {source.lastSuccess ? (
                          <div className="text-sm">
                            {formatTimeAgo(source.lastSuccess)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {source.lastFailure ? (
                          <div className="text-sm text-red-600">
                            {formatTimeAgo(source.lastFailure)}
                          </div>
                        ) : (
                          <span className="text-green-600 text-sm">No failures</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="text-sm truncate" title={source.message}>
                            {source.message || 'No message'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {source.endpoint && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="h-8 w-8 p-0"
                              title="View endpoint"
                            >
                              <a
                                href={source.endpoint}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Globe className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {source.responseSize && (
                            <Badge variant="outline" className="text-xs">
                              {(source.responseSize / 1024).toFixed(1)}KB
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary Stats */}
        {healthData && healthData.sources.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {healthData.sources.filter(s => s.status === 'healthy').length}
              </div>
              <div className="text-sm text-muted-foreground">Healthy Sources</div>
            </div>

            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {Math.round(
                  healthData.sources.reduce((sum, s) => sum + s.latency, 0) /
                  healthData.sources.length
                )}ms
              </div>
              <div className="text-sm text-muted-foreground">Average Latency</div>
            </div>

            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {healthData.sources.reduce((sum, s) => sum + s.failedChecks24h, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Failed Checks (24h)</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}