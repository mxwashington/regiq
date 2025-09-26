import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Shield, Users, CheckCircle, AlertCircle } from 'lucide-react';

import { logger } from '@/lib/logger';
interface SSOProvider {
  id: string;
  name: string;
  enabled: boolean;
  clientId?: string;
  tenantId?: string;
  domain?: string;
}

export const SSOConfiguration: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ssoProviders, setSSOProviders] = useState<SSOProvider[]>([
    {
      id: 'google',
      name: 'Google Workspace',
      enabled: false,
      clientId: '',
      domain: ''
    },
    {
      id: 'microsoft',
      name: 'Microsoft Azure AD',
      enabled: false,
      clientId: '',
      tenantId: ''
    },
    {
      id: 'okta',
      name: 'Okta',
      enabled: false,
      domain: ''
    }
  ]);

  const [globalSettings, setGlobalSettings] = useState({
    ssoRequired: false,
    autoProvisionUsers: true,
    defaultRole: 'user',
    sessionTimeout: 8
  });

  useEffect(() => {
    loadSSOConfiguration();
  }, []);

  const loadSSOConfiguration = async () => {
    try {
      setLoading(true);
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['sso_providers', 'sso_global_settings']);

      if (error) throw error;

      const providersData = settings?.find(s => s.setting_key === 'sso_providers');
      const globalData = settings?.find(s => s.setting_key === 'sso_global_settings');

      if (providersData?.setting_value) {
        setSSOProviders(providersData.setting_value as unknown as SSOProvider[]);
      }

      if (globalData?.setting_value) {
        setGlobalSettings(globalData.setting_value as unknown as typeof globalSettings);
      }
    } catch (error) {
      logger.error('Error loading SSO configuration:', error);
      toast({
        title: "Error",
        description: "Failed to load SSO configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProvider = (providerId: string, updates: Partial<SSOProvider>) => {
    setSSOProviders(prev => 
      prev.map(provider => 
        provider.id === providerId 
          ? { ...provider, ...updates }
          : provider
      )
    );
  };

  const saveSSOConfiguration = async () => {
    try {
      setLoading(true);

      // Save SSO providers configuration
      const { error: providersError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'sso_providers',
          setting_value: ssoProviders as any,
          description: 'SSO provider configurations'
        });

      if (providersError) throw providersError;

      // Save global SSO settings
      const { error: globalError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'sso_global_settings',
          setting_value: globalSettings as any,
          description: 'Global SSO configuration settings'
        });

      if (globalError) throw globalError;

      toast({
        title: "Success",
        description: "SSO configuration saved successfully",
      });
    } catch (error) {
      logger.error('Error saving SSO configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save SSO configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testSSOConnection = async (providerId: string) => {
    try {
      setLoading(true);
      
      // Call edge function to test SSO connection
      const { data, error } = await supabase.functions.invoke('test-sso-connection', {
        body: { providerId, config: ssoProviders.find(p => p.id === providerId) }
      });

      if (error) throw error;

      toast({
        title: "Connection Test",
        description: data.success ? "SSO connection successful" : "SSO connection failed",
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      logger.error('Error testing SSO connection:', error);
      toast({
        title: "Test Failed",
        description: "Unable to test SSO connection",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Single Sign-On Configuration
          </CardTitle>
          <CardDescription>
            Configure SSO providers for enterprise authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global SSO Settings */}
          <div>
            <h3 className="text-lg font-medium mb-4">Global Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require SSO Authentication</Label>
                  <p className="text-sm text-muted-foreground">Force all users to authenticate via SSO</p>
                </div>
                <Switch
                  checked={globalSettings.ssoRequired}
                  onCheckedChange={(checked) => 
                    setGlobalSettings(prev => ({ ...prev, ssoRequired: checked }))
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-provision Users</Label>
                  <p className="text-sm text-muted-foreground">Automatically create accounts for new SSO users</p>
                </div>
                <Switch
                  checked={globalSettings.autoProvisionUsers}
                  onCheckedChange={(checked) => 
                    setGlobalSettings(prev => ({ ...prev, autoProvisionUsers: checked }))
                  }
                />
              </div>
              
              <div>
                <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={globalSettings.sessionTimeout}
                  onChange={(e) => 
                    setGlobalSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))
                  }
                  min="1"
                  max="24"
                />
              </div>
              
              <div>
                <Label htmlFor="defaultRole">Default Role for New Users</Label>
                <Input
                  id="defaultRole"
                  value={globalSettings.defaultRole}
                  onChange={(e) => 
                    setGlobalSettings(prev => ({ ...prev, defaultRole: e.target.value }))
                  }
                  placeholder="user"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* SSO Providers */}
          <div>
            <h3 className="text-lg font-medium mb-4">SSO Providers</h3>
            <div className="space-y-4">
              {ssoProviders.map((provider) => (
                <Card key={provider.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium">{provider.name}</h4>
                      <Badge variant={provider.enabled ? "default" : "secondary"}>
                        {provider.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={provider.enabled}
                        onCheckedChange={(checked) => 
                          updateProvider(provider.id, { enabled: checked })
                        }
                      />
                      {provider.enabled && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testSSOConnection(provider.id)}
                          disabled={loading}
                        >
                          Test Connection
                        </Button>
                      )}
                    </div>
                  </div>

                  {provider.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {provider.id === 'google' && (
                        <>
                          <div>
                            <Label>Client ID</Label>
                            <Input
                              value={provider.clientId || ''}
                              onChange={(e) => 
                                updateProvider(provider.id, { clientId: e.target.value })
                              }
                              placeholder="Google OAuth Client ID"
                            />
                          </div>
                          <div>
                            <Label>Domain</Label>
                            <Input
                              value={provider.domain || ''}
                              onChange={(e) => 
                                updateProvider(provider.id, { domain: e.target.value })
                              }
                              placeholder="company.com"
                            />
                          </div>
                        </>
                      )}

                      {provider.id === 'microsoft' && (
                        <>
                          <div>
                            <Label>Client ID</Label>
                            <Input
                              value={provider.clientId || ''}
                              onChange={(e) => 
                                updateProvider(provider.id, { clientId: e.target.value })
                              }
                              placeholder="Azure AD Application ID"
                            />
                          </div>
                          <div>
                            <Label>Tenant ID</Label>
                            <Input
                              value={provider.tenantId || ''}
                              onChange={(e) => 
                                updateProvider(provider.id, { tenantId: e.target.value })
                              }
                              placeholder="Azure AD Tenant ID"
                            />
                          </div>
                        </>
                      )}

                      {provider.id === 'okta' && (
                        <div>
                          <Label>Okta Domain</Label>
                          <Input
                            value={provider.domain || ''}
                            onChange={(e) => 
                              updateProvider(provider.id, { domain: e.target.value })
                            }
                            placeholder="company.okta.com"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveSSOConfiguration} disabled={loading}>
              {loading ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};