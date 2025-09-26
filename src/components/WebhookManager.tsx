import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Plus, 
  Settings, 
  Play, 
  Trash2, 
  RefreshCw, 
  Webhook, 
  Copy, 
  CheckCircle, 
  XCircle, 
  Clock,
  ExternalLink
} from 'lucide-react';

import { logger } from '@/lib/logger';
interface WebhookEndpoint {
  id: string;
  name: string;
  description: string;
  endpoint_url: string;
  secret_token: string;
  is_active: boolean;
  events: string[];
  headers: any;
  retry_config: any;
  created_at: string;
  delivery_stats?: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
  };
}

interface WebhookDelivery {
  id: string;
  event_type: string;
  payload: any;
  response_status: number;
  response_body: string;
  delivery_attempts: number;
  status: string;
  created_at: string;
  delivered_at: string;
}

export const WebhookManager: React.FC = () => {
  const { user } = useAuth();
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);

  const [newWebhook, setNewWebhook] = useState({
    name: '',
    description: '',
    endpoint_url: '',
    events: [] as string[],
    headers: {}
  });

  const availableEvents = [
    'alert.created',
    'alert.updated',
    'alert.dismissed',
    'compliance.violation',
    'risk.assessment',
    'workflow.completed',
    'data.ingested',
    'user.subscribed',
    'user.trial_ended'
  ];

  useEffect(() => {
    if (user) {
      loadWebhooks();
      loadDeliveries();
    }
  }, [user]);

  const loadWebhooks = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('webhook-manager', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setWebhooks(data.webhook_endpoints || []);
    } catch (error) {
      logger.error('Error loading webhooks:', error);
      toast.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveries = async (webhookId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('webhook-manager', {
        body: { 
          action: 'deliveries',
          webhook_id: webhookId 
        }
      });

      if (error) throw error;
      setDeliveries(data.deliveries || []);
    } catch (error) {
      logger.error('Error loading deliveries:', error);
    }
  };

  const createWebhook = async () => {
    if (!newWebhook.name || !newWebhook.endpoint_url) {
      toast.error('Name and endpoint URL are required');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('webhook-manager', {
        body: {
          action: 'create',
          ...newWebhook
        }
      });

      if (error) throw error;

      toast.success('Webhook endpoint created successfully');
      setShowCreateDialog(false);
      setNewWebhook({
        name: '',
        description: '',
        endpoint_url: '',
        events: [],
        headers: {}
      });
      loadWebhooks();
    } catch (error) {
      logger.error('Error creating webhook:', error);
      toast.error('Failed to create webhook endpoint');
    } finally {
      setCreating(false);
    }
  };

  const testWebhook = async (id: string) => {
    setTesting(id);
    try {
      const { data, error } = await supabase.functions.invoke('webhook-manager', {
        body: {
          action: 'test',
          id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Test webhook delivered successfully');
      } else {
        toast.error(`Test webhook failed: ${data.response_status}`);
      }
      
      loadDeliveries();
    } catch (error) {
      logger.error('Error testing webhook:', error);
      toast.error('Failed to test webhook');
    } finally {
      setTesting(null);
    }
  };

  const deleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook endpoint?')) return;

    try {
      const { error } = await supabase.functions.invoke('webhook-manager', {
        body: {
          action: 'delete',
          id
        }
      });

      if (error) throw error;

      toast.success('Webhook endpoint deleted successfully');
      loadWebhooks();
    } catch (error) {
      logger.error('Error deleting webhook:', error);
      toast.error('Failed to delete webhook endpoint');
    }
  };

  const copySecretToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      toast.success('Secret token copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy secret token');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'retrying': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'retrying': return 'bg-blue-100 text-blue-800';
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
          <h2 className="text-2xl font-bold">Webhook Management</h2>
          <p className="text-muted-foreground">
            Configure webhook endpoints to receive real-time notifications
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Webhook Endpoint</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="headers">Headers</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                    placeholder="My Webhook Endpoint"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newWebhook.description}
                    onChange={(e) => setNewWebhook({ ...newWebhook, description: e.target.value })}
                    placeholder="Description of the webhook endpoint..."
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="endpoint_url">Endpoint URL</Label>
                  <Input
                    id="endpoint_url"
                    value={newWebhook.endpoint_url}
                    onChange={(e) => setNewWebhook({ ...newWebhook, endpoint_url: e.target.value })}
                    placeholder="https://your-app.com/webhooks/regiq"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="events" className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Events to Listen For</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose which events should trigger this webhook. Leave empty to receive all events.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {availableEvents.map((event) => (
                      <div key={event} className="flex items-center space-x-2">
                        <Checkbox
                          id={event}
                          checked={newWebhook.events.includes(event)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewWebhook({
                                ...newWebhook,
                                events: [...newWebhook.events, event]
                              });
                            } else {
                              setNewWebhook({
                                ...newWebhook,
                                events: newWebhook.events.filter(e => e !== event)
                              });
                            }
                          }}
                        />
                        <Label htmlFor={event} className="text-sm">
                          {event}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="headers" className="space-y-4">
                <div className="space-y-2">
                  <Label>Custom Headers (JSON)</Label>
                  <p className="text-sm text-muted-foreground">
                    Additional headers to include with webhook requests
                  </p>
                  <Textarea
                    value={JSON.stringify(newWebhook.headers, null, 2)}
                    onChange={(e) => {
                      try {
                        const headers = JSON.parse(e.target.value);
                        setNewWebhook({ ...newWebhook, headers });
                      } catch {} // Ignore invalid JSON while typing
                    }}
                    placeholder='{"Authorization": "Bearer token", "X-Custom-Header": "value"}'
                  />
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createWebhook} disabled={creating}>
                {creating ? 'Creating...' : 'Create Webhook'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {webhooks.map((webhook) => (
          <Card key={webhook.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Webhook className="h-5 w-5" />
                  <CardTitle>{webhook.name}</CardTitle>
                  <Badge variant={webhook.is_active ? "default" : "secondary"}>
                    {webhook.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testWebhook(webhook.id)}
                    disabled={testing === webhook.id}
                  >
                    {testing === webhook.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteWebhook(webhook.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {webhook.description || 'No description'}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <ExternalLink className="h-3 w-3" />
                    <span className="text-xs font-mono">{webhook.endpoint_url}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">Secret Token:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {webhook.secret_token.substring(0, 8)}...
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copySecretToken(webhook.secret_token)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">Events: </span>
                  {webhook.events.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">All events</span>
                  )}
                </div>

                {webhook.delivery_stats && (
                  <div className="grid grid-cols-4 gap-4 pt-2 border-t">
                    <div className="text-center">
                      <div className="text-lg font-semibold">{webhook.delivery_stats.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-600">{webhook.delivery_stats.delivered}</div>
                      <div className="text-xs text-muted-foreground">Delivered</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-red-600">{webhook.delivery_stats.failed}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-yellow-600">{webhook.delivery_stats.pending}</div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedWebhook(webhook.id);
                    loadDeliveries(webhook.id);
                  }}
                >
                  View Delivery History
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {deliveries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Recent Deliveries {selectedWebhook && '(Filtered)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deliveries.map((delivery) => (
                <div key={delivery.id} className="flex items-center justify-between p-3 bg-muted rounded">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(delivery.status)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(delivery.status)}>
                          {delivery.status}
                        </Badge>
                        <span className="text-sm font-medium">{delivery.event_type}</span>
                        {delivery.response_status && (
                          <span className="text-xs text-muted-foreground">
                            HTTP {delivery.response_status}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Attempts: {delivery.delivery_attempts}
                        {delivery.delivered_at && (
                          <span> • Delivered: {new Date(delivery.delivered_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(delivery.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            {selectedWebhook && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSelectedWebhook(null);
                  loadDeliveries();
                }}
              >
                Show All Deliveries
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};