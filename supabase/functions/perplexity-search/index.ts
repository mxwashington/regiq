import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PERPLEXITY-SEARCH] ${step}${detailsStr}`);
};

interface SearchRequest {
  query: string;
  agencies?: string[];
  industry?: string;
  timeRange?: string;
  searchType?: 'general' | 'recalls' | 'deadlines' | 'guidance';
}

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
    logStep("Function started");

    const perplexityApiKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!perplexityApiKey) {
      logStep("PERPLEXITY_API_KEY is missing");
      throw new Error("PERPLEXITY_API_KEY is not set");
    }
    logStep("API key found", { keyLength: perplexityApiKey.length });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Check user subscription and search limits
    const { data: subscriber } = await supabaseClient
      .from("subscribers")
      .select("subscribed, subscription_tier")
      .eq("user_id", user.id)
      .single();

    // Define search limits by tier
    const searchLimits = {
      free: 5,
      starter: 25,
      professional: 100,
      enterprise: 500
    };

    const userTier = subscriber?.subscribed ? subscriber.subscription_tier : 'free';
    const dailyLimit = searchLimits[userTier as keyof typeof searchLimits] || 5;

    // Check today's usage
    const today = new Date().toISOString().split('T')[0];
    const { count: todayUsage } = await supabaseClient
      .from("perplexity_searches")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00.000Z`)
      .lte("created_at", `${today}T23:59:59.999Z`);

    if ((todayUsage || 0) >= dailyLimit) {
      return new Response(JSON.stringify({ 
        error: `Daily search limit reached (${dailyLimit} searches per day for ${userTier} plan)`,
        limit_reached: true,
        current_usage: todayUsage,
        daily_limit: dailyLimit
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    const searchRequest: SearchRequest = await req.json();
    logStep("Search request received", searchRequest);

    // Build enhanced query with regulatory context
    const enhancedQuery = buildRegulatoryQuery(searchRequest);
    logStep("Enhanced query built", { originalQuery: searchRequest.query, enhancedQuery });
    
    // Check cache first (1-hour cache) - with safer encoding
    let cacheKey;
    try {
      // Use safer encoding approach
      const safeQuery = enhancedQuery.replace(/[^\w\s-]/g, ''); // Remove special chars
      cacheKey = btoa(safeQuery).replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);
      logStep("Cache key generated successfully", { cacheKey });
    } catch (error) {
      logStep("Cache key generation failed, using fallback", { error: error.message });
      cacheKey = btoa(searchRequest.query.replace(/[^\w\s-]/g, '')).replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);
    }
    const cacheExpiry = new Date();
    cacheExpiry.setHours(cacheExpiry.getHours() - 1);

    const { data: cachedResult } = await supabaseClient
      .from("search_cache")
      .select("result_data, created_at")
      .eq("cache_key", cacheKey)
      .gte("created_at", cacheExpiry.toISOString())
      .single();

    if (cachedResult) {
      logStep("Returning cached result");
      return new Response(JSON.stringify({
        ...cachedResult.result_data,
        cached: true,
        cached_at: cachedResult.created_at
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Make Perplexity API call
    logStep("Making Perplexity API call", { query: enhancedQuery });
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a regulatory intelligence expert. Provide accurate, up-to-date information about FDA, USDA, EPA, and other regulatory agency updates. Always cite official government sources and include dates when available. Focus on actionable compliance information.'
          },
          {
            role: 'user',
            content: enhancedQuery
          }
        ],
        max_tokens: 1000,
        temperature: 0.2,
        top_p: 0.9
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    logStep("Perplexity API response received");

    // Process the response
    const result = {
      response: data.choices[0].message.content,
      sources: extractCitations(data.choices[0].message.content).map(url => ({
        title: url.split('/').pop() || 'Government Source',
        url: url
      })),
      citations: extractCitations(data.choices[0].message.content),
      related_questions: data.choices[0].message.related_questions || [],
      urgency_score: calculateUrgencyScore(data.choices[0].message.content),
      agencies_mentioned: extractAgencies(data.choices[0].message.content),
      search_type: searchRequest.searchType || 'general',
      query: searchRequest.query,
      timestamp: new Date().toISOString()
    };

    // Cache the result
    await supabaseClient
      .from("search_cache")
      .upsert({
        cache_key: cacheKey,
        query: searchRequest.query,
        result_data: result,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
      });

    // Log the search
    await supabaseClient
      .from("perplexity_searches")
      .insert({
        user_id: user.id,
        query: searchRequest.query,
        search_type: searchRequest.searchType || 'general',
        agencies: searchRequest.agencies || [],
        industry: searchRequest.industry,
        tokens_used: data.usage?.total_tokens || 0,
        success: true
      });

    logStep("Search completed and logged");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in perplexity-search", { 
      message: errorMessage, 
      stack: error instanceof Error ? error.stack : undefined,
      query: (error as any)?.query || 'unknown'
    });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: "Check edge function logs for more information" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function buildRegulatoryQuery(request: SearchRequest): string {
  let query = request.query;
  
  // Add agency context
  if (request.agencies && request.agencies.length > 0) {
    query += ` from ${request.agencies.join(' or ')}`;
  }
  
  // Add industry context
  if (request.industry) {
    query += ` related to ${request.industry}`;
  }
  
  // Add search type specific context
  switch (request.searchType) {
    case 'recalls':
      query += ' recalls, safety alerts, or contamination warnings';
      break;
    case 'deadlines':
      query += ' compliance deadlines, implementation dates, or regulatory timelines';
      break;
    case 'guidance':
      query += ' guidance documents, final rules, or policy updates';
      break;
    default:
      query += ' regulatory updates, compliance requirements';
  }
  
  return query;
}

function extractCitations(content: string): string[] {
  const citations: string[] = [];
  const urlPattern = /https?:\/\/[^\s\)]+/g;
  const matches = content.match(urlPattern);
  
  if (matches) {
    matches.forEach(url => {
      if (url.includes('fda.gov') || url.includes('usda.gov') || 
          url.includes('epa.gov') || url.includes('federalregister.gov')) {
        citations.push(url);
      }
    });
  }
  
  return [...new Set(citations)]; // Remove duplicates
}

function calculateUrgencyScore(content: string): number {
  let score = 5; // Base score
  
  const urgentTerms = ['recall', 'warning', 'alert', 'immediate', 'urgent', 'contamination'];
  const mediumTerms = ['deadline', 'compliance', 'requirement', 'update'];
  const lowTerms = ['guidance', 'recommendation', 'proposal'];
  
  const lowerContent = content.toLowerCase();
  
  urgentTerms.forEach(term => {
    if (lowerContent.includes(term)) score += 2;
  });
  
  mediumTerms.forEach(term => {
    if (lowerContent.includes(term)) score += 1;
  });
  
  lowTerms.forEach(term => {
    if (lowerContent.includes(term)) score -= 1;
  });
  
  return Math.min(Math.max(score, 1), 10); // Clamp between 1-10
}

function extractAgencies(content: string): string[] {
  const agencies: string[] = [];
  const agencyPatterns = {
    'FDA': /\b(FDA|Food and Drug Administration)\b/i,
    'USDA': /\b(USDA|United States Department of Agriculture)\b/i,
    'EPA': /\b(EPA|Environmental Protection Agency)\b/i,
    'FSIS': /\b(FSIS|Food Safety and Inspection Service)\b/i,
    'CDC': /\b(CDC|Centers for Disease Control)\b/i
  };
  
  Object.entries(agencyPatterns).forEach(([agency, pattern]) => {
    if (pattern.test(content)) {
      agencies.push(agency);
    }
  });
  
  return agencies;
}