import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Chrome, Users } from 'lucide-react';

interface SSOProvider {
  id: string;
  name: string;
  enabled: boolean;
  clientId?: string;
  tenantId?: string;
  domain?: string;
}

interface SSOLoginButtonsProps {
  onSuccess?: () => void;
  className?: string;
}

export const SSOLoginButtons: React.FC<SSOLoginButtonsProps> = ({ 
  onSuccess, 
  className = "" 
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [availableProviders, setAvailableProviders] = useState<SSOProvider[]>([]);
  const [ssoRequired, setSSORequired] = useState(false);

  useEffect(() => {
    loadSSOProviders();
  }, []);

  const loadSSOProviders = async () => {
    try {
      const { data: settings, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['sso_providers', 'sso_global_settings']);

      if (error) throw error;

      const providersData = settings?.find(s => s.setting_key === 'sso_providers');
      const globalData = settings?.find(s => s.setting_key === 'sso_global_settings');

      if (providersData?.setting_value) {
        const providers = providersData.setting_value as unknown as SSOProvider[];
        setAvailableProviders(providers.filter(p => p.enabled));
      }

      if (globalData?.setting_value) {
        const globalSettings = globalData.setting_value as any;
        setSSORequired(globalSettings.ssoRequired || false);
      }
    } catch (error) {
      console.error('Error loading SSO providers:', error);
    }
  };

  const signInWithProvider = async (providerId: string) => {
    try {
      setLoading(providerId);

      let provider: 'google' | 'azure' | 'github' = 'google';
      let options: any = {
        redirectTo: `${window.location.origin}/auth/callback`
      };

      switch (providerId) {
        case 'google':
          provider = 'google';
          const googleConfig = availableProviders.find(p => p.id === 'google');
          if (googleConfig?.domain) {
            options.queryParams = {
              hd: googleConfig.domain
            };
          }
          break;
        case 'microsoft':
          provider = 'azure';
          const msConfig = availableProviders.find(p => p.id === 'microsoft');
          if (msConfig?.tenantId) {
            options.queryParams = {
              tenant: msConfig.tenantId
            };
          }
          break;
        case 'okta':
          // For Okta, we'd need to use a custom OIDC provider
          toast({
            title: "Coming Soon",
            description: "Okta integration is in development",
            variant: "default"
          });
          return;
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options
      });

      if (error) throw error;

      // The redirect will happen automatically
      onSuccess?.();
    } catch (error: any) {
      console.error('SSO sign-in error:', error);
      toast({
        title: "Sign-in Failed",
        description: error.message || "Failed to sign in with SSO provider",
        variant: "destructive"
      });
    } finally {
      setLoading(null);
    }
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'google':
        return <Chrome className="h-4 w-4" />;
      case 'microsoft':
        return <Building2 className="h-4 w-4" />;
      case 'okta':
        return <Users className="h-4 w-4" />;
      default:
        return <Building2 className="h-4 w-4" />;
    }
  };

  const getProviderLabel = (provider: SSOProvider) => {
    const labels = {
      google: 'Continue with Google',
      microsoft: 'Continue with Microsoft',
      okta: 'Continue with Okta'
    };
    return labels[provider.id as keyof typeof labels] || `Continue with ${provider.name}`;
  };

  if (availableProviders.length === 0 && !ssoRequired) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {ssoRequired && (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Enterprise Sign-In Required</CardTitle>
            <CardDescription>
              Your organization requires Single Sign-On authentication
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {availableProviders.length > 0 && (
        <>
          {!ssoRequired && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with SSO
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="grid gap-3">
            {availableProviders.map((provider) => (
              <Button
                key={provider.id}
                variant="outline"
                type="button"
                disabled={loading !== null}
                onClick={() => signInWithProvider(provider.id)}
                className="w-full"
              >
                {loading === provider.id ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  getProviderIcon(provider.id)
                )}
                <span className="ml-2">{getProviderLabel(provider)}</span>
              </Button>
            ))}
          </div>

          {availableProviders.some(p => p.domain) && (
            <p className="text-xs text-muted-foreground text-center">
              Restricted to organization domains
            </p>
          )}
        </>
      )}
    </div>
  );
};