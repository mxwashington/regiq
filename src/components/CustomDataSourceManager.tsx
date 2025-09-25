import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Settings, Play, Trash2, RefreshCw, Database, Rss, Mail, Webhook, Globe } from 'lucide-react';
import { logger } from '@/lib/logger';

interface DataSource {
  id: string;
  name: string;
  description: string;
  source_type: string;
  configuration: any;
  auth_config: any;
  is_active: boolean;
  last_synced_at: string;
  status: string;
  created_at: string;
}

interface IngestionLog {
  id: string;
  records_processed: number;
  records_imported: number;
  records_skipped: number;
  errors_count: number;
  status: string;
  created_at: string;
  completed_at: string;
}

export const CustomDataSourceManager: React.FC = () => {
  const { user } = useAuth();
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [ingestionLogs, setIngestionLogs] = useState<IngestionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [newSource, setNewSource] = useState({
    name: '',
    description: '',
    source_type: 'api',
    configuration: {},
    auth_config: {}
  });

  useEffect(() => {
    if (user) {
      loadDataSources();
      loadIngestionLogs();
    }
  }, [user]);

  const loadDataSources = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('custom-data-sources', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setDataSources(data.data_sources || []);
    } catch (error) {
      logger.error('Error loading data sources', error, 'CustomDataSourceManager');
      toast.error('Failed to load data sources');
    } finally {
      setLoading(false);
    }
  };

  const loadIngestionLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_data_ingestion_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setIngestionLogs(data || []);
    } catch (error) {
      logger.error('Error loading ingestion logs', error, 'CustomDataSourceManager');
    }
  };

  const createDataSource = async () => {
    if (!newSource.name || !newSource.source_type) {
      toast.error('Name and source type are required');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('custom-data-sources', {
        body: {
          action: 'create',
          ...newSource
        }
      });

      if (error) throw error;

      toast.success('Data source created successfully');
      setShowCreateDialog(false);
      setNewSource({
        name: '',
        description: '',
        source_type: 'api',
        configuration: {},
        auth_config: {}
      });
      loadDataSources();
    } catch (error) {
      logger.error('Error creating data source', error, 'CustomDataSourceManager');
      toast.error('Failed to create data source');
    } finally {
      setCreating(false);
    }
  };

  const syncDataSource = async (id: string) => {
    setSyncing(id);
    try {
      const { data, error } = await supabase.functions.invoke('custom-data-sources', {
        body: {
          action: 'sync',
          id
        }
      });

      if (error) throw error;

      toast.success(`Sync completed: ${data.results.imported} records imported`);
      loadDataSources();
      loadIngestionLogs();
    } catch (error) {
      logger.error('Error syncing data source', error, 'CustomDataSourceManager');
      toast.error('Failed to sync data source');
    } finally {
      setSyncing(null);
    }
  };

  const deleteDataSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this data source?')) return;

    try {
      const { error } = await supabase.functions.invoke('custom-data-sources', {
        body: {
          action: 'delete',
          id
        }
      });

      if (error) throw error;

      toast.success('Data source deleted successfully');
      loadDataSources();
    } catch (error) {
      logger.error('Error deleting data source', error, 'CustomDataSourceManager');
      toast.error('Failed to delete data source');
    }
  };

  const testDataSource = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('custom-data-sources', {
        body: {
          action: 'test',
          ...newSource
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Connection test successful');
      } else {
        toast.error(`Connection test failed: ${data.error}`);
      }
    } catch (error) {
      logger.error('Error testing data source', error, 'CustomDataSourceManager');
      toast.error('Connection test failed');
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'api': return <Database className="h-4 w-4" />;
      case 'rss': return <Rss className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'webhook': return <Webhook className="h-4 w-4" />;
      case 'scraper': return <Globe className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'disabled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Custom Data Sources</h2>
          <p className="text-muted-foreground">
            Connect and manage external data sources for regulatory monitoring
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Data Source
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Custom Data Source</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="config">Configuration</TabsTrigger>
                <TabsTrigger value="auth">Authentication</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newSource.name}
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                    placeholder="My Data Source"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newSource.description}
                    onChange={(e) => setNewSource({ ...newSource, description: e.target.value })}
                    placeholder="Description of the data source..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="source_type">Source Type</Label>
                  <Select
                    value={newSource.source_type}
                    onValueChange={(value) => setNewSource({ ...newSource, source_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api">REST API</SelectItem>
                      <SelectItem value="rss">RSS Feed</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                      <SelectItem value="scraper">Web Scraper</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              
              <TabsContent value="config" className="space-y-4">
                {newSource.source_type === 'api' && (
                  <>
                    <div className="space-y-2">
                      <Label>API Endpoint URL</Label>
                      <Input
                        value={(newSource.configuration as any).endpoint_url || ''}
                        onChange={(e) => setNewSource({
                          ...newSource,
                          configuration: { ...newSource.configuration, endpoint_url: e.target.value }
                        })}
                        placeholder="https://api.example.com/data"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>HTTP Method</Label>
                      <Select
                        value={(newSource.configuration as any).method || 'GET'}
                        onValueChange={(value) => setNewSource({
                          ...newSource,
                          configuration: { ...newSource.configuration, method: value }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                {newSource.source_type === 'rss' && (
                  <div className="space-y-2">
                    <Label>RSS Feed URL</Label>
                    <Input
                      value={(newSource.configuration as any).feed_url || ''}
                      onChange={(e) => setNewSource({
                        ...newSource,
                        configuration: { ...newSource.configuration, feed_url: e.target.value }
                      })}
                      placeholder="https://example.com/feed.xml"
                    />
                  </div>
                )}
                
                {newSource.source_type === 'scraper' && (
                  <>
                    <div className="space-y-2">
                      <Label>Target URL</Label>
                      <Input
                        value={(newSource.configuration as any).target_url || ''}
                        onChange={(e) => setNewSource({
                          ...newSource,
                          configuration: { ...newSource.configuration, target_url: e.target.value }
                        })}
                        placeholder="https://example.com/page"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CSS Selectors (JSON)</Label>
                      <Textarea
                        value={JSON.stringify((newSource.configuration as any).selectors || {}, null, 2)}
                        onChange={(e) => {
                          try {
                            const selectors = JSON.parse(e.target.value);
                            setNewSource({
                              ...newSource,
                              configuration: { ...newSource.configuration, selectors }
                            });
                          } catch {} // Ignore invalid JSON while typing
                        }}
                        placeholder='{"title": ".title", "content": ".content"}'
                      />
                    </div>
                  </>
                )}
              </TabsContent>
              
              <TabsContent value="auth" className="space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={(newSource.auth_config as any).api_key || ''}
                    onChange={(e) => setNewSource({
                      ...newSource,
                      auth_config: { ...newSource.auth_config, api_key: e.target.value }
                    })}
                    placeholder="Your API key (optional)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Custom Headers (JSON)</Label>
                  <Textarea
                    value={JSON.stringify((newSource.auth_config as any).custom_headers || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const headers = JSON.parse(e.target.value);
                        setNewSource({
                          ...newSource,
                          auth_config: { ...newSource.auth_config, custom_headers: headers }
                        });
                      } catch {} // Ignore invalid JSON while typing
                    }}
                    placeholder='{"Authorization": "Bearer token", "X-API-Key": "key"}'
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={testDataSource}>
                <Play className="h-4 w-4 mr-2" />
                Test Connection
              </Button>
              <div className="space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createDataSource} disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dataSources.map((source) => (
          <Card key={source.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center space-x-2">
                {getSourceIcon(source.source_type)}
                <CardTitle className="text-sm font-medium">{source.name}</CardTitle>
              </div>
              <Badge className={getStatusColor(source.status)}>
                {source.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {source.description || 'No description'}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Type: {source.source_type}</span>
                  <span>
                    Last sync: {source.last_synced_at 
                      ? new Date(source.last_synced_at).toLocaleDateString()
                      : 'Never'
                    }
                  </span>
                </div>
                <div className="flex space-x-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => syncDataSource(source.id)}
                    disabled={syncing === source.id}
                  >
                    {syncing === source.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteDataSource(source.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {ingestionLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Ingestion Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ingestionLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center space-x-4">
                    <Badge className={getStatusColor(log.status)}>
                      {log.status}
                    </Badge>
                    <span className="text-sm">
                      {log.records_imported}/{log.records_processed} records
                    </span>
                    {log.errors_count > 0 && (
                      <span className="text-sm text-red-600">
                        {log.errors_count} errors
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};