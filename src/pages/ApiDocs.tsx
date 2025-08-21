import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Key, RefreshCw, Shield, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  key_name: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
  usage_count: number;
  rate_limit_per_hour: number;
}

const ApiDocs = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    checkSubscription();
    fetchApiKeys();
  }, [user]);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      
      setSubscription(data);
      if (!data.subscribed || data.subscription_tier !== 'enterprise') {
        navigate('/pricing');
        return;
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      navigate('/pricing');
    }
  };

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-api-keys');
      if (error) throw error;
      
      setApiKeys(data.api_keys || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-api-keys', {
        body: { key_name: 'Enterprise API Key' }
      });
      if (error) throw error;
      
      setNewApiKey(data.api_key);
      setShowApiKey(true);
      await fetchApiKeys();
      toast.success('API key generated successfully');
    } catch (error) {
      console.error('Error generating API key:', error);
      toast.error('Failed to generate API key');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!subscription?.subscribed || subscription.subscription_tier !== 'enterprise') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Enterprise Required</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4">API access requires an Enterprise subscription.</p>
            <Button onClick={() => navigate('/pricing')}>
              Upgrade to Enterprise
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">RegIQ API Documentation</h1>
          <p className="text-muted-foreground">Enterprise API access for regulatory data integration</p>
          <Badge variant="secondary" className="mt-2">
            <Shield className="w-4 h-4 mr-2" />
            Enterprise Access
          </Badge>
        </div>

        {/* API Key Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              API Key Management
            </CardTitle>
            <CardDescription>
              Manage your API keys for secure access to RegIQ's regulatory data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {newApiKey && showApiKey && (
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription className="space-y-3">
                  <div>
                    <p className="font-medium mb-2">Your new API key (save this securely):</p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newApiKey}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(newApiKey)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowApiKey(false)}
                      >
                        <EyeOff className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This key will only be shown once. Store it securely.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Active API Keys</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchApiKeys}
                  disabled={loading}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  onClick={generateApiKey}
                  disabled={generating}
                >
                  {generating ? 'Generating...' : 'Generate API Key'}
                </Button>
              </div>
            </div>

            {apiKeys.length > 0 ? (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{key.key_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Created: {formatDate(key.created_at)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Last used: {formatDate(key.last_used_at)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Usage: {key.usage_count} requests
                        </p>
                      </div>
                      <Badge variant={key.is_active ? 'default' : 'secondary'}>
                        {key.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No API keys found. Generate your first API key to get started.
              </p>
            )}
          </CardContent>
        </Card>

        {/* API Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>API Endpoints</CardTitle>
            <CardDescription>
              Available endpoints for accessing regulatory data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Base URL */}
            <div>
              <h3 className="font-semibold mb-2">Base URL</h3>
              <div className="bg-muted p-3 rounded-md font-mono text-sm">
                https://piyikxxgoekawboitrzz.supabase.co/functions/v1/public-api
              </div>
            </div>

            {/* Authentication */}
            <div>
              <h3 className="font-semibold mb-2">Authentication</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Include your API key in the request header:
              </p>
              <div className="bg-muted p-3 rounded-md font-mono text-sm">
                x-api-key: YOUR_API_KEY_HERE
              </div>
            </div>

            {/* Endpoints */}
            <div className="space-y-4">
              <h3 className="font-semibold">Available Endpoints</h3>
              
              {/* Get Alerts */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-green-600 mb-2">GET /alerts</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Retrieve regulatory alerts with optional filtering
                </p>
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Query Parameters:</h5>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>limit</code> - Number of results (1-100, default: 25)</li>
                    <li><code>source</code> - Filter by source (FDA,USDA,EPA)</li>
                    <li><code>since</code> - Days back to search (default: 0)</li>
                    <li><code>q</code> - Search query in title/summary</li>
                  </ul>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm mt-3">
                    GET /alerts?limit=25&source=FDA,USDA&since=7
                  </div>
                </div>
              </div>

              {/* Get Alert by ID */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-green-600 mb-2">GET /alerts/:id</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Get a specific alert by UUID
                </p>
                <div className="bg-muted p-3 rounded-md font-mono text-sm">
                  GET /alerts/123e4567-e89b-12d3-a456-426614174000
                </div>
              </div>

              {/* Search */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium text-green-600 mb-2">GET /search</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Search alerts by keyword
                </p>
                <div className="space-y-2">
                  <h5 className="font-medium text-sm">Query Parameters:</h5>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li><code>q</code> - Search query (required)</li>
                    <li><code>limit</code> - Number of results (1-100, default: 25)</li>
                  </ul>
                  <div className="bg-muted p-3 rounded-md font-mono text-sm mt-3">
                    GET /search?q=recall&limit=25
                  </div>
                </div>
              </div>
            </div>

            {/* Response Format */}
            <div>
              <h3 className="font-semibold mb-2">Response Format</h3>
              <div className="bg-muted p-3 rounded-md font-mono text-sm whitespace-pre">
{`{
  "data": [
    {
      "id": "uuid",
      "title": "Alert title",
      "summary": "AI-generated summary",
      "source": "FDA",
      "urgency": "High",
      "published_date": "2024-01-01T00:00:00Z",
      "external_url": "https://...",
      "agency": "FDA",
      "region": "US"
    }
  ]
}`}
              </div>
            </div>

            {/* Rate Limits */}
            <div>
              <h3 className="font-semibold mb-2">Rate Limits</h3>
              <p className="text-sm text-muted-foreground">
                Enterprise accounts have a default rate limit of 1,000 requests per hour. 
                Contact support if you need higher limits.
              </p>
            </div>

            {/* Error Codes */}
            <div>
              <h3 className="font-semibold mb-2">Error Codes</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <code>401 Unauthorized</code>
                  <span className="text-muted-foreground">Invalid or missing API key</span>
                </div>
                <div className="flex justify-between">
                  <code>403 Forbidden</code>
                  <span className="text-muted-foreground">Subscription required or expired</span>
                </div>
                <div className="flex justify-between">
                  <code>429 Too Many Requests</code>
                  <span className="text-muted-foreground">Rate limit exceeded</span>
                </div>
                <div className="flex justify-between">
                  <code>500 Internal Server Error</code>
                  <span className="text-muted-foreground">Server error</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle>Support</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Need help with the API? Our enterprise support team is here to help.
            </p>
            <Button variant="outline">
              Contact Enterprise Support
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default ApiDocs;