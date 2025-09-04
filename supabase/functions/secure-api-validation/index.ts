import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 Secure API validation request received');
    
    const { apiKey } = await req.json();
    
    if (!apiKey || typeof apiKey !== 'string') {
      return new Response(
        JSON.stringify({ error: 'API key required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key using secure function
    const { data: validationResult, error } = await supabase
      .rpc('validate_api_key_secure', {
        api_key_input: apiKey
      });

    if (error) {
      console.error('API key validation error:', error);
      return new Response(
        JSON.stringify({ 
          error: 'API key validation failed',
          valid: false 
        }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const result = validationResult[0];
    
    if (!result || !result.is_valid) {
      console.log('Invalid API key attempt');
      return new Response(
        JSON.stringify({ 
          valid: false,
          error: 'Invalid API key'
        }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ Valid API key:', result.user_id);

    return new Response(
      JSON.stringify({ 
        valid: true,
        userId: result.user_id,
        rateLimit: result.rate_limit,
        metadata: result.key_metadata
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Secure API validation error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        valid: false 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});