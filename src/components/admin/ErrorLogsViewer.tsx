import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  RefreshCw, 
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  FileWarning
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncLog {
  id: string;
  source: string;
  status: string;
  run_started: string;
  run_finished: string | null;
  alerts_fetched: number;
  alerts_inserted: number;
  alerts_skipped: number;
  errors: string[];
  metadata: any;
}

export const ErrorLogsViewer = () => {
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchErrorLogs();
  }, []);

  const fetchErrorLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alert_sync_logs')
        .select('*')
        .or('status.eq.error,errors.neq.{}')
        .order('run_started', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Failed to fetch error logs:', error);
      toast({
        title: 'Failed to Load Logs',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Source', 'Status', 'Fetched', 'Inserted', 'Skipped', 'Errors'].join(','),
      ...logs.map(log => [
        log.run_started,
        log.source,
        log.status,
        log.alerts_fetched || 0,
        log.alerts_inserted || 0,
        log.alerts_skipped || 0,
        log.errors?.length || 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${new Date().toISOString()}.csv`;
    a.click();

    toast({
      title: 'Export Complete',
      description: 'Error logs exported as CSV',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDuration = (started: string, finished: string | null) => {
    if (!finished) return 'Running...';
    const duration = new Date(finished).getTime() - new Date(started).getTime();
    return `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <FileWarning className="h-5 w-5" />
            Error Logs
          </h3>
          <p className="text-sm text-muted-foreground">
            Recent errors and warnings from data sync operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchErrorLogs}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Refresh</span>
          </Button>
          <Button
            onClick={exportLogs}
            disabled={logs.length === 0}
            variant="outline"
            size="sm"
          >
            <Download className="h-4 w-4" />
            <span className="ml-2">Export</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-sm text-muted-foreground">Total Logs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {logs.filter(l => l.status === 'error').length}
              </p>
              <p className="text-sm text-muted-foreground">Errors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">
                {logs.filter(l => l.errors && l.errors.length > 0).length}
              </p>
              <p className="text-sm text-muted-foreground">With Warnings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Error Logs</CardTitle>
          <CardDescription>
            Showing {logs.length} most recent logs with errors or warnings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No error logs found. All systems running smoothly!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {logs.map(log => {
                const isExpanded = expandedLogs.has(log.id);
                return (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                          <span className="font-medium">{log.source}</span>
                          {log.errors && log.errors.length > 0 && (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                              {log.errors.length} error{log.errors.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.run_started).toLocaleString()}
                          </div>
                          <span>Duration: {formatDuration(log.run_started, log.run_finished)}</span>
                          <span>Fetched: {log.alerts_fetched || 0}</span>
                          <span>Inserted: {log.alerts_inserted || 0}</span>
                          <span>Skipped: {log.alerts_skipped || 0}</span>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 space-y-2">
                            {log.errors && log.errors.length > 0 && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded">
                                <p className="text-sm font-medium text-red-900 mb-2">Errors:</p>
                                <ul className="space-y-1">
                                  {log.errors.map((error, idx) => (
                                    <li key={idx} className="text-sm text-red-800 font-mono">
                                      • {error}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="p-3 bg-muted rounded">
                                <p className="text-sm font-medium mb-2">Metadata:</p>
                                <pre className="text-xs overflow-x-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(log.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
