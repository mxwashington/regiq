import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEnhancedInputValidation } from './useEnhancedInputValidation';

interface ApiKey {
  id: string;
  key_name: string;
  key_prefix: string;
  is_active: boolean;
  rate_limit_per_hour: number;
  last_used_at: string | null;
  usage_count: number;
  created_at: string;
  security_metadata: any;
}

interface CreateApiKeyResult {
  success: boolean;
  apiKey?: string;
  keyPrefix?: string;
  message?: string;
  error?: string;
}

export const useSecureApiKeyManagement = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { validateField, validationRules } = useEnhancedInputValidation();

  // Fetch user's API keys (metadata only, never the actual key)
  const fetchApiKeys = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, key_name, key_prefix, is_active, rate_limit_per_hour, last_used_at, usage_count, created_at, security_metadata')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast({
        title: "Error",
        description: "Failed to fetch API keys",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Create new secure API key
  const createApiKey = useCallback(async (
    keyName: string,
    rateLimit: number = 1000
  ): Promise<CreateApiKeyResult> => {
    try {
      // Validate input
      const keyNameValidation = validateField('API Key Name', keyName, validationRules.apiKeyName);
      
      if (!keyNameValidation.isValid) {
        return {
          success: false,
          error: keyNameValidation.errors.join(', ')
        };
      }

      setLoading(true);
      
      // Call secure API key creation function
      const { data, error } = await supabase.rpc('create_secure_api_key', {
        key_name_param: keyNameValidation.sanitizedValue,
        rate_limit_param: rateLimit
      });

      if (error) {
        throw error;
      }

      // Refresh API keys list
      await fetchApiKeys();

      toast({
        title: "API Key Created",
        description: "Your API key has been created successfully. Store it securely - it will not be shown again.",
        variant: "default"
      });

      return {
        success: true,
        apiKey: (data as any)?.api_key,
        keyPrefix: (data as any)?.key_prefix,
        message: (data as any)?.message
      };

    } catch (error: any) {
      console.error('Error creating API key:', error);
      
      let errorMessage = "Failed to create API key";
      if (error.message?.includes('Enterprise subscription required')) {
        errorMessage = "Enterprise subscription required for API key creation";
      } else if (error.message?.includes('Authentication required')) {
        errorMessage = "Please log in to create API keys";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [validateField, validationRules, fetchApiKeys, toast]);

  // Revoke API key
  const revokeApiKey = useCallback(async (keyId: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId);

      if (error) throw error;

      // Refresh API keys list
      await fetchApiKeys();

      toast({
        title: "API Key Revoked",
        description: "The API key has been deactivated",
        variant: "default"
      });

      return true;
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast({
        title: "Error", 
        description: "Failed to revoke API key",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchApiKeys, toast]);

  // Update API key rate limit
  const updateRateLimit = useCallback(async (
    keyId: string, 
    newRateLimit: number
  ): Promise<boolean> => {
    try {
      if (newRateLimit < 1 || newRateLimit > 10000) {
        toast({
          title: "Invalid Rate Limit",
          description: "Rate limit must be between 1 and 10,000 requests per hour",
          variant: "destructive"
        });
        return false;
      }

      setLoading(true);
      
      const { error } = await supabase
        .from('api_keys')
        .update({ rate_limit_per_hour: newRateLimit })
        .eq('id', keyId);

      if (error) throw error;

      // Refresh API keys list
      await fetchApiKeys();

      toast({
        title: "Rate Limit Updated",
        description: `Rate limit set to ${newRateLimit} requests per hour`,
        variant: "default"
      });

      return true;
    } catch (error) {
      console.error('Error updating rate limit:', error);
      toast({
        title: "Error",
        description: "Failed to update rate limit",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchApiKeys, toast]);

  // Test API key validation (for debugging)
  const testApiKeyValidation = useCallback(async (apiKey: string) => {
    try {
      const { data, error } = await supabase.rpc('validate_api_key_secure', {
        api_key_input: apiKey
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error testing API key:', error);
      return null;
    }
  }, []);

  return {
    apiKeys,
    loading,
    fetchApiKeys,
    createApiKey,
    revokeApiKey,
    updateRateLimit,
    testApiKeyValidation
  };
};