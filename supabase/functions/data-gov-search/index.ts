import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Simple logger for Supabase functions
const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface DataGovSearchParams {
  query: string;
  dataset?: string;
  agency?: string;
  limit?: number;
  offset?: number;
  format?: string;
}

interface DataGovResponse {
  success: boolean;
  count: number;
  results: any[];
  error?: string;
  cached?: boolean;
  rate_limit_remaining?: number;
}

interface RateLimitInfo {
  requests_remaining: number;
  reset_time: number;
  daily_limit: number;
}

// Rate limiting storage
const RATE_LIMIT_KEY = 'data_gov_rate_limit';
const DAILY_LIMIT = 1000; // Adjust based on your API plan

function logStep(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  logger.info(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

async function checkRateLimit(supabase: any): Promise<RateLimitInfo> {
  const { data } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', RATE_LIMIT_KEY)
    .single();

  const now = Date.now();
  const today = new Date().toDateString();
  
  if (!data || !data.setting_value) {
    // Initialize rate limit tracking
    const newRateLimit = {
      date: today,
      requests_made: 0,
      reset_time: now + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    await supabase
      .from('system_settings')
      .upsert({
        setting_key: RATE_LIMIT_KEY,
        setting_value: newRateLimit,
        description: 'Data.gov API rate limit tracking'
      });
    
    return {
      requests_remaining: DAILY_LIMIT,
      reset_time: newRateLimit.reset_time,
      daily_limit: DAILY_LIMIT
    };
  }

  const rateLimit = data.setting_value;
  
  // Reset if it's a new day
  if (rateLimit.date !== today || now > rateLimit.reset_time) {
    const newRateLimit = {
      date: today,
      requests_made: 0,
      reset_time: now + (24 * 60 * 60 * 1000)
    };
    
    await supabase
      .from('system_settings')
      .upsert({
        setting_key: RATE_LIMIT_KEY,
        setting_value: newRateLimit,
        description: 'Data.gov API rate limit tracking'
      });
    
    return {
      requests_remaining: DAILY_LIMIT,
      reset_time: newRateLimit.reset_time,
      daily_limit: DAILY_LIMIT
    };
  }
  
  return {
    requests_remaining: Math.max(0, DAILY_LIMIT - rateLimit.requests_made),
    reset_time: rateLimit.reset_time,
    daily_limit: DAILY_LIMIT
  };
}

async function updateRateLimit(supabase: any) {
  const { data } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', RATE_LIMIT_KEY)
    .single();

  if (data && data.setting_value) {
    const rateLimit = data.setting_value;
    rateLimit.requests_made = (rateLimit.requests_made || 0) + 1;
    
    await supabase
      .from('system_settings')
      .update({ setting_value: rateLimit })
      .eq('setting_key', RATE_LIMIT_KEY);
  }
}

async function searchDataGov(params: DataGovSearchParams, apiKey: string): Promise<any> {
  const baseUrl = 'https://api.data.gov/api/v1/';
  const endpoint = params.dataset ? `datasets/${params.dataset}/data` : 'datasets';
  
  const searchParams = new URLSearchParams({
    api_key: apiKey,
    q: params.query,
    limit: (params.limit || 20).toString(),
    offset: (params.offset || 0).toString()
  });

  if (params.agency) {
    searchParams.append('organization', params.agency);
  }

  const url = `${baseUrl}${endpoint}?${searchParams.toString()}`;
  
  logStep('Making Data.gov API request', { url: url.replace(apiKey, 'REDACTED') });
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'RegIQ-DataGov-Integration/1.0',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Data.gov API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function getCachedResults(supabase: any, cacheKey: string): Promise<any | null> {
  const { data } = await supabase
    .from('search_cache')
    .select('result_data')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .single();

  return data?.result_data || null;
}

async function setCachedResults(supabase: any, cacheKey: string, query: string, results: any) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // Cache for 1 hour

  await supabase
    .from('search_cache')
    .upsert({
      cache_key: cacheKey,
      query,
      result_data: results,
      expires_at: expiresAt.toISOString()
    });
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Data.gov search request received');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API key
    const apiKey = Deno.env.get('DATA_GOV_API_KEY');
    if (!apiKey) {
      logStep('ERROR: DATA_GOV_API_KEY not found');
      return new Response(
        JSON.stringify({ success: false, error: 'Data.gov API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request
    const { searchParams } = new URL(req.url);
    const params: DataGovSearchParams = {
      query: searchParams.get('query') || '',
      dataset: searchParams.get('dataset') || undefined,
      agency: searchParams.get('agency') || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0'),
      format: searchParams.get('format') || 'json'
    };

    if (!params.query.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: 'Query parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check rate limits
    const rateLimit = await checkRateLimit(supabase);
    if (rateLimit.requests_remaining <= 0) {
      logStep('Rate limit exceeded');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Daily API rate limit exceeded',
          rate_limit_info: rateLimit
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate cache key
    const cacheKey = `data_gov_${btoa(JSON.stringify(params))}`;
    
    // Check cache first
    const cachedResults = await getCachedResults(supabase, cacheKey);
    if (cachedResults) {
      logStep('Returning cached results');
      return new Response(
        JSON.stringify({
          ...cachedResults,
          cached: true,
          rate_limit_remaining: rateLimit.requests_remaining
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Make API request
    logStep('Making fresh API request', params);
    const startTime = Date.now();
    
    try {
      const apiResponse = await searchDataGov(params, apiKey);
      const duration = Date.now() - startTime;
      
      // Update rate limit
      await updateRateLimit(supabase);
      
      // Process results
      const response: DataGovResponse = {
        success: true,
        count: apiResponse.count || apiResponse.results?.length || 0,
        results: apiResponse.results || apiResponse.dataset || [],
        rate_limit_remaining: rateLimit.requests_remaining - 1
      };

      // Cache the results
      await setCachedResults(supabase, cacheKey, params.query, response);
      
      // Log successful search
      if (req.headers.get('authorization')) {
        const { data: { user } } = await supabase.auth.getUser(
          req.headers.get('authorization')?.replace('Bearer ', '') || ''
        );
        
        if (user) {
          await supabase
            .from('perplexity_searches')
            .insert({
              user_id: user.id,
              query: params.query,
              search_type: 'data_gov',
              agencies: params.agency ? [params.agency] : [],
              success: true,
              tokens_used: Math.ceil(params.query.length / 4) // Estimate
            });
        }
      }

      logStep('Data.gov search completed successfully', { 
        duration, 
        resultCount: response.count,
        cached: false
      });

      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (apiError: any) {
      logStep('Data.gov API error', { error: apiError.message });
      
      // Log failed search
      if (req.headers.get('authorization')) {
        const { data: { user } } = await supabase.auth.getUser(
          req.headers.get('authorization')?.replace('Bearer ', '') || ''
        );
        
        if (user) {
          await supabase
            .from('perplexity_searches')
            .insert({
              user_id: user.id,
              query: params.query,
              search_type: 'data_gov',
              agencies: params.agency ? [params.agency] : [],
              success: false,
              error_message: apiError.message
            });
        }
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Data.gov search failed: ${apiError.message}`,
          rate_limit_remaining: rateLimit.requests_remaining
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error: any) {
    logStep('Unexpected error in data-gov-search', { error: error.message });
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});