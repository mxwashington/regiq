/**
 * Data Source Testing & Health Panel
 * 
 * Unified admin dashboard for testing all regulatory data sources
 * with traffic light indicators and comprehensive health monitoring
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  RefreshCw, 
  XCircle,
  Database,
  TestTube
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SourceHealth {
  status: 'OK' | 'STALE' | 'AUTH_ERROR' | 'CONNECTIVITY_ERROR' | 'NO_DATA';
  latest?: string;
  records_last7?: number;
  dupes?: number;
  error?: string;
  response_time_ms?: number;
  freshness_threshold_hours?: number;
}

interface HealthCheckResult {
  FDA: SourceHealth;
  FSIS: SourceHealth;
  EPA: SourceHealth;
  CDC: SourceHealth;
  overall_status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  total_alerts_7d: number;
}

export const DataSourceTestingPanel = () => {
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [testLogs, setTestLogs] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | '24h' | '7d'>('all');
  const { toast } = useToast();

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('source-health-check', {
        body: { trigger: 'manual' }
      });

      if (error) throw error;

      setHealthCheck(data);
      toast({
        title: 'Health Check Complete',
        description: `Overall status: ${data.overall_status}`,
      });

      // Refresh logs
      await fetchLogs();
    } catch (error) {
      console.error('Health check failed:', error);
      toast({
        title: 'Health Check Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const runInlineTest = async (source: string) => {
    setLoading(true);
    try {
      let functionName = '';
      let body = {};

      switch (source) {
        case 'FDA Warning Letters':
          functionName = 'fda-warning-letters';
          body = { mode: 'test_inline' };
          break;
        case 'FDA Enforcement':
          functionName = 'fetch-openfda-enforcement';
          body = { test_mode: true };
          break;
        default:
          throw new Error(`No test available for ${source}`);
      }

      const { data, error } = await supabase.functions.invoke(functionName, { body });

      if (error) throw error;

      toast({
        title: `${source} Test Complete`,
        description: `Fetched ${data.total_fetched || 0} records, ${data.unique_records || 0} unique`,
      });
    } catch (error) {
      console.error(`Test failed for ${source}:`, error);
      toast({
        title: `${source} Test Failed`,
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from('source_health_logs' as any)
        .select('*')
        .order('check_timestamp', { ascending: false });

      if (activeFilter === '24h') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        query = query.gte('check_timestamp', yesterday.toISOString());
      } else if (activeFilter === '7d') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('check_timestamp', weekAgo.toISOString());
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      setTestLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  React.useEffect(() => {
    fetchLogs();
  }, [activeFilter]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'STALE':
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'AUTH_ERROR':
      case 'CONNECTIVITY_ERROR':
      case 'NO_DATA':
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
      'OK': 'default',
      'healthy': 'default',
      'STALE': 'secondary',
      'degraded': 'secondary',
      'AUTH_ERROR': 'destructive',
      'CONNECTIVITY_ERROR': 'destructive',
      'NO_DATA': 'destructive',
      'critical': 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Data Source Testing & Health
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor and test regulatory data ingestion pipelines
          </p>
        </div>
        <Button 
          onClick={runHealthCheck} 
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <PlayCircle className="mr-2 h-4 w-4" />
              Run Health Check
            </>
          )}
        </Button>
      </div>

      {/* Overall Status */}
      {healthCheck && (
        <Alert>
          <div className="flex items-center gap-2">
            {getStatusIcon(healthCheck.overall_status)}
            <AlertDescription>
              <strong>System Status:</strong> {healthCheck.overall_status.toUpperCase()} | 
              Total Alerts (7d): {healthCheck.total_alerts_7d} | 
              Last Check: {new Date(healthCheck.timestamp).toLocaleString()}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">
            <Database className="mr-2 h-4 w-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="tests">
            <TestTube className="mr-2 h-4 w-4" />
            Inline Tests
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Clock className="mr-2 h-4 w-4" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Source Health Status</CardTitle>
              <CardDescription>
                Real-time monitoring of all data sources with freshness thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthCheck ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Latest Record</TableHead>
                      <TableHead>Records (7d)</TableHead>
                      <TableHead>Duplicates</TableHead>
                      <TableHead>Response Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(['FDA', 'FSIS', 'EPA', 'CDC'] as const).map((source) => {
                      const health = healthCheck[source];
                      return (
                        <TableRow key={source}>
                          <TableCell className="font-medium">{source}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(health.status)}
                              {getStatusBadge(health.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {health.latest 
                              ? new Date(health.latest).toLocaleString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell>{health.records_last7 ?? 'N/A'}</TableCell>
                          <TableCell>
                            {health.dupes !== undefined ? (
                              health.dupes > 0 ? (
                                <span className="text-red-500 font-medium">{health.dupes}</span>
                              ) : (
                                <span className="text-green-500">0</span>
                              )
                            ) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {health.response_time_ms 
                              ? `${health.response_time_ms}ms`
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Run a health check to see source status</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inline Testing</CardTitle>
              <CardDescription>
                Test individual data sources with sample fetches
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: 'FDA Enforcement', available: true },
                { name: 'FDA Warning Letters', available: true },
                { name: 'FSIS RSS/API', available: false },
                { name: 'EPA', available: false },
                { name: 'CDC', available: false },
              ].map((source) => (
                <div 
                  key={source.name} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{source.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {source.available ? 'Fetch sample data and verify fields' : 'Test not yet implemented'}
                    </p>
                  </div>
                  <Button
                    onClick={() => runInlineTest(source.name)}
                    disabled={!source.available || loading}
                    size="sm"
                  >
                    <TestTube className="mr-2 h-4 w-4" />
                    Run Test
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Activity Log</CardTitle>
                  <CardDescription>
                    Historical health check results
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={activeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={activeFilter === '24h' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('24h')}
                  >
                    Last 24h
                  </Button>
                  <Button
                    variant={activeFilter === '7d' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveFilter('7d')}
                  >
                    Last 7 Days
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {testLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Overall Status</TableHead>
                      <TableHead>FDA</TableHead>
                      <TableHead>FSIS</TableHead>
                      <TableHead>EPA</TableHead>
                      <TableHead>CDC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {new Date(log.check_timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log.overall_status)}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.fda_status)}</TableCell>
                        <TableCell>{getStatusBadge(log.fsis_status)}</TableCell>
                        <TableCell>{getStatusBadge(log.epa_status)}</TableCell>
                        <TableCell>{getStatusBadge(log.cdc_status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No health check logs yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
