/**
 * Webhook Management System - Complete implementation with retry logic
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Globe, Key, Settings, Activity, Trash2, Plus, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api/supabase-client';

interface WebhookEndpoint {
  id: string;
  user_id: string;
  name: string;
  url: string;
  secret: string;
  is_active: boolean;
  events: string[];
  retry_config: {
    max_retries: number;
    retry_delay: number;
    backoff_multiplier: number;
  };
  headers: Record<string, string>;
  timeout_seconds: number;
  last_success: string | null;
  last_failure: string | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

interface WebhookEvent {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: number;
  response_status?: number;
  error_message?: string;
  created_at: string;
  next_retry?: string;
}

const AVAILABLE_EVENTS = [
  { value: 'alert.created', label: 'Alert Created', description: 'New regulatory alert added' },
  { value: 'alert.updated', label: 'Alert Updated', description: 'Alert information changed' },
  { value: 'alert.dismissed', label: 'Alert Dismissed', description: 'Alert marked as dismissed' },
  { value: 'task.created', label: 'Task Created', description: 'New task assigned' },
  { value: 'task.completed', label: 'Task Completed', description: 'Task marked as complete' },
  { value: 'facility.alert', label: 'Facility Alert', description: 'Facility-specific alert' },
  { value: 'compliance.violation', label: 'Compliance Violation', description: 'Compliance issue detected' },
  { value: 'user.login', label: 'User Login', description: 'User authentication event' }
];

export const WebhookManager: React.FC = () => {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();

  // Form state for creating/editing webhooks
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    max_retries: 3,
    retry_delay: 1000,
    backoff_multiplier: 2,
    timeout_seconds: 30,
    headers: {} as Record<string, string>,
    custom_header_key: '',
    custom_header_value: ''
  });

  useEffect(() => {
    loadWebhooks();
    loadRecentEvents();
  }, []);

  const loadWebhooks = async () => {
    try {
      const { data, error } = await apiClient.query<WebhookEndpoint[]>('webhook_endpoints', {
        orderBy: { column: 'created_at', ascending: false }
      });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error) {
      console.error('Error loading webhooks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load webhooks',
        variant: 'destructive'
      });
    }
  };

  const loadRecentEvents = async () => {
    try {
      const { data, error } = await apiClient.query<WebhookEvent[]>('webhook_events', {
        orderBy: { column: 'created_at', ascending: false },
        limit: 50
      });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading webhook events:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async () => {
    try {
      // Generate webhook secret
      const secret = crypto.randomUUID();

      const webhookData = {
        name: formData.name,
        url: formData.url,
        secret,
        events: formData.events,
        retry_config: {
          max_retries: formData.max_retries,
          retry_delay: formData.retry_delay,
          backoff_multiplier: formData.backoff_multiplier
        },
        headers: formData.headers,
        timeout_seconds: formData.timeout_seconds,
        is_active: true
      };

      const { data, error } = await apiClient.insert<WebhookEndpoint>('webhook_endpoints', webhookData);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Webhook endpoint created successfully'
      });

      setShowCreateForm(false);
      setFormData({
        name: '',
        url: '',
        events: [],
        max_retries: 3,
        retry_delay: 1000,
        backoff_multiplier: 2,
        timeout_seconds: 30,
        headers: {},
        custom_header_key: '',
        custom_header_value: ''
      });

      await loadWebhooks();
    } catch (error) {
      console.error('Error creating webhook:', error);
      toast({
        title: 'Error',
        description: 'Failed to create webhook endpoint',
        variant: 'destructive'
      });
    }
  };

  const toggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      const { error } = await apiClient.update('webhook_endpoints', 
        { is_active: isActive },
        { id: webhookId }
      );

      if (error) throw error;

      setWebhooks(prev => prev.map(webhook =>
        webhook.id === webhookId ? { ...webhook, is_active: isActive } : webhook
      ));

      toast({
        title: 'Success',
        description: `Webhook ${isActive ? 'enabled' : 'disabled'}`
      });
    } catch (error) {
      console.error('Error toggling webhook:', error);
      toast({
        title: 'Error',
        description: 'Failed to update webhook',
        variant: 'destructive'
      });
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook? This cannot be undone.')) {
      return;
    }

    try {
      const { error } = await apiClient.delete('webhook_endpoints', { id: webhookId });

      if (error) throw error;

      setWebhooks(prev => prev.filter(webhook => webhook.id !== webhookId));

      toast({
        title: 'Success',
        description: 'Webhook endpoint deleted'
      });
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete webhook',
        variant: 'destructive'
      });
    }
  };

  const testWebhook = async (webhookId: string) => {
    try {
      const { data, error } = await apiClient.rpc('test_webhook_endpoint', {
        webhook_id: webhookId,
        test_payload: {
          event_type: 'webhook.test',
          timestamp: new Date().toISOString(),
          data: { message: 'This is a test webhook event' }
        }
      });

      if (error) throw error;

      toast({
        title: 'Test Sent',
        description: 'Test webhook event has been sent. Check the events log for results.'
      });

      // Refresh events
      await loadRecentEvents();
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: 'Error',
        description: 'Failed to test webhook',
        variant: 'destructive'
      });
    }
  };

  const addCustomHeader = () => {
    if (formData.custom_header_key && formData.custom_header_value) {
      setFormData(prev => ({
        ...prev,
        headers: {
          ...prev.headers,
          [prev.custom_header_key]: prev.custom_header_value
        },
        custom_header_key: '',
        custom_header_value: ''
      }));
    }
  };

  const removeHeader = (key: string) => {
    setFormData(prev => {
      const newHeaders = { ...prev.headers };
      delete newHeaders[key];
      return { ...prev, headers: newHeaders };
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'retrying':
        return <Badge className="bg-yellow-100 text-yellow-800">Retrying</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
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
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="create" disabled={!showCreateForm}>
            {showCreateForm ? 'Create Webhook' : 'Create'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          {webhooks.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No webhook endpoints</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first webhook endpoint to start receiving notifications
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Webhook
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {webhooks.map((webhook) => (
                <Card key={webhook.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {webhook.name}
                          {webhook.is_active ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Globe className="h-4 w-4" />
                          {webhook.url}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={webhook.is_active}
                          onCheckedChange={(checked) => toggleWebhook(webhook.id, checked)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testWebhook(webhook.id)}
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteWebhook(webhook.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Events</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Retry Configuration</Label>
                        <p className="text-sm text-muted-foreground">
                          Max: {webhook.retry_config.max_retries}, 
                          Delay: {webhook.retry_config.retry_delay}ms, 
                          Multiplier: {webhook.retry_config.backoff_multiplier}x
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Last Success</Label>
                        <p className="text-sm text-muted-foreground">
                          {webhook.last_success 
                            ? new Date(webhook.last_success).toLocaleString()
                            : 'Never'
                          }
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Failure Count</Label>
                        <p className="text-sm text-muted-foreground">
                          {webhook.failure_count} consecutive failures
                        </p>
                      </div>
                    </div>
                    
                    {webhook.failure_count > 0 && (
                      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800">
                            Recent failures detected
                          </span>
                        </div>
                        {webhook.last_failure && (
                          <p className="text-sm text-red-700 mt-1">
                            Last failure: {new Date(webhook.last_failure).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Webhook Events
              </CardTitle>
              <CardDescription>
                Latest webhook delivery attempts and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No webhook events yet
                </p>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{event.event_type}</span>
                          {getStatusBadge(event.status)}
                          <Badge variant="outline" className="text-xs">
                            Attempt {event.attempts}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.created_at).toLocaleString()}
                        </p>
                        {event.error_message && (
                          <p className="text-sm text-red-600 mt-1">
                            Error: {event.error_message}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {event.response_status && (
                          <Badge 
                            variant={event.response_status < 400 ? "outline" : "destructive"}
                            className="mb-1"
                          >
                            {event.response_status}
                          </Badge>
                        )}
                        {event.next_retry && (
                          <p className="text-xs text-muted-foreground">
                            Next retry: {new Date(event.next_retry).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {showCreateForm && (
          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Webhook Endpoint</CardTitle>
                <CardDescription>
                  Configure a new webhook endpoint to receive event notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="webhook-name">Webhook Name</Label>
                    <Input
                      id="webhook-name"
                      placeholder="e.g., Production Alerts"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhook-url">Endpoint URL</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://your-app.com/webhooks"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Events to Subscribe</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {AVAILABLE_EVENTS.map((event) => (
                      <div key={event.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={event.value}
                          checked={formData.events.includes(event.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData(prev => ({
                                ...prev,
                                events: [...prev.events, event.value]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                events: prev.events.filter(e => e !== event.value)
                              }));
                            }
                          }}
                        />
                        <div>
                          <Label htmlFor={event.value} className="text-sm font-medium">
                            {event.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {event.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="max-retries">Max Retries</Label>
                    <Input
                      id="max-retries"
                      type="number"
                      min="0"
                      max="10"
                      value={formData.max_retries}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        max_retries: parseInt(e.target.value) || 0 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="retry-delay">Retry Delay (ms)</Label>
                    <Input
                      id="retry-delay"
                      type="number"
                      min="100"
                      value={formData.retry_delay}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        retry_delay: parseInt(e.target.value) || 1000 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeout">Timeout (seconds)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      min="5"
                      max="300"
                      value={formData.timeout_seconds}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        timeout_seconds: parseInt(e.target.value) || 30 
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Custom Headers</Label>
                  <div className="space-y-2 mt-2">
                    {Object.entries(formData.headers).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Input value={key} disabled className="flex-1" />
                        <Input value={value} disabled className="flex-1" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeHeader(key)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Header name"
                        value={formData.custom_header_key}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          custom_header_key: e.target.value 
                        }))}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Header value"
                        value={formData.custom_header_value}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          custom_header_value: e.target.value 
                        }))}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={addCustomHeader}
                        disabled={!formData.custom_header_key || !formData.custom_header_value}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={createWebhook}
                    disabled={!formData.name || !formData.url || formData.events.length === 0}
                  >
                    Create Webhook
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};