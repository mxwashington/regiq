import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

interface ValidationRequest {
  email: string;
  provider: string;
  providers: SSOProvider[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, provider, providers }: ValidationRequest = await req.json();

    console.log('Validating SSO access:', { email, provider, providers });

    // Extract domain from email
    const domain = email.split('@')[1];

    // Find matching provider configuration
    const providerConfig = providers.find(p => 
      p.id === provider && p.enabled
    );

    if (!providerConfig) {
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: 'Provider not configured or disabled' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403 
        }
      );
    }

    // Check domain restrictions
    let allowed = true;
    let reason = '';

    if (providerConfig.domain && providerConfig.domain !== domain) {
      allowed = false;
      reason = `Email domain ${domain} is not authorized for this provider`;
    }

    // Log the validation attempt
    await supabase.rpc('log_security_event_enhanced', {
      event_type_param: 'sso_access_validation',
      metadata_param: {
        email,
        provider,
        domain,
        allowed,
        reason: reason || 'Access granted'
      },
      threat_level_param: allowed ? 'low' : 'medium'
    });

    return new Response(
      JSON.stringify({ 
        allowed, 
        reason: reason || 'Access granted',
        provider: providerConfig.name,
        domain: providerConfig.domain
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error validating SSO access:', error);
    
    return new Response(
      JSON.stringify({ 
        allowed: false, 
        reason: 'Validation error',
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});