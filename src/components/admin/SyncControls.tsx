// Sync Controls Component
// Manual sync triggers and data pipeline controls

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PlayCircle,
  RefreshCw,
  Trash2,
  Database,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useSyncTrigger,
  useHealthCheck,
  useDedupe,
  useAdminFetch,
} from '@/hooks/useAdminFetch';
import { formatNumber, formatDuration, formatTimeAgo } from '@/lib/format';

interface SyncResult {
  source: string;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  duration: number;
}

export function SyncControls() {
  const [lastSyncResults, setLastSyncResults] = useState<SyncResult[]>([]);
  const [syncProgress, setSyncProgress] = useState(0);

  const { triggerSync, triggerBackfill, loading: syncLoading } = useSyncTrigger();
  const { runHealthCheck, healthData, loading: healthLoading } = useHealthCheck();
  const { runDedupe, loading: dedupeLoading } = useDedupe();
  const { execute: runReindex, loading: reindexLoading } = useAdminFetch();

  const handleSync = async () => {
    setSyncProgress(0);
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const result = await triggerSync(1);
      if (result?.results) {
        setLastSyncResults(result.results);
      }
    } finally {
      clearInterval(progressInterval);
      setSyncProgress(100);
      setTimeout(() => setSyncProgress(0), 2000);
    }
  };

  const handleBackfill = async () => {
    setSyncProgress(0);
    const progressInterval = setInterval(() => {
      setSyncProgress(prev => Math.min(prev + 5, 90));
    }, 1000);

    try {
      const result = await triggerBackfill(30);
      if (result?.results) {
        setLastSyncResults(result.results);
      }
    } finally {
      clearInterval(progressInterval);
      setSyncProgress(100);
      setTimeout(() => setSyncProgress(0), 2000);
    }
  };

  const handleDedupe = async () => {
    const result = await runDedupe();
    if (result) {
      toast.success(`Removed ${result.removedCount} duplicate alerts`);
    }
  };

  const handleReindex = async () => {
    const result = await runReindex('/api/admin/reindex', {
      method: 'POST',
      showSuccessToast: true,
      successMessage: 'Database reindexing completed',
    });
    if (result) {
      toast.success(`Created ${result.indexesCreated} indexes`);
    }
  };

  const handleHealthCheck = async () => {
    await runHealthCheck();
  };

  const isAnyLoading = syncLoading || healthLoading || dedupeLoading || reindexLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <RefreshCw className="h-5 w-5" />
          <span>Data Pipeline Controls</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        {syncProgress > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Sync Progress</span>
              <span>{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
          </div>
        )}

        {/* Primary Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            onClick={handleSync}
            disabled={isAnyLoading}
            className="h-auto py-4 flex flex-col items-center space-y-2"
          >
            {syncLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <PlayCircle className="h-5 w-5" />
            )}
            <div className="text-center">
              <div className="font-semibold">Sync Now</div>
              <div className="text-xs opacity-90">Last 24 hours</div>
            </div>
          </Button>

          <Button
            onClick={handleBackfill}
            disabled={isAnyLoading}
            variant="outline"
            className="h-auto py-4 flex flex-col items-center space-y-2"
          >
            {syncLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Database className="h-5 w-5" />
            )}
            <div className="text-center">
              <div className="font-semibold">Backfill</div>
              <div className="text-xs opacity-70">Last 30 days</div>
            </div>
          </Button>
        </div>

        {/* Secondary Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            onClick={handleHealthCheck}
            disabled={isAnyLoading}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            {healthLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            <span>Health Check</span>
          </Button>

          <Button
            onClick={handleDedupe}
            disabled={isAnyLoading}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            {dedupeLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>Dedupe</span>
          </Button>

          <Button
            onClick={handleReindex}
            disabled={isAnyLoading}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            {reindexLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            <span>Reindex</span>
          </Button>
        </div>

        {/* Health Status */}
        {healthData && (
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <span>Health Status</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {healthData.sources.map(source => (
                <div
                  key={source.name}
                  className="text-center p-3 border rounded-lg"
                >
                  <div className="font-medium text-sm">{source.name}</div>
                  <Badge
                    variant={source.status === 'healthy' ? 'default' : 'destructive'}
                    className="mt-1 text-xs"
                  >
                    {source.status}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {source.latency}ms
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Sync Results */}
        {lastSyncResults.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3 flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Last Sync Results</span>
            </h4>
            <div className="space-y-2">
              {lastSyncResults.map(result => (
                <div
                  key={result.source}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Badge variant="outline">{result.source}</Badge>
                    {result.errors.length === 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-sm text-right">
                    <div>
                      {formatNumber(result.inserted)} new, {formatNumber(result.updated)} updated
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(result.duration)}
                      {result.errors.length > 0 && (
                        <span className="text-red-500 ml-1">
                          • {result.errors.length} errors
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}