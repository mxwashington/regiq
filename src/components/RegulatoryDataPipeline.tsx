import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
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
  Plus,
  Trash2
} from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  agency: string;
  source_type: string;
  url: string;
  is_active: boolean;
  last_fetched_at: string | null;
  fetch_interval: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export function RegulatoryDataPipeline() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    agency: '',
    source_type: 'rss' as const,
    url: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    try {
      const { data, error } = await supabase
        .from('data_sources')
        .select('*')
        .order('agency', { ascending: true });

      if (error) throw error;
      setDataSources(data || []);
    } catch (error) {
      console.error('Error fetching data sources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data sources',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
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
        description: `Data source has been ${isActive ? 'enabled' : 'disabled'}`,
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

  const runDataPipeline = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('regulatory-feeds-scraper');
      
      if (error) throw error;

      toast({
        title: 'Pipeline Complete',
        description: `Processed ${data.processed_sources} sources, found ${data.new_alerts} new alerts`,
      });
      
      // Refresh the data sources to update last_fetched_at times
      await fetchDataSources();
    } catch (error) {
      console.error('Error running data pipeline:', error);
      toast({
        title: 'Pipeline Error',
        description: 'Failed to run data pipeline',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const addDataSource = async () => {
    if (!newSource.name || !newSource.agency || !newSource.url) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('data_sources')
        .insert([newSource]);

      if (error) throw error;

      toast({
        title: 'Source Added',
        description: 'New data source has been added successfully',
      });

      setNewSource({ name: '', agency: '', source_type: 'rss', url: '' });
      setShowAddForm(false);
      await fetchDataSources();
    } catch (error) {
      console.error('Error adding data source:', error);
      toast({
        title: 'Error',
        description: 'Failed to add data source',
        variant: 'destructive'
      });
    }
  };

  const deleteDataSource = async (sourceId: string) => {
    try {
      const { error } = await supabase
        .from('data_sources')
        .delete()
        .eq('id', sourceId);

      if (error) throw error;

      setDataSources(prev => prev.filter(source => source.id !== sourceId));
      toast({
        title: 'Source Deleted',
        description: 'Data source has been removed',
      });
    } catch (error) {
      console.error('Error deleting data source:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete data source',
        variant: 'destructive'
      });
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

  const getStatusIcon = (isActive: boolean, lastFetched: string | null) => {
    if (!isActive) return <XCircle className="h-4 w-4 text-gray-400" />;
    if (!lastFetched) return <Clock className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading data pipeline...</p>
        </div>
      </div>
    );
  }

  // Group sources by agency
  const sourcesByAgency = dataSources.reduce((acc, source) => {
    if (!acc[source.agency]) acc[source.agency] = [];
    acc[source.agency].push(source);
    return acc;
  }, {} as Record<string, DataSource[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Regulatory Data Pipeline</h2>
          <p className="text-muted-foreground">
            Manage real-time data sources from regulatory agencies
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Source
          </Button>
          <Button
            onClick={runDataPipeline}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Run Pipeline
          </Button>
        </div>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Data Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={newSource.name}
                  onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., FDA Food Recalls"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Agency</label>
                <Input
                  value={newSource.agency}
                  onChange={(e) => setNewSource(prev => ({ ...prev, agency: e.target.value }))}
                  placeholder="e.g., FDA"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">URL</label>
              <Input
                value={newSource.url}
                onChange={(e) => setNewSource(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addDataSource}>Add Source</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {Object.entries(sourcesByAgency).map(([agency, sources]) => (
          <Card key={agency}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                {agency}
                <Badge variant="secondary">{sources.length} sources</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getSourceIcon(source.source_type)}
                      <div>
                        <h4 className="font-medium">{source.name}</h4>
                        <p className="text-sm text-muted-foreground">{source.url}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {source.source_type}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <div className="flex items-center gap-1">
                          {getStatusIcon(source.is_active, source.last_fetched_at)}
                          <span className="text-muted-foreground">
                            {formatLastFetched(source.last_fetched_at)}
                          </span>
                        </div>
                      </div>
                      
                      <Switch
                        checked={source.is_active}
                        onCheckedChange={(checked) => toggleSourceStatus(source.id, checked)}
                      />
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDataSource(source.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}