import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerplexityRequest {
  query: string;
  context?: string;
  max_results?: number;
  search_type?: 'web' | 'academic' | 'regulatory';
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
    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    
    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }

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

    const { query, context, max_results = 5, search_type = 'regulatory' }: PerplexityRequest = await req.json();

    if (!query?.trim()) {
      throw new Error('Query is required');
    }

    // Enhanced rate limiting for Perplexity - 50 requests per hour per user
    const rateLimitCheck = await checkRateLimit(supabase, user.id, 50, 'hour');
    if (!rateLimitCheck.allowed) {
      return new Response(JSON.stringify({
        error: 'Perplexity rate limit exceeded',
        remaining: rateLimitCheck.remaining,
        reset_time: rateLimitCheck.reset_time,
        limit_type: 'hourly'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Also check minute-based rate limiting - 10 per minute
    const minuteRateCheck = await checkRateLimit(supabase, user.id, 10, 'minute');
    if (!minuteRateCheck.allowed) {
      return new Response(JSON.stringify({
        error: 'Perplexity rate limit exceeded',
        remaining: minuteRateCheck.remaining,
        reset_time: minuteRateCheck.reset_time,
        limit_type: 'minute'
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Enhance query for regulatory compliance context
    const enhancedQuery = enhanceRegulatoryQuery(query, search_type, context);

    console.log('Perplexity search request:', {
      user_id: user.id,
      query: enhancedQuery,
      search_type,
      max_results
    });

    // Make request to Perplexity API
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'RegIQ-Compliance-Platform/1.0'
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online', // Optimized for regulatory searches
        messages: [
          {
            role: 'system',
            content: getSystemPrompt(search_type)
          },
          {
            role: 'user',
            content: enhancedQuery
          }
        ],
        max_tokens: 1000,
        temperature: 0.2, // Lower temperature for more factual responses
        top_p: 0.9,
        search_domain_filter: getSearchDomainFilter(search_type),
        return_citations: true,
        return_images: false
      })
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('Perplexity API error:', perplexityResponse.status, errorText);
      throw new Error(`Perplexity API error: ${perplexityResponse.status}`);
    }

    const result = await perplexityResponse.json();

    // Extract and validate response
    const processedResult = {
      answer: result.choices?.[0]?.message?.content || 'No answer available',
      citations: extractCitations(result.choices?.[0]?.message?.content || ''),
      usage: {
        tokens: result.usage?.total_tokens || 0,
        model: result.model
      },
      search_metadata: {
        query: enhancedQuery,
        search_type,
        timestamp: new Date().toISOString()
      }
    };

    // Log successful usage
    await logPerplexityUsage(supabase, user.id, query, search_type, 'success', result.usage?.total_tokens || 0);

    return new Response(JSON.stringify(processedResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Secure Perplexity proxy error:', error);
    
    // Log failed usage attempt
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          await logPerplexityUsage(supabase, user.id, '', 'error', 'failed', 0);
        }
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function checkRateLimit(supabase: any, userId: string, limit: number, window: 'minute' | 'hour'): Promise<RateLimitCheck> {
  const windowStart = new Date();
  if (window === 'minute') {
    windowStart.setMinutes(windowStart.getMinutes() - 1);
  } else {
    windowStart.setHours(windowStart.getHours() - 1);
  }

  const { data, error } = await supabase
    .from('usage_logs')
    .select('amount')
    .eq('user_id', userId)
    .eq('feature_name', 'perplexity_search')
    .gte('created_at', windowStart.toISOString());

  if (error) {
    console.error('Rate limit check error:', error);
    const resetTime = window === 'minute' ? 60000 : 3600000;
    return { allowed: true, remaining: limit, reset_time: Date.now() + resetTime };
  }

  const currentUsage = data?.reduce((sum: number, log: any) => sum + log.amount, 0) || 0;
  const remaining = Math.max(0, limit - currentUsage);
  const resetTime = window === 'minute' ? 60000 : 3600000;
  
  return {
    allowed: currentUsage < limit,
    remaining,
    reset_time: Date.now() + resetTime
  };
}

function enhanceRegulatoryQuery(query: string, searchType: string, context?: string): string {
  let enhancedQuery = query;
  
  // Add regulatory context based on search type
  switch (searchType) {
    case 'regulatory':
      enhancedQuery = `Regulatory compliance information: ${query}. Focus on FDA, USDA, EPA, OSHA, or other regulatory agency guidance, rules, and requirements.`;
      break;
    case 'academic':
      enhancedQuery = `Academic research on regulatory compliance: ${query}. Include peer-reviewed sources and scientific studies.`;
      break;
    case 'web':
      enhancedQuery = `${query} regulatory compliance food safety pharmaceutical`;
      break;
  }
  
  if (context) {
    enhancedQuery += ` Context: ${context}`;
  }
  
  return enhancedQuery;
}

function getSystemPrompt(searchType: string): string {
  const basePrompt = `You are a regulatory compliance expert assistant specializing in food safety, pharmaceutical, and industrial regulations. Provide accurate, up-to-date regulatory information with proper citations.`;
  
  switch (searchType) {
    case 'regulatory':
      return `${basePrompt} Focus on official regulatory guidance, CFR requirements, FDA guidance documents, USDA regulations, and EPA rules. Always cite specific regulation numbers and sections when available.`;
    case 'academic':
      return `${basePrompt} Prioritize peer-reviewed academic sources, research studies, and scientific publications related to regulatory compliance and safety standards.`;
    case 'web':
      return `${basePrompt} Provide a comprehensive overview using reliable web sources, official agency websites, and authoritative industry publications.`;
    default:
      return basePrompt;
  }
}

function getSearchDomainFilter(searchType: string): string[] {
  switch (searchType) {
    case 'regulatory':
      return ['fda.gov', 'usda.gov', 'epa.gov', 'osha.gov', 'ecfr.gov', 'federalregister.gov'];
    case 'academic':
      return ['pubmed.ncbi.nlm.nih.gov', 'scholar.google.com', 'sciencedirect.com', 'springer.com'];
    default:
      return []; // No domain filter for general web search
  }
}

function extractCitations(content: string): string[] {
  // Extract URLs and citations from the Perplexity response
  const urlRegex = /https?:\/\/[^\s\)]+/g;
  const urls = content.match(urlRegex) || [];
  
  // Extract citation patterns like [1], [2], etc.
  const citationRegex = /\[\d+\]/g;
  const citations = content.match(citationRegex) || [];
  
  return [...new Set([...urls, ...citations])];
}

async function logPerplexityUsage(supabase: any, userId: string, query: string, searchType: string, status: string, tokens: number) {
  try {
    // Log to usage_logs for rate limiting
    await supabase.from('usage_logs').insert({
      user_id: userId,
      feature_name: 'perplexity_search',
      amount: 1,
      metadata: {
        query,
        search_type: searchType,
        status,
        tokens,
        timestamp: new Date().toISOString()
      }
    });

    // Log to audit_log for compliance
    await supabase.from('audit_log').insert({
      user_id: userId,
      action: 'perplexity_search',
      table_name: 'external_api',
      record_id: `perplexity:${Date.now()}`,
      new_values: { 
        query: query.substring(0, 100), // Truncate for privacy
        search_type: searchType,
        status,
        tokens 
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log Perplexity usage:', error);
  }
}