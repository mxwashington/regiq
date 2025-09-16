import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegulatoryAPIRequest {
  source: 'FDA' | 'USDA' | 'FSIS' | 'WHO' | 'EPA' | 'CDC';
  endpoint: string;
  params: Record<string, any>;
}

interface RateLimitCheck {
  allowed: boolean;
  remaining: number;
  reset_time: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { source, endpoint, params }: RegulatoryAPIRequest = await req.json();

    // Rate limiting check - 100 requests per minute per user
    const rateLimitCheck = await checkRateLimit(supabase, user.id, 100);
    if (!rateLimitCheck.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded',
        remaining: rateLimitCheck.remaining,
        reset_time: rateLimitCheck.reset_time
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route to specific API handler
    let result;
    switch (source) {
      case 'FDA':
        result = await handleFDARequest(endpoint, params);
        break;
      case 'USDA':
        result = await handleUSDARequest(endpoint, params);
        break;
      case 'FSIS':
        result = await handleFSISRequest(endpoint, params);
        break;
      case 'WHO':
        result = await handleWHORequest(endpoint, params);
        break;
      case 'EPA':
        result = await handleEPARequest(endpoint, params);
        break;
      case 'CDC':
        result = await handleCDCRequest(endpoint, params);
        break;
      default:
        throw new Error(`Unsupported source: ${source}`);
    }

    // Log API usage for audit
    await logAPIUsage(supabase, user.id, source, endpoint, 'success');

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Secure regulatory proxy error:', error);
    
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function checkRateLimit(supabase: any, userId: string, limit: number): Promise<RateLimitCheck> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - 1); // 1 minute window

  const { data, error } = await supabase
    .from('usage_logs')
    .select('amount')
    .eq('user_id', userId)
    .eq('feature_name', 'regulatory_api_proxy')
    .gte('created_at', windowStart.toISOString());

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: limit, reset_time: Date.now() + 60000 };
  }

  const currentUsage = data?.reduce((sum: number, log: any) => sum + log.amount, 0) || 0;
  const remaining = Math.max(0, limit - currentUsage);
  
  return {
    allowed: currentUsage < limit,
    remaining,
    reset_time: Date.now() + 60000 // Reset in 1 minute
  };
}

async function handleFDARequest(endpoint: string, params: Record<string, any>) {
  const fdaApiKey = Deno.env.get('FDA_API_KEY'); // Optional - FDA works without key but with limits
  const baseUrl = 'https://api.fda.gov';
  
  let url = `${baseUrl}${endpoint}`;
  const urlParams = new URLSearchParams();
  
  // Add API key if available
  if (fdaApiKey) {
    urlParams.append('api_key', fdaApiKey);
  }
  
  // Add other parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlParams.append(key, String(value));
    }
  });
  
  if (urlParams.toString()) {
    url += '?' + urlParams.toString();
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RegIQ-Compliance-Platform/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`FDA API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function handleUSDARequest(endpoint: string, params: Record<string, any>) {
  const usdaApiKey = Deno.env.get('USDA_API_KEY');
  const baseUrl = 'https://www.fsis.usda.gov/fsis/api';
  
  let url = `${baseUrl}${endpoint}`;
  const urlParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlParams.append(key, String(value));
    }
  });
  
  if (urlParams.toString()) {
    url += '?' + urlParams.toString();
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'RegIQ-Compliance-Platform/1.0'
  };

  if (usdaApiKey) {
    headers['Authorization'] = `Bearer ${usdaApiKey}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function handleFSISRequest(endpoint: string, params: Record<string, any>) {
  const fsisApiKey = Deno.env.get('FSIS_API_KEY');
  const baseUrl = 'https://www.fsis.usda.gov/api';
  
  let url = `${baseUrl}${endpoint}`;
  const urlParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlParams.append(key, String(value));
    }
  });
  
  if (urlParams.toString()) {
    url += '?' + urlParams.toString();
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'RegIQ-Compliance-Platform/1.0'
  };

  if (fsisApiKey) {
    headers['X-API-Key'] = fsisApiKey;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`FSIS API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function handleWHORequest(endpoint: string, params: Record<string, any>) {
  const whoApiKey = Deno.env.get('WHO_API_KEY');
  const baseUrl = 'https://extranet.who.int/don/api';
  
  let url = `${baseUrl}${endpoint}`;
  const urlParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlParams.append(key, String(value));
    }
  });
  
  if (urlParams.toString()) {
    url += '?' + urlParams.toString();
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'RegIQ-Compliance-Platform/1.0'
  };

  if (whoApiKey) {
    headers['Authorization'] = `Bearer ${whoApiKey}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`WHO API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function handleEPARequest(endpoint: string, params: Record<string, any>) {
  const epaApiKey = Deno.env.get('EPA_API_KEY');
  const baseUrl = 'https://api.epa.gov';
  
  let url = `${baseUrl}${endpoint}`;
  const urlParams = new URLSearchParams();
  
  if (epaApiKey) {
    urlParams.append('api_key', epaApiKey);
  }
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlParams.append(key, String(value));
    }
  });
  
  if (urlParams.toString()) {
    url += '?' + urlParams.toString();
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RegIQ-Compliance-Platform/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`EPA API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function handleCDCRequest(endpoint: string, params: Record<string, any>) {
  const cdcApiKey = Deno.env.get('CDC_API_KEY');
  const baseUrl = 'https://data.cdc.gov/api';
  
  let url = `${baseUrl}${endpoint}`;
  const urlParams = new URLSearchParams();
  
  if (cdcApiKey) {
    urlParams.append('$$app_token', cdcApiKey);
  }
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlParams.append(key, String(value));
    }
  });
  
  if (urlParams.toString()) {
    url += '?' + urlParams.toString();
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'RegIQ-Compliance-Platform/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`CDC API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function logAPIUsage(supabase: any, userId: string, source: string, endpoint: string, status: string) {
  try {
    await supabase.from('usage_logs').insert({
      user_id: userId,
      feature_name: 'regulatory_api_proxy',
      amount: 1,
      metadata: {
        source,
        endpoint,
        status,
        timestamp: new Date().toISOString()
      }
    });

    // Also log to audit_log for compliance
    await supabase.from('audit_log').insert({
      user_id: userId,
      action: 'api_access',
      table_name: 'external_api',
      record_id: `${source}:${endpoint}`,
      new_values: { source, endpoint, status },
      ip_address: null, // Will be populated by RLS if available
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}