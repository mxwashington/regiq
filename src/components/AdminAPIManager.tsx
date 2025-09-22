import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Key, 
  Database, 
  Activity, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff,
  RefreshCw,
  Settings,
  AlertCircle
} from 'lucide-react';

interface APIKey {
  id: string;
  key_name: string;
  api_key: string;
  created_at: string;
  last_used_at: string | null;
  usage_count: number;
  is_active: boolean;
  key_prefix: string;
  expires_at: string;
}

interface DataSource {
  id: string;
  name: string;
  source_type: string;
  url: string;
  is_active: boolean;
  last_fetched_at: string | null;
  fetch_interval: number;
  agency: string;
  source_table?: string;
}

export const AdminAPIManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ total: number; completed: number; errors: string[] }>({
    total: 0,
    completed: 0,
    errors: []
  });

  useEffect(() => {
    fetchAPIKeys();
    fetchDataSources();
  }, []);

  const fetchAPIKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to fetch API keys');
    }
  };

  const fetchDataSources = async () => {
    try {
      // Fetch from all data source tables
      const [dataSourcesResult, regulatorySourcesResult, customSourcesResult] = await Promise.all([
        supabase.from('data_sources').select('*'),
        supabase.from('regulatory_data_sources').select('*'),
        supabase.from('custom_data_sources').select('*')
      ]);

      const allSources: DataSource[] = [];

      // Combine data from all tables
      if (dataSourcesResult.data) {
        allSources.push(...dataSourcesResult.data.map(source => ({
          ...source,
          source_table: 'data_sources'
        })));
      }

      if (regulatorySourcesResult.data) {
        allSources.push(...regulatorySourcesResult.data.map(source => ({
          id: source.id || crypto.randomUUID(),
          name: source.name,
          source_type: source.source_type,
          url: source.base_url || 'N/A',
          is_active: source.is_active,
          last_fetched_at: source.last_successful_fetch,
          fetch_interval: source.polling_interval_minutes ? source.polling_interval_minutes * 60 : 3600,
          agency: source.agency,
          source_table: 'regulatory_data_sources'
        })));
      }

      if (customSourcesResult.data) {
        allSources.push(...customSourcesResult.data.map(source => ({
          id: source.id,
          name: source.name,
          source_type: source.source_type,
          url: (source.configuration as any)?.url || 'Custom Source',
          is_active: source.is_active,
          last_fetched_at: source.last_synced_at,
          fetch_interval: source.sync_frequency || 3600,
          agency: (source.configuration as any)?.agency || 'Custom',
          source_table: 'custom_data_sources'
        })));
      }

      // Sort by name
      allSources.sort((a, b) => a.name.localeCompare(b.name));
      setDataSources(allSources);
    } catch (error) {
      console.error('Error fetching data sources:', error);
      toast.error('Failed to fetch data sources');
    } finally {
      setLoading(false);
    }
  };

  const generateAPIKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-api-keys', {
        body: { action: 'create', name: newKeyName }
      });

      if (error) throw error;

      toast.success('API key created successfully');
      setNewKeyName('');
      fetchAPIKeys();
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Failed to create API key');
    }
  };

  const revokeAPIKey = async (keyId: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-api-keys', {
        body: { action: 'revoke', keyId }
      });

      if (error) throw error;

      toast.success('API key revoked successfully');
      fetchAPIKeys();
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast.error('Failed to revoke API key');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const syncDataSource = async (sourceId: string) => {
    try {
      const { error } = await supabase.functions.invoke('regulatory-data-pipeline', {
        body: { sourceId, force: true }
      });

      if (error) throw error;

      toast.success('Data source sync initiated');
      fetchDataSources();
    } catch (error) {
      console.error('Error syncing data source:', error);
      toast.error('Failed to sync data source');
    }
  };

  const syncAllDataSources = async () => {
    const activeSources = dataSources.filter(source => source.is_active);
    if (activeSources.length === 0) {
      toast.error('No active data sources to sync');
      return;
    }

    setSyncing(true);
    setSyncProgress({ total: activeSources.length, completed: 0, errors: [] });

    const syncPromises = activeSources.map(async (source) => {
      try {
        // Call appropriate sync function based on source table
        let functionName = 'regulatory-data-pipeline';
        let body: any = { sourceId: source.id, force: true };

        if (source.source_table === 'regulatory_data_sources') {
          functionName = 'enhanced-regulatory-data-pipeline';
        } else if (source.source_table === 'custom_data_sources') {
          functionName = 'custom-data-sources';
          body = { action: 'sync', sourceId: source.id };
        }

        const { error } = await supabase.functions.invoke(functionName, { body });

        if (error) throw error;

        setSyncProgress(prev => ({ 
          ...prev, 
          completed: prev.completed + 1 
        }));

        return { source: source.name, success: true };
      } catch (error) {
        const errorMsg = `${source.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        setSyncProgress(prev => ({ 
          ...prev, 
          completed: prev.completed + 1,
          errors: [...prev.errors, errorMsg]
        }));

        return { source: source.name, success: false, error: errorMsg };
      }
    });

    try {
      const results = await Promise.allSettled(syncPromises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      if (failed === 0) {
        toast.success(`Successfully initiated sync for all ${successful} data sources`);
      } else {
        toast.success(`Initiated sync for ${successful} sources, ${failed} failed`);
      }

      // Refresh the data sources list
      setTimeout(() => fetchDataSources(), 2000);
    } catch (error) {
      console.error('Error in sync all operation:', error);
      toast.error('Failed to sync all data sources');
    } finally {
      setSyncing(false);
      // Clear progress after a delay
      setTimeout(() => {
        setSyncProgress({ total: 0, completed: 0, errors: [] });
      }, 5000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys.filter(k => k.is_active).length}</div>
            <p className="text-xs text-muted-foreground">
              {apiKeys.length} total keys
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataSources.filter(s => s.is_active).length}</div>
            <p className="text-xs text-muted-foreground">
              {dataSources.length} total sources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">98.5%</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Management */}
      <Tabs defaultValue="keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New API Key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="Enter API key name"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={generateAPIKey}>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Key
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Manage API Keys</CardTitle>
            </CardHeader>
            <CardContent>
              {syncProgress.errors.length > 0 && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">Sync Errors</span>
                  </div>
                  <div className="space-y-1">
                    {syncProgress.errors.map((error, index) => (
                      <p key={index} className="text-xs text-muted-foreground">{error}</p>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {apiKeys.map(key => (
                  <div key={key.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{key.key_name}</h3>
                        <Badge variant={key.is_active ? "default" : "secondary"}>
                          {key.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {showKeys[key.id] ? key.api_key : key.key_prefix + '...'}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleKeyVisibility(key.id)}
                        >
                          {showKeys[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(key.created_at).toLocaleDateString()} • 
                        Used: {key.usage_count} times
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => revokeAPIKey(key.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {apiKeys.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No API keys found. Create one above to get started.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Data Sources</CardTitle>
              <div className="flex items-center gap-2">
                {syncing && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    {syncProgress.completed}/{syncProgress.total} synced
                  </div>
                )}
                <Button
                  onClick={syncAllDataSources}
                  disabled={syncing || dataSources.filter(s => s.is_active).length === 0}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  Sync All Sources
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataSources.map(source => (
                  <div key={source.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{source.name}</h3>
                        <Badge 
                          variant={source.is_active ? "default" : "secondary"}
                        >
                          {source.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{source.source_type}</Badge>
                        {source.source_table && (
                          <Badge variant="secondary" className="text-xs">
                            {source.source_table.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{source.url}</p>
                      <p className="text-sm text-muted-foreground">
                        Last sync: {source.last_fetched_at ? new Date(source.last_fetched_at).toLocaleString() : 'Never'} • 
                        Agency: {source.agency}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => syncDataSource(source.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {dataSources.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No data sources configured.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Rate Limiting</h3>
                  <p className="text-sm text-muted-foreground">Configure API rate limits</p>
                </div>
                <Badge variant="outline">1000/hour</Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Cache TTL</h3>
                  <p className="text-sm text-muted-foreground">API response cache duration</p>
                </div>
                <Badge variant="outline">5 minutes</Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Webhook Timeout</h3>
                  <p className="text-sm text-muted-foreground">Maximum webhook response time</p>
                </div>
                <Badge variant="outline">30 seconds</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};