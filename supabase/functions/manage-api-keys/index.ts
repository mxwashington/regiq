import { logger } from '@/lib/logger';

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  logger.info(`[MANAGE-API-KEYS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started", { method: req.method });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user has enterprise subscription
    const { data: subscription } = await supabaseClient
      .from('subscribers')
      .select('subscribed, subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (!subscription?.subscribed || subscription.subscription_tier !== 'enterprise') {
      return new Response(JSON.stringify({ 
        error: 'Enterprise subscription required for API access' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    if (req.method === 'GET') {
      // Get user's API keys
      const { data: apiKeys, error } = await supabaseClient
        .from('api_keys')
        .select('id, key_name, is_active, created_at, last_used_at, usage_count, rate_limit_per_hour')
        .eq('user_id', user.id);

      if (error) throw error;

      logStep("Retrieved API keys", { count: apiKeys?.length });
      return new Response(JSON.stringify({ api_keys: apiKeys }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (req.method === 'POST') {
      // Generate new API key
      const { key_name } = await req.json();
      
      logStep("Generating new API key", { keyName: key_name });
      
      const { data: newApiKey, error } = await supabaseClient
        .rpc('provision_enterprise_api_key', { target_user_id: user.id });

      if (error) throw error;

      logStep("API key generated successfully");
      return new Response(JSON.stringify({ 
        message: 'API key created successfully',
        api_key: newApiKey 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (req.method === 'DELETE') {
      // Revoke API keys
      const { data: revokedCount, error } = await supabaseClient
        .rpc('revoke_user_api_keys', { target_user_id: user.id });

      if (error) throw error;

      logStep("API keys revoked", { revokedCount });
      return new Response(JSON.stringify({ 
        message: `${revokedCount} API key(s) revoked successfully` 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in manage-api-keys", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});