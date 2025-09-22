import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Database, 
  RefreshCw, 
  Globe, 
  Rss, 
  Server, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  TrendingUp,
  Zap,
  Settings,
  Eye,
  PlayCircle
} from 'lucide-react';

interface RegulatoryDataSource {
  id: string;
  name: string;
  agency: string;
  region: string;
  source_type: string;
  base_url: string;
  rss_feeds: string[];
  polling_interval_minutes: number;
  priority: number;
  keywords: string[];
  is_active: boolean;
  last_successful_fetch: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface DataFreshness {
  id: string;
  source_name: string;
  last_successful_fetch: string;
  last_attempt: string;
  records_fetched: number;
  fetch_status: string;
  error_message: string | null;
}

interface PipelineStats {
  totalSources: number;
  activeSources: number;
  errorSources: number;
  lastRunTime: string | null;
  totalAlertsToday: number;
}

export function RegulatoryDataPipeline() {
  const [dataSources, setDataSources] = useState<RegulatoryDataSource[]>([]);
  const [dataFreshness, setDataFreshness] = useState<DataFreshness[]>([]);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats>({
    totalSources: 0,
    activeSources: 0,
    errorSources: 0,
    lastRunTime: null,
    totalAlertsToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllData();
    
    // Set up real-time subscription for data_sources
    const channel = supabase
      .channel('data-sources-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'data_sources'
        },
        () => {
          fetchAllData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchDataSources(),
        fetchDataFreshness(),
        fetchPipelineStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load monitoring data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDataSources = async () => {
    const { data, error } = await supabase
      .from('data_sources')
      .select('*')
      .order('priority', { ascending: false });

    if (error) throw error;
    
    // Transform the data to match our interface
    const transformedData: RegulatoryDataSource[] = (data || []).map(source => ({
      id: source.id,
      name: source.name,
      agency: source.agency,
      region: source.region,
      source_type: source.source_type,
      base_url: source.base_url,
      rss_feeds: Array.isArray(source.rss_feeds) ? source.rss_feeds.filter((feed): feed is string => typeof feed === 'string') : 
                 typeof source.rss_feeds === 'string' ? [source.rss_feeds] : [],
      polling_interval_minutes: source.polling_interval_minutes || 60,
      priority: source.priority || 5,
      keywords: Array.isArray(source.keywords) ? source.keywords.filter((keyword): keyword is string => typeof keyword === 'string') : 
                typeof source.keywords === 'string' ? [source.keywords] : [],
      is_active: source.is_active ?? true,
      last_successful_fetch: source.last_successful_fetch,
      last_error: source.last_error,
      created_at: source.created_at,
      updated_at: source.updated_at
    }));
    
    setDataSources(transformedData);
  };

  const fetchDataFreshness = async () => {
    const { data, error } = await supabase
      .from('data_freshness')
      .select('*')
      .order('last_attempt', { ascending: false });

    if (error) throw error;
    setDataFreshness(data || []);
  };

  const fetchPipelineStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Get alerts count for today
    const { count: alertsCount } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // Get system settings for last run time
    const { data: lastRunData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'pipeline_last_run')
      .maybeSingle();

    setPipelineStats({
      totalSources: dataSources.length,
      activeSources: dataSources.filter(s => s.is_active).length,
      errorSources: dataSources.filter(s => s.last_error).length,
      lastRunTime: (lastRunData?.setting_value as any)?.timestamp || null,
      totalAlertsToday: alertsCount || 0
    });
  };

  const toggleSourceStatus = async (sourceId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('data_sources')
        .update({ is_active: isActive })
        .eq('id', sourceId);

      if (error) throw error;
      
      setDataSources(prev => 
        prev.map(source => 
          source.id === sourceId ? { ...source, is_active: isActive } : source
        )
      );

      toast({
        title: isActive ? 'Source Activated' : 'Source Deactivated',
        description: `${dataSources.find(s => s.id === sourceId)?.name} has been ${isActive ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      console.error('Error updating source status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update source status',
        variant: 'destructive'
      });
    }
  };

  const runPipelineForSource = async (sourceId: string) => {
    const source = dataSources.find(s => s.id === sourceId);
    if (!source) return;

    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-regulatory-data-pipeline', {
        body: { 
          agency: source.agency,
          force_refresh: true 
        }
      });
      
      if (error) throw error;

      toast({
        title: 'Pipeline Complete',
        description: `Processed ${source.name}: ${data.totalAlertsProcessed || 0} new alerts`,
      });
      
      await fetchAllData();
    } catch (error) {
      console.error('Error running pipeline:', error);
      toast({
        title: 'Pipeline Error',
        description: `Failed to run pipeline for ${source.name}`,
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const runFullPipeline = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-regulatory-data-pipeline', {
        body: { force_refresh: true }
      });
      
      if (error) throw error;

      toast({
        title: 'Full Pipeline Complete',
        description: `Processed all sources: ${data.totalAlertsProcessed || 0} new alerts`,
      });
      
      await fetchAllData();
    } catch (error) {
      console.error('Error running full pipeline:', error);
      toast({
        title: 'Pipeline Error',
        description: 'Failed to run full data pipeline',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'rss': return <Rss className="h-4 w-4" />;
      case 'api': return <Server className="h-4 w-4" />;
      case 'scraping': return <Globe className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (source: RegulatoryDataSource) => {
    if (!source.is_active) return <XCircle className="h-4 w-4 text-gray-400" />;
    if (source.last_error) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (!source.last_successful_fetch) return <Clock className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusText = (source: RegulatoryDataSource) => {
    if (!source.is_active) return 'Inactive';
    if (source.last_error) return 'Error';
    if (!source.last_successful_fetch) return 'Pending';
    return 'Healthy';
  };

  const formatLastFetched = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 9) return 'bg-red-100 text-red-800';
    if (priority >= 7) return 'bg-orange-100 text-orange-800';
    if (priority >= 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 9) return 'Critical';
    if (priority >= 7) return 'High';
    if (priority >= 5) return 'Medium';
    return 'Low';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading API monitoring dashboard...</p>
        </div>
      </div>
    );
  }

  // Group sources by agency and priority
  const sourcesByAgency = dataSources.reduce((acc, source) => {
    if (!acc[source.agency]) acc[source.agency] = [];
    acc[source.agency].push(source);
    return acc;
  }, {} as Record<string, RegulatoryDataSource[]>);

  // Sort agencies by highest priority sources
  const sortedAgencies = Object.entries(sourcesByAgency).sort(([, a], [, b]) => {
    const maxPriorityA = Math.max(...a.map(s => s.priority));
    const maxPriorityB = Math.max(...b.map(s => s.priority));
    return maxPriorityB - maxPriorityA;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            API Monitoring Dashboard
          </h2>
          <p className="text-muted-foreground">
            Real-time monitoring of regulatory data sources and API endpoints
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runFullPipeline}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Run All Sources
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sources</p>
                <p className="text-2xl font-bold">{pipelineStats.totalSources}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sources</p>
                <p className="text-2xl font-bold text-green-600">{pipelineStats.activeSources}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Error Sources</p>
                <p className="text-2xl font-bold text-red-600">{pipelineStats.errorSources}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alerts Today</p>
                <p className="text-2xl font-bold text-blue-600">{pipelineStats.totalAlertsToday}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sources by Agency */}
      <div className="space-y-4">
        {sortedAgencies.map(([agency, sources]) => (
          <Card key={agency}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  {agency} APIs
                  <Badge variant="secondary">{sources.length} endpoints</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{sources.filter(s => s.is_active).length} active</span>
                  <span>•</span>
                  <span>{sources.filter(s => s.last_error).length} errors</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sources
                  .sort((a, b) => b.priority - a.priority)
                  .map((source) => (
                    <div key={source.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {getSourceIcon(source.source_type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{source.name}</h4>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getPriorityColor(source.priority)}`}
                              >
                                {getPriorityLabel(source.priority)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="truncate">{source.base_url}</span>
                              <span>•</span>
                              <span>Poll: {source.polling_interval_minutes}m</span>
                              <span>•</span>
                              <span className="capitalize">{source.source_type}</span>
                            </div>
                            {source.last_error && (
                              <p className="text-xs text-red-600 mt-1 truncate">
                                Error: {source.last_error}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Status */}
                          <div className="text-right text-sm">
                            <div className="flex items-center gap-1 mb-1">
                              {getStatusIcon(source)}
                              <span className="font-medium">{getStatusText(source)}</span>
                            </div>
                            <div className="text-muted-foreground">
                              {formatLastFetched(source.last_successful_fetch)}
                            </div>
                          </div>
                          
                          {/* Controls */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => runPipelineForSource(source.id)}
                              disabled={refreshing}
                              title="Run this source"
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                            
                            <Switch
                              checked={source.is_active}
                              onCheckedChange={(checked) => toggleSourceStatus(source.id, checked)}
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Keywords */}
                      {source.keywords && source.keywords.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">Keywords:</span>
                          {source.keywords.slice(0, 5).map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {source.keywords.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{source.keywords.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Freshness Monitor */}
      {dataFreshness.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Data Freshness Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dataFreshness.slice(0, 10).map((freshness) => (
                <div key={freshness.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{freshness.source_name}</span>
                    <Badge variant={freshness.fetch_status === 'success' ? 'default' : 'destructive'}>
                      {freshness.fetch_status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {freshness.records_fetched} records • {formatLastFetched(freshness.last_successful_fetch)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}