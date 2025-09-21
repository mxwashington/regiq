import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SSOProvider {
  id: string;
  name: string;
  enabled: boolean;
  clientId?: string;
  tenantId?: string;
  domain?: string;
}

interface SSOSettings {
  ssoRequired: boolean;
  autoProvisionUsers: boolean;
  defaultRole: string;
  sessionTimeout: number;
}

interface SSOUser {
  id: string;
  email: string;
  name: string;
  domain?: string;
  provider: string;
  providerId: string;
}

export const useSSO = () => {
  const { toast } = useToast();
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [settings, setSettings] = useState<SSOSettings>({
    ssoRequired: false,
    autoProvisionUsers: true,
    defaultRole: 'user',
    sessionTimeout: 8
  });
  const [loading, setLoading] = useState(false);

  // Load SSO configuration
  const loadSSOConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['sso_providers', 'sso_global_settings']);

      if (error) throw error;

      const providersData = data?.find(s => s.setting_key === 'sso_providers');
      const settingsData = data?.find(s => s.setting_key === 'sso_global_settings');

      if (providersData?.setting_value) {
        setProviders(providersData.setting_value as unknown as SSOProvider[]);
      }

      if (settingsData?.setting_value) {
        setSettings(settingsData.setting_value as unknown as SSOSettings);
      }
    } catch (error) {
      console.error('Error loading SSO config:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if SSO is required for domain
  const isSSORequired = (email?: string) => {
    if (!email || !settings.ssoRequired) return false;
    
    const domain = email.split('@')[1];
    const enabledProviders = providers.filter(p => p.enabled);
    
    return enabledProviders.some(provider => 
      provider.domain && domain === provider.domain
    );
  };

  // Get available providers for domain
  const getProvidersForDomain = (email?: string) => {
    if (!email) return providers.filter(p => p.enabled);
    
    const domain = email.split('@')[1];
    return providers.filter(p => 
      p.enabled && (!p.domain || p.domain === domain)
    );
  };

  // Provision user after SSO login
  const provisionSSOUser = async (ssoUser: SSOUser) => {
    try {
      if (!settings.autoProvisionUsers) return;

      // Check if user already exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', ssoUser.email)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // Create or update user profile
      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: ssoUser.id,
            email: ssoUser.email,
            full_name: ssoUser.name,
            role: settings.defaultRole,
            subscription_status: 'trial'
          });

        if (insertError) throw insertError;

        // Log SSO provisioning
        await supabase.rpc('log_security_event_enhanced', {
          event_type_param: 'sso_user_provisioned',
          metadata_param: {
            provider: ssoUser.provider,
            domain: ssoUser.domain,
            auto_provisioned: true
          },
          threat_level_param: 'low'
        });

        toast({
          title: "Welcome!",
          description: "Your account has been created via SSO",
        });
      } else {
        // Update last login info
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', ssoUser.id);

        if (updateError) throw updateError;

        // Log SSO login
        await supabase.rpc('log_security_event_enhanced', {
          event_type_param: 'sso_login',
          metadata_param: {
            provider: ssoUser.provider,
            domain: ssoUser.domain
          },
          threat_level_param: 'low'
        });
      }

      return true;
    } catch (error) {
      console.error('Error provisioning SSO user:', error);
      toast({
        title: "Provisioning Failed",
        description: "Failed to set up your account after SSO login",
        variant: "destructive"
      });
      return false;
    }
  };

  // Validate SSO domain restrictions
  const validateSSOAccess = async (userEmail: string, provider: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('validate-sso-access', {
        body: { 
          email: userEmail, 
          provider,
          providers: providers.filter(p => p.enabled)
        }
      });

      if (error) throw error;

      return data.allowed || false;
    } catch (error) {
      console.error('Error validating SSO access:', error);
      return false;
    }
  };

  // Get SSO redirect URL
  const getSSORedirectUrl = (provider: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth/callback?provider=${provider}`;
  };

  // Check if current session is from SSO
  const isSessionFromSSO = async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.app_metadata?.provider !== 'email';
  };

  useEffect(() => {
    loadSSOConfig();
  }, []);

  return {
    providers,
    settings,
    loading,
    isSSORequired,
    getProvidersForDomain,
    provisionSSOUser,
    validateSSOAccess,
    getSSORedirectUrl,
    isSessionFromSSO,
    loadSSOConfig
  };
};