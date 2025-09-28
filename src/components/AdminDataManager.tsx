import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  PlayCircle,
  CheckCircle,
  AlertCircle,
  Database,
  ArrowUpDown,
  BarChart3,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface SyncStatus {
  lastSyncTime: string | null;
  totalAlerts: number;
  alertsBySource: { [key: string]: number };
  recentAlerts: number;
}

interface SyncResult {
  source: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  alertsFetched: number;
  alertsInserted: number;
  alertsUpdated: number;
  alertsSkipped: number;
  errors: string[];
}

export const AdminDataManager: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const response = await fetch('/api/admin/sync-status');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load sync status');
      }

      setSyncStatus(data);
      logger.info('[AdminDataManager] Sync status loaded:', data);
    } catch (error) {
      logger.error('[AdminDataManager] Failed to load sync status:', error);
      toast.error('Failed to load data sync status');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Manual sync via API endpoint
  const handleManualSync = async () => {
    setLoading(true);
    setSyncResults([]);

    try {
      logger.info('[AdminDataManager] Starting manual API sync');
      toast.info('Starting data sync from all sources...');

      const response = await fetch('/api/admin/sync-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sinceDays: 1 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Sync request failed');
      }

      if (data.success) {
        setSyncResults(data.results || []);
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }

      // Refresh status after sync
      await loadSyncStatus();

    } catch (error) {
      logger.error('[AdminDataManager] Manual sync failed:', error);
      toast.error(`Manual sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setLoading(true);
    setSyncResults([]);

    try {
      logger.info('[AdminDataManager] Starting comprehensive data sync');
      toast.info('Starting data sync from all sources...');

      const response = await fetch('/api/admin/sync-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sinceDays: 30 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Sync request failed');
      }

      if (data.success) {
        const results = data.results || [];
        setSyncResults(results);

        const totalImported = results.reduce((sum: number, r: any) => sum + r.alertsInserted + r.alertsUpdated, 0);
        const totalErrors = results.reduce((sum: number, r: any) => sum + r.errors.length, 0);

        if (totalErrors === 0) {
          toast.success(`Successfully processed ${totalImported} alerts from all sources`);
        } else {
          toast.warning(`Processed ${totalImported} alerts with ${totalErrors} errors`);
        }
      } else {
        toast.error(data.message);
      }

      // Refresh status after sync
      await loadSyncStatus();

    } catch (error) {
      logger.error('[AdminDataManager] Sync failed:', error);
      toast.error(`Data sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFDA = async () => {
    setLoading(true);

    try {
      logger.info('[AdminDataManager] Starting FDA data sync');
      toast.info('Starting FDA Food alerts sync...');

      const response = await fetch('/api/admin/sync-fda', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sinceDays: 30 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'FDA sync request failed');
      }

      if (data.success) {
        setSyncResults(data.results ? [data.results] : []);
        toast.success(`Successfully imported ${data.results?.alertsInserted || 0} FDA alerts`);
      } else {
        toast.error(`FDA sync failed: ${data.message}`);
      }

      await loadSyncStatus();

    } catch (error) {
      logger.error('[AdminDataManager] FDA sync failed:', error);
      toast.error(`FDA sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFSIS = async () => {
    setLoading(true);

    try {
      logger.info('[AdminDataManager] Starting FSIS data sync');
      toast.info('Starting USDA FSIS alerts sync...');

      const response = await fetch('/api/admin/sync-fsis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sinceDays: 30 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'FSIS sync request failed');
      }

      if (data.success) {
        setSyncResults(data.results ? [data.results] : []);
        toast.success(`Successfully imported ${data.results?.alertsInserted || 0} FSIS alerts`);
      } else {
        toast.error(`FSIS sync failed: ${data.message}`);
      }

      await loadSyncStatus();

    } catch (error) {
      logger.error('[AdminDataManager] FSIS sync failed:', error);
      toast.error(`FSIS sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getSyncResultIcon = (result: SyncResult) => {
    if (result.success) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getSyncResultBadge = (result: SyncResult) => {
    if (result.success) {
      return <Badge className="bg-green-100 text-green-800">Success</Badge>;
    } else {
      return <Badge variant="destructive">Failed</Badge>;
    }
  };

  if (isLoadingStatus) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading data sync status...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{syncStatus?.totalAlerts || 0}</p>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{syncStatus?.recentAlerts || 0}</p>
                <p className="text-sm text-muted-foreground">Recent (7 days)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {syncStatus?.alertsBySource ? Object.keys(syncStatus.alertsBySource).length : 0}
                </p>
                <p className="text-sm text-muted-foreground">Data Sources</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Last Sync</p>
                <p className="text-xs text-muted-foreground">
                  {syncStatus?.lastSyncTime
                    ? new Date(syncStatus.lastSyncTime).toLocaleString()
                    : 'Never'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Sources Breakdown */}
      {syncStatus?.alertsBySource && Object.keys(syncStatus.alertsBySource).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Alerts by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(syncStatus.alertsBySource).map(([source, count]) => (
                <div key={source} className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-muted-foreground">{source}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Data Sync Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="manual" className="space-y-4">
            <TabsList className="flex flex-col w-full h-auto md:grid md:grid-cols-4 md:h-10">
              <TabsTrigger value="manual" className="w-full justify-start md:justify-center">Manual Sync</TabsTrigger>
              <TabsTrigger value="all" className="w-full justify-start md:justify-center">All Sources</TabsTrigger>
              <TabsTrigger value="fda" className="w-full justify-start md:justify-center">FDA Food</TabsTrigger>
              <TabsTrigger value="fsis" className="w-full justify-start md:justify-center">USDA FSIS</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Manual Sync (Recommended)</h3>
                  <p className="text-sm text-muted-foreground">
                    Trigger an immediate sync of recent alerts from all sources using the admin API
                  </p>
                </div>
                <Button
                  onClick={handleManualSync}
                  disabled={loading}
                  className="gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                  Sync Now
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Sync All Data Sources</h3>
                  <p className="text-sm text-muted-foreground">
                    Import alerts from FDA Food Enforcement and USDA FSIS for the last 30 days
                  </p>
                </div>
                <Button
                  onClick={handleSyncAll}
                  disabled={loading}
                  className="gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                  Sync All Sources
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="fda" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">FDA Food Enforcement</h3>
                  <p className="text-sm text-muted-foreground">
                    Import food safety alerts and recalls from FDA OpenAPI
                  </p>
                </div>
                <Button
                  onClick={handleSyncFDA}
                  disabled={loading}
                  variant="outline"
                  className="gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                  Sync FDA
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="fsis" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">USDA FSIS Recalls</h3>
                  <p className="text-sm text-muted-foreground">
                    Import meat and poultry recalls from USDA Food Safety and Inspection Service
                  </p>
                </div>
                <Button
                  onClick={handleSyncFSIS}
                  disabled={loading}
                  variant="outline"
                  className="gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                  Sync FSIS
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Sync Results */}
      {syncResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Sync Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {syncResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getSyncResultIcon(result)}
                    <div>
                      <div className="font-medium">{result.source}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.alertsInserted || 0} inserted, {result.alertsUpdated || 0} updated
                        {result.errors.length > 0 && `, ${result.errors.length} errors`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSyncResultBadge(result)}
                    <div className="text-sm text-muted-foreground">
                      {Math.round((result.endTime.getTime() - result.startTime.getTime()) / 1000)}s
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};