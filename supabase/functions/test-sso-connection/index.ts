// Simple logger for edge functions
const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SSOProvider {
  id: string;
  name: string;
  enabled: boolean;
  clientId?: string;
  tenantId?: string;
  domain?: string;
}

interface TestRequest {
  providerId: string;
  config: SSOProvider;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { providerId, config }: TestRequest = await req.json();

    logger.info('Testing SSO connection:', { providerId, config });

    let success = false;
    let message = '';

    switch (providerId) {
      case 'google':
        success = await testGoogleConnection(config);
        message = success ? 'Google Workspace connection successful' : 'Google Workspace connection failed';
        break;
      
      case 'microsoft':
        success = await testMicrosoftConnection(config);
        message = success ? 'Microsoft Azure AD connection successful' : 'Microsoft Azure AD connection failed';
        break;
      
      case 'okta':
        success = await testOktaConnection(config);
        message = success ? 'Okta connection successful' : 'Okta connection failed';
        break;
      
      default:
        message = 'Unsupported provider';
        break;
    }

    return new Response(
      JSON.stringify({ 
        success, 
        message,
        provider: config.name,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logger.error('Error testing SSO connection:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : String(error) 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function testGoogleConnection(config: SSOProvider): Promise<boolean> {
  try {
    if (!config.clientId) return false;
    
    // Test Google OAuth configuration
    const testUrl = `https://accounts.google.com/.well-known/openid_configuration`;
    const response = await fetch(testUrl);
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return !!data.authorization_endpoint;
  } catch (error) {
    logger.error('Google connection test failed:', error);
    return false;
  }
}

async function testMicrosoftConnection(config: SSOProvider): Promise<boolean> {
  try {
    if (!config.clientId || !config.tenantId) return false;
    
    // Test Microsoft Azure AD configuration
    const testUrl = `https://login.microsoftonline.com/${config.tenantId}/v2.0/.well-known/openid_configuration`;
    const response = await fetch(testUrl);
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return !!data.authorization_endpoint;
  } catch (error) {
    logger.error('Microsoft connection test failed:', error);
    return false;
  }
}

async function testOktaConnection(config: SSOProvider): Promise<boolean> {
  try {
    if (!config.domain) return false;
    
    // Test Okta domain accessibility
    const testUrl = `https://${config.domain}/.well-known/openid_configuration`;
    const response = await fetch(testUrl);
    
    if (!response.ok) return false;
    
    const data = await response.json();
    return !!data.authorization_endpoint;
  } catch (error) {
    logger.error('Okta connection test failed:', error);
    return false;
  }
}