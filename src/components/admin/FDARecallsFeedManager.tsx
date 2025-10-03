import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function FDARecallsFeedManager() {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const { data: feedHealth, refetch: refetchHealth } = useQuery({
    queryKey: ['fda-recalls-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_freshness')
        .select('*')
        .eq('source_name', 'FDA')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const { data: recentRecalls, refetch: refetchRecalls } = useQuery({
    queryKey: ['recent-fda-recalls'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('source', 'FDA')
        .order('published_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['fda-recalls-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [todayCount, weekCount, totalCount] = await Promise.all([
        supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('source', 'FDA')
          .gte('published_date', today.toISOString()),
        supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('source', 'FDA')
          .gte('published_date', weekAgo.toISOString()),
        supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('source', 'FDA'),
      ]);

      return {
        today: todayCount.count || 0,
        week: weekCount.count || 0,
        total: totalCount.count || 0,
      };
    },
  });

  const handleSync = async () => {
    setSyncing(true);
    toast({ title: 'Starting FDA/USDA Recalls sync...', description: 'This may take a few moments' });

    try {
      const { data, error } = await supabase.functions.invoke('rss-alert-scraper', {
        body: { source: 'FDA' }
      });

      if (error) throw error;

      const processed = data?.agencyResults?.FDA || 0;
      const total = data?.totalAlertsProcessed || 0;
      
      if (processed === 0 && total === 0) {
        toast({
          title: 'No New Recalls Found',
          description: 'Feed sync completed but no new alerts were processed. Check Edge Function logs for details.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Sync Complete',
          description: `Processed ${processed} FDA/USDA recall alerts (${total} total across all sources)`,
        });
      }

      await Promise.all([refetchHealth(), refetchRecalls()]);
    } catch (error: any) {
      console.error('FDA recalls sync failed:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error.message?.includes('404')) {
        errorMessage = 'Feed URL returned 404 - RSS feed may have moved';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timeout - FDA server too slow';
      } else if (error.message?.includes('HTML')) {
        errorMessage = 'Received HTML instead of XML - feed URL may be incorrect';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Sync Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  const getHealthStatus = () => {
    if (!feedHealth?.last_successful_fetch) return { status: 'unknown', reason: 'No sync history' };
    
    const lastFetch = new Date(feedHealth.last_successful_fetch);
    const hoursAgo = (Date.now() - lastFetch.getTime()) / (1000 * 60 * 60);
    
    if (hoursAgo < 6) return { status: 'healthy', reason: 'Recently updated' };
    if (hoursAgo < 24) return { 
      status: 'degraded', 
      reason: `Last update ${Math.round(hoursAgo)} hours ago` 
    };
    return { 
      status: 'critical', 
      reason: `No update in ${Math.round(hoursAgo / 24)} days` 
    };
  };

  const healthInfo = getHealthStatus();
  const status = healthInfo.status;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">FDA & USDA Recalls Feed</h2>
          <p className="text-muted-foreground">
            Real-time food safety recalls from FDA and USDA RSS feeds
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing} size="lg" className="gap-2">
          {syncing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="h-5 w-5" />
              Sync FDA/USDA Recalls
            </>
          )}
        </Button>
      </div>

      {/* Feed Health Alert */}
      {status === 'critical' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Critical:</strong> {healthInfo.reason}. Run a manual sync to check for new recalls.
          </AlertDescription>
        </Alert>
      )}
      {status === 'degraded' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> {healthInfo.reason}. Consider running a manual sync.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Feed Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {status === 'healthy' && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span className="text-xl font-bold text-green-600">Healthy</span>
                </>
              )}
              {status === 'degraded' && (
                <>
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="text-xl font-bold text-yellow-600">Degraded</span>
                </>
              )}
              {status === 'critical' && (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-xl font-bold text-red-600">Critical</span>
                </>
              )}
              {status === 'unknown' && (
                <>
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className="text-xl font-bold text-gray-400">Unknown</span>
                </>
              )}
            </div>
            {feedHealth?.last_successful_fetch && (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date(feedHealth.last_successful_fetch).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {healthInfo.reason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.today || 0}</div>
            <p className="text-xs text-muted-foreground">New recalls today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.week || 0}</div>
            <p className="text-xs text-muted-foreground">Recalls last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">All FDA/USDA recalls</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Recalls */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Recalls</CardTitle>
          <CardDescription>Last 20 FDA and USDA recall alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentRecalls?.map((recall) => (
              <div
                key={recall.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium leading-tight">{recall.title}</h4>
                    {recall.urgency && (
                      <Badge
                        variant={
                          recall.urgency === 'Critical' || recall.urgency === 'High'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {recall.urgency}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{recall.summary}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(recall.published_date).toLocaleDateString()}
                    </span>
                    {recall.agency && (
                      <Badge variant="outline" className="text-xs">
                        {recall.agency}
                      </Badge>
                    )}
                  </div>
                </div>
                {recall.external_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="ml-4 shrink-0"
                  >
                    <a href={recall.external_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            ))}
            {!recentRecalls?.length && (
              <p className="text-center text-muted-foreground py-8">
                No recalls found. Click "Sync FDA/USDA Recalls" to fetch data.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
