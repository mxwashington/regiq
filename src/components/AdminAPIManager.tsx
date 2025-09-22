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
}

export const AdminAPIManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState('');

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
      const { data, error } = await supabase
        .from('data_sources')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setDataSources(data || []);
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
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
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