import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Database, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export function DataSourcesManager() {
  const [syncing, setSyncing] = useState(false);
  const [syncingSource, setSyncingSource] = useState<string | null>(null);

  const { data: syncLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['data-source-stats'],
    queryFn: async () => {
      const [recallsCount, outbreaksCount, advisoriesCount] = await Promise.all([
        supabase.from('recalls').select('id', { count: 'exact', head: true }),
        supabase.from('cdc_outbreak_alerts').select('id', { count: 'exact', head: true }),
        supabase.from('cdc_emergency_advisories').select('id', { count: 'exact', head: true }),
      ]);

      return {
        recalls: recallsCount.count || 0,
        outbreaks: outbreaksCount.count || 0,
        advisories: advisoriesCount.count || 0,
      };
    },
  });

  const handleSyncAll = async () => {
    setSyncing(true);
    toast.info('Starting FDA & CDC data sync...');

    try {
      const { data, error } = await supabase.functions.invoke('sync-fda-cdc-master');

      if (error) throw error;

      toast.success(`Sync complete: ${data.message}`);
      refetchLogs();
    } catch (error: any) {
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncSource = async (source: string, endpoint: string) => {
    setSyncingSource(source);
    toast.info(`Syncing ${source}...`);

    try {
      const { data, error } = await supabase.functions.invoke(endpoint);

      if (error) throw error;

      toast.success(`${source} sync complete`);
      refetchLogs();
    } catch (error: any) {
      toast.error(`${source} sync failed: ${error.message}`);
    } finally {
      setSyncingSource(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">FDA & CDC Data Sources</h2>
          <p className="text-muted-foreground">
            Manage and sync regulatory data from FDA and CDC
          </p>
        </div>
        <Button onClick={handleSyncAll} disabled={syncing} size="lg">
          {syncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync All Sources
            </>
          )}
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Recalls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recalls.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">FDA & USDA combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Outbreak Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.outbreaks.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">CDC outbreaks tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Emergency Advisories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.advisories.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">CDC travel notices</p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Data Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              FDA Food Enforcement
            </CardTitle>
            <CardDescription>
              Product recalls from FDA enforcement database (api.fda.gov)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Status:</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Records:</span>
              <span className="font-mono">{stats?.recalls.toLocaleString() || 0}</span>
            </div>
            <Button
              onClick={() => handleSyncSource('FDA Recalls', 'sync-fda-cdc-master')}
              disabled={syncingSource === 'FDA'}
              variant="outline"
              className="w-full"
            >
              {syncingSource === 'FDA' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync FDA Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              USDA Meat Recalls
            </CardTitle>
            <CardDescription>
              Meat and poultry recalls from USDA FSIS (fsis.usda.gov)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Status:</span>
              <span className="flex items-center gap-1 text-yellow-600">
                <AlertCircle className="h-4 w-4" />
                Intermittent
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Records:</span>
              <span className="font-mono">Part of FDA dataset</span>
            </div>
            <Button
              onClick={() => handleSyncSource('USDA Recalls', 'sync-fda-cdc-master')}
              disabled={syncingSource === 'USDA'}
              variant="outline"
              className="w-full"
            >
              {syncingSource === 'USDA' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync USDA Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              CDC Outbreak Alerts
            </CardTitle>
            <CardDescription>
              Foodborne outbreak data from CDC (data.cdc.gov)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Status:</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Records:</span>
              <span className="font-mono">{stats?.outbreaks.toLocaleString() || 0}</span>
            </div>
            <Button
              onClick={() => handleSyncSource('CDC Outbreaks', 'sync-fda-cdc-master')}
              disabled={syncingSource === 'CDC-O'}
              variant="outline"
              className="w-full"
            >
              {syncingSource === 'CDC-O' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Outbreak Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              CDC Emergency Advisories
            </CardTitle>
            <CardDescription>
              Travel and health notices from CDC RSS (wwwnc.cdc.gov)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Status:</span>
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Active
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Records:</span>
              <span className="font-mono">{stats?.advisories.toLocaleString() || 0}</span>
            </div>
            <Button
              onClick={() => handleSyncSource('CDC Advisories', 'sync-fda-cdc-master')}
              disabled={syncingSource === 'CDC-A'}
              variant="outline"
              className="w-full"
            >
              {syncingSource === 'CDC-A' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Advisory Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sync Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sync History</CardTitle>
          <CardDescription>Last 10 synchronization operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {syncLogs?.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{log.job_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono">
                    {log.records_synced || 0} records
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      log.status === 'success'
                        ? 'bg-green-100 text-green-800'
                        : log.status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
            {!syncLogs?.length && (
              <p className="text-center text-muted-foreground py-8">
                No sync history yet. Click "Sync All Sources" to begin.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
