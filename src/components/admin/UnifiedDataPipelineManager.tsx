/**
 * Unified Data Pipeline Manager
 * 
 * Consolidates all regulatory data ingestion sources (FDA, FSIS, EPA, CDC)
 * into a single comprehensive pipeline management interface.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Download, 
  PlayCircle, 
  RefreshCw, 
  Settings as SettingsIcon, 
  TestTube, 
  XCircle,
  Database,
  Calendar,
  FileText,
  Eye,
  Zap,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PipelineSource {
  id: string;
  name: string;
  agency: 'FDA' | 'FSIS' | 'EPA' | 'CDC';
  logo: string;
  endpoints: string[];
  auth_required: boolean;
  auth_header?: string;
  cron_frequency: '1h' | '6h' | '12h' | '24h';
  retry_attempts: number;
  retry_backoff_ms: number;
  cooldown_minutes: number;
  is_enabled: boolean;
  edge_function: string;
  test_function?: string;
}

interface SourceHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'disabled';
  last_fetch: string | null;
  records_7d: number;
  error_count: number;
  last_error: string | null;
  next_run: string | null;
  freshness_hours: number;
}

interface HealthCheckResult {
  FDA: { status: string; latest?: string; records_last7?: number };
  FSIS: { status: string; latest?: string; records_last7?: number };
  EPA: { status: string; latest?: string; records_last7?: number };
  CDC: { status: string; latest?: string; records_last7?: number };
  overall_status: string;
  timestamp: string;
}

const PIPELINE_SOURCES: PipelineSource[] = [
  {
    id: 'fda-enforcement',
    name: 'FDA Enforcement',
    agency: 'FDA',
    logo: '🏥',
    endpoints: ['https://api.fda.gov/food/enforcement.json'],
    auth_required: false,
    cron_frequency: '6h',
    retry_attempts: 3,
    retry_backoff_ms: 2000,
    cooldown_minutes: 15,
    is_enabled: true,
    edge_function: 'fetch-openfda-enforcement',
    test_function: 'fetch-openfda-enforcement'
  },
  {
    id: 'fda-warning-letters',
    name: 'FDA Warning Letters',
    agency: 'FDA',
    logo: '⚠️',
    endpoints: ['https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters'],
    auth_required: false,
    cron_frequency: '12h',
    retry_attempts: 3,
    retry_backoff_ms: 2000,
    cooldown_minutes: 15,
    is_enabled: true,
    edge_function: 'fda-warning-letters',
    test_function: 'fda-warning-letters'
  },
  {
    id: 'fsis-recalls',
    name: 'FSIS RSS/API',
    agency: 'FSIS',
    logo: '🥩',
    endpoints: [
      'https://www.fsis.usda.gov/api/recalls',
      'https://www.fsis.usda.gov/recalls-alerts/rss.xml'
    ],
    auth_required: false,
    cron_frequency: '6h',
    retry_attempts: 3,
    retry_backoff_ms: 2000,
    cooldown_minutes: 15,
    is_enabled: true,
    edge_function: 'fsis-enhanced-ingestion',
    test_function: 'fsis-enhanced-ingestion'
  },
  {
    id: 'epa-echo',
    name: 'EPA ECHO',
    agency: 'EPA',
    logo: '🌍',
    endpoints: ['https://echo.epa.gov/api/rest-services'],
    auth_required: false,
    cron_frequency: '24h',
    retry_attempts: 3,
    retry_backoff_ms: 2000,
    cooldown_minutes: 30,
    is_enabled: false,
    edge_function: 'epa-echo-api'
  },
  {
    id: 'epa-regulations',
    name: 'EPA Regulations.gov',
    agency: 'EPA',
    logo: '📜',
    endpoints: ['https://www.regulations.gov/api/search/v2/documents'],
    auth_required: true,
    auth_header: 'X-Api-Key',
    cron_frequency: '12h',
    retry_attempts: 3,
    retry_backoff_ms: 2000,
    cooldown_minutes: 20,
    is_enabled: false,
    edge_function: 'regulations-gov-api'
  },
  {
    id: 'cdc-eid',
    name: 'CDC EID/MMWR',
    agency: 'CDC',
    logo: '🦠',
    endpoints: ['https://tools.cdc.gov/api/v2/resources/media'],
    auth_required: false,
    cron_frequency: '24h',
    retry_attempts: 3,
    retry_backoff_ms: 2000,
    cooldown_minutes: 30,
    is_enabled: false,
    edge_function: 'cdc-media-api'
  }
];

export const UnifiedDataPipelineManager = () => {
  const [sources, setSources] = useState<PipelineSource[]>(PIPELINE_SOURCES);
  const [sourceHealth, setSourceHealth] = useState<Record<string, SourceHealth>>({});
  const [healthCheckResult, setHealthCheckResult] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<PipelineSource | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    await Promise.all([
      fetchSourceHealth(),
      fetchRecentLogs()
    ]);
  };

  const fetchSourceHealth = async () => {
    try {
      const { data, error } = await supabase
        .from('data_freshness')
        .select('*');

      if (error) throw error;

      const healthMap: Record<string, SourceHealth> = {};
      
      data?.forEach((record: any) => {
        const sourceId = record.source_name.toLowerCase().replace(/\s+/g, '-');
        const lastFetch = record.last_successful_fetch ? new Date(record.last_successful_fetch) : null;
        const hoursAgo = lastFetch ? (Date.now() - lastFetch.getTime()) / (1000 * 60 * 60) : 999;

        healthMap[sourceId] = {
          status: record.fetch_status === 'success' ? 
            (hoursAgo < 24 ? 'healthy' : 'degraded') : 
            'critical',
          last_fetch: record.last_successful_fetch,
          records_7d: record.records_fetched || 0,
          error_count: 0,
          last_error: record.error_message,
          next_run: null,
          freshness_hours: Math.round(hoursAgo * 10) / 10
        };
      });

      setSourceHealth(healthMap);
    } catch (error) {
      console.error('Failed to fetch source health:', error);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('source_health_logs' as any)
        .select('*')
        .order('check_timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const runAllHealthChecks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('source-health-check', {
        body: { trigger: 'manual_all' }
      });

      if (error) throw error;

      setHealthCheckResult(data);
      toast({
        title: 'Health Check Complete',
        description: `Overall status: ${data.overall_status}`,
      });

      await Promise.all([
        fetchSourceHealth(),
        fetchRecentLogs()
      ]);
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

  const runSourceHealthCheck = async (source: PipelineSource) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('source-health-check', {
        body: { 
          trigger: 'manual_single',
          source: source.agency
        }
      });

      if (error) throw error;

      toast({
        title: 'Health Check Complete',
        description: `${source.name}: ${data[source.agency]?.status || 'Unknown'}`,
      });

      await fetchSourceHealth();
    } catch (error) {
      console.error(`Health check failed for ${source.name}:`, error);
      toast({
        title: 'Health Check Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const runInlineTest = async (source: PipelineSource) => {
    if (!source.test_function) {
      toast({
        title: 'Test Not Available',
        description: `Inline test not yet implemented for ${source.name}`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(source.test_function, {
        body: { test_mode: true }
      });

      if (error) throw error;

      toast({
        title: `${source.name} Test Complete`,
        description: `Fetched ${data.total_fetched || data.result?.total_fetched || 0} records`,
      });
    } catch (error) {
      console.error(`Test failed for ${source.name}:`, error);
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSource = async (sourceId: string, enabled: boolean) => {
    setSources(prev =>
      prev.map(s => s.id === sourceId ? { ...s, is_enabled: enabled } : s)
    );

    toast({
      title: enabled ? 'Source Enabled' : 'Source Disabled',
      description: `${sources.find(s => s.id === sourceId)?.name} ingestion ${enabled ? 'enabled' : 'disabled'}`,
    });
  };

  const exportLogs = async (format: 'csv' | 'json') => {
    try {
      const { data, error } = await supabase
        .from('source_health_logs' as any)
        .select('*')
        .order('check_timestamp', { ascending: false })
        .limit(1000);

      if (error) throw error;

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `source-health-logs-${new Date().toISOString()}.json`;
        a.click();
      } else {
        // CSV export
        const headers = ['Timestamp', 'FDA', 'FSIS', 'EPA', 'CDC', 'Overall Status'];
        const rows = data.map((log: any) => [
          log.check_timestamp,
          log.fda_status,
          log.fsis_status,
          log.epa_status,
          log.cdc_status,
          log.overall_status
        ]);

        const csvContent = [
          headers.join(','),
          ...rows.map((row: any[]) => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `source-health-logs-${new Date().toISOString()}.csv`;
        a.click();
      }

      toast({
        title: 'Export Complete',
        description: `Logs exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'OK':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
      case 'STALE':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
      case 'AUTH_ERROR':
      case 'CONNECTIVITY_ERROR':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'disabled':
        return <XCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'OK':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
      case 'STALE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critical':
      case 'AUTH_ERROR':
      case 'CONNECTIVITY_ERROR':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'disabled':
        return 'bg-gray-100 text-gray-600 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Data Pipeline Management
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Unified control center for all regulatory data ingestion sources
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={runAllHealthChecks}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            Run All Health Checks
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Backfill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Backfill Missing Data</DialogTitle>
                <DialogDescription>
                  Re-ingest data for a specific date range (coming soon)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" />
                </div>
                <Button disabled>Run Backfill</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Logs</DialogTitle>
                <DialogDescription>
                  Download source health logs in your preferred format
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Button onClick={() => exportLogs('csv')} className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Export as CSV
                </Button>
                <Button onClick={() => exportLogs('json')} className="w-full" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Export as JSON
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overall Status Alert */}
      {healthCheckResult && (
        <Alert>
          <div className="flex items-center gap-2">
            {getStatusIcon(healthCheckResult.overall_status)}
            <AlertDescription>
              <strong>System Status:</strong> {healthCheckResult.overall_status.toUpperCase()} | 
              Last Check: {new Date(healthCheckResult.timestamp).toLocaleString()}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Pipeline Sources Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {sources.map(source => {
          const health = sourceHealth[source.id] || {
            status: 'disabled',
            last_fetch: null,
            records_7d: 0,
            error_count: 0,
            last_error: null,
            next_run: null,
            freshness_hours: 999
          };

          return (
            <Card key={source.id} className={`border-2 ${source.is_enabled ? '' : 'opacity-60'}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{source.logo}</span>
                    <div>
                      <CardTitle className="text-lg">{source.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {source.agency} • {source.cron_frequency} schedule
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(health.status)}>
                        {health.status}
                      </Badge>
                      <Switch
                        checked={source.is_enabled}
                        onCheckedChange={(checked) => toggleSource(source.id, checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Health Metrics */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Last Fetch</p>
                    <p className="text-sm font-medium">
                      {health.last_fetch 
                        ? new Date(health.last_fetch).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Records (7d)</p>
                    <p className="text-sm font-medium">{health.records_7d}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Freshness</p>
                    <p className="text-sm font-medium">
                      {health.freshness_hours < 24 
                        ? `${Math.round(health.freshness_hours)}h` 
                        : `${Math.round(health.freshness_hours / 24)}d`}
                    </p>
                  </div>
                </div>

                {/* Error Display */}
                {health.last_error && (
                  <Alert variant="destructive" className="text-xs">
                    <AlertCircle className="h-3 w-3" />
                    <AlertDescription>
                      {health.last_error.substring(0, 100)}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runSourceHealthCheck(source)}
                    disabled={loading || !source.is_enabled}
                    className="flex-1"
                  >
                    <Activity className="mr-2 h-3 w-3" />
                    Health Check
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runInlineTest(source)}
                    disabled={loading || !source.is_enabled || !source.test_function}
                    className="flex-1"
                  >
                    <TestTube className="mr-2 h-3 w-3" />
                    Test
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSource(source)}
                        className="flex-1"
                      >
                        <SettingsIcon className="mr-2 h-3 w-3" />
                        Config
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Configure {source.name}</DialogTitle>
                        <DialogDescription>
                          Manage endpoints, authentication, and retry policies
                        </DialogDescription>
                      </DialogHeader>

                      <Tabs defaultValue="endpoints">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
                          <TabsTrigger value="auth">Authentication</TabsTrigger>
                          <TabsTrigger value="retry">Retry Policy</TabsTrigger>
                        </TabsList>

                        <TabsContent value="endpoints" className="space-y-4">
                          <div>
                            <Label>Endpoint URLs</Label>
                            {source.endpoints.map((endpoint, idx) => (
                              <Input
                                key={idx}
                                value={endpoint}
                                readOnly
                                className="mt-2"
                              />
                            ))}
                          </div>
                          <div>
                            <Label>Edge Function</Label>
                            <Input value={source.edge_function} readOnly />
                          </div>
                        </TabsContent>

                        <TabsContent value="auth" className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>Authentication Required</Label>
                            <Switch checked={source.auth_required} disabled />
                          </div>
                          {source.auth_required && (
                            <>
                              <div>
                                <Label>Auth Header</Label>
                                <Input value={source.auth_header} readOnly />
                              </div>
                              <div>
                                <Label>API Key (Masked)</Label>
                                <Input type="password" value="••••••••••••" readOnly />
                              </div>
                            </>
                          )}
                        </TabsContent>

                        <TabsContent value="retry" className="space-y-4">
                          <div>
                            <Label>Cron Frequency</Label>
                            <Select value={source.cron_frequency} disabled>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1h">Every Hour</SelectItem>
                                <SelectItem value="6h">Every 6 Hours</SelectItem>
                                <SelectItem value="12h">Every 12 Hours</SelectItem>
                                <SelectItem value="24h">Daily</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Max Retry Attempts</Label>
                            <Input type="number" value={source.retry_attempts} readOnly />
                          </div>
                          <div>
                            <Label>Initial Backoff (ms)</Label>
                            <Input type="number" value={source.retry_backoff_ms} readOnly />
                          </div>
                          <div>
                            <Label>Circuit Breaker Cooldown (min)</Label>
                            <Input type="number" value={source.cooldown_minutes} readOnly />
                          </div>
                        </TabsContent>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Activity Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="space-y-2">
              {logs.slice(0, 10).map((log, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(log.overall_status)}
                    <span className="text-sm">
                      {new Date(log.check_timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{log.fda_status}</Badge>
                    <Badge variant="outline">{log.fsis_status}</Badge>
                    <Badge variant="outline">{log.epa_status}</Badge>
                    <Badge variant="outline">{log.cdc_status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No logs available yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};