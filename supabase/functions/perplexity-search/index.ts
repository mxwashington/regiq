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

    // Rate limits removed - all users can now use perplexity search without restrictions
    logStep("Rate limiting disabled - proceeding with search");

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

    // Make Perplexity API call with timeout and retry logic
    logStep("Making Perplexity API call", { query: enhancedQuery });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
    
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a regulatory intelligence expert. Provide accurate, up-to-date information about FDA, USDA, EPA, and other regulatory agency updates. Always cite official government sources and include dates when available. Focus on actionable compliance information. Be concise but comprehensive.'
            },
            {
              role: 'user',
              content: enhancedQuery
            }
          ],
          max_tokens: 800, // Reduced for faster response
          temperature: 0.1, // Lower for more consistent results
          top_p: 0.9
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        logStep("Perplexity API error details", { 
          status: response.status, 
          statusText: response.statusText, 
          errorData: errorData 
        });
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const data = await response.json();
      logStep("Perplexity API response received successfully", { 
        fullResponse: JSON.stringify(data, null, 2)
      });

      // Process the response - extract content and citations
      const content = data.choices[0].message.content;
      
      // Try to extract citations from multiple possible locations
      let citations = [];
      
      // Check if API provides citations directly
      if (data.citations && Array.isArray(data.citations)) {
        citations = data.citations;
        logStep("Found citations in API response", { count: citations.length });
      } else if (data.choices[0].citations && Array.isArray(data.choices[0].citations)) {
        citations = data.choices[0].citations;
        logStep("Found citations in choices", { count: citations.length });
      } else {
        // Extract from content
        citations = extractCitations(content);
        logStep("Extracted citations from content", { count: citations.length });
      }
      
      // Create proper source objects with URLs and titles
      const sources = createSourcesFromCitations(citations, content);
      
      logStep("Final sources created", { 
        citationsCount: citations.length,
        sourcesCount: sources.length,
        sources: sources
      });

      const result = {
        content: content,
        response: content, // Keep for backwards compatibility
        sources: sources,
        citations: citations,
        related_questions: data.choices[0].message.related_questions || [],
        urgency_score: calculateUrgencyScore(content),
        agencies_mentioned: extractAgencies(content),
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
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        logStep("Perplexity API request timed out");
        throw new Error('Request timed out. Please try again with a shorter query.');
      }
      throw error;
    }


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
  const urlPattern = /https?:\/\/[^\s\)\]]+/g;
  const matches = content.match(urlPattern);
  
  if (matches) {
    matches.forEach(url => {
      // Clean up URLs (remove trailing punctuation)
      const cleanUrl = url.replace(/[.,;!?]+$/, '');
      if (cleanUrl.includes('fda.gov') || cleanUrl.includes('usda.gov') || 
          cleanUrl.includes('epa.gov') || cleanUrl.includes('federalregister.gov') ||
          cleanUrl.includes('cdc.gov') || cleanUrl.includes('foodsafety.gov')) {
        citations.push(cleanUrl);
      }
    });
  }
  
  // If no URLs found in content, fall back to intelligent sources
  if (citations.length === 0) {
    const intelligentSources = createIntelligentSources(content);
    citations.push(...intelligentSources.map(s => s.url));
  }
  
  return [...new Set(citations)]; // Remove duplicates
}

function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Extract meaningful title from path
    if (pathname.includes('recalls') || pathname.includes('safety-alerts')) {
      return 'FDA Recalls & Safety Alerts';
    } else if (pathname.includes('enforcement') || pathname.includes('warning-letters')) {
      return 'FDA Enforcement Reports';
    } else if (pathname.includes('fsis')) {
      return 'USDA FSIS Alerts';
    } else if (pathname.includes('epa.gov')) {
      return 'EPA Regulatory Information';
    } else if (pathname.includes('cdc.gov')) {
      return 'CDC Health & Safety Updates';
    } else if (pathname.includes('foodsafety.gov')) {
      return 'FoodSafety.gov Resources';
    } else {
      // Extract domain name as fallback
      return urlObj.hostname.replace('www.', '').toUpperCase() + ' Official Source';
    }
  } catch {
    return 'Government Source';
  }
}

function createSourcesFromCitations(citations: any[], content: string): Array<{title: string, url: string}> {
  const sources: Array<{title: string, url: string}> = [];
  
  // If citations are strings (URLs), use them directly
  if (citations.length > 0 && typeof citations[0] === 'string') {
    citations.forEach(citation => {
      if (citation.startsWith('http')) {
        const title = extractIntelligentTitle(citation, content);
        sources.push({
          title: title,
          url: citation
        });
      }
    });
  } 
  // If citations are objects with title/url properties
  else if (citations.length > 0 && typeof citations[0] === 'object') {
    citations.forEach(citation => {
      if (citation.url) {
        sources.push({
          title: citation.title || extractIntelligentTitle(citation.url, content),
          url: citation.url
        });
      }
    });
  }
  
  // If we still don't have sources, create intelligent defaults based on content
  if (sources.length === 0) {
    const defaultSources = createIntelligentSources(content);
    sources.push(...defaultSources);
  }
  
  return sources;
}

function extractIntelligentTitle(url: string, content?: string): string {
  // Extract domain for better titles
  const domain = url.match(/https?:\/\/([^\/]+)/)?.[1] || '';
  const upperDomain = domain.toUpperCase();
  
  // Agency-specific titles
  if (domain.includes('fda.gov')) {
    return 'FDA.GOV Official Source';
  } else if (domain.includes('cdc.gov')) {
    return 'CDC.GOV Official Source';  
  } else if (domain.includes('usda.gov')) {
    return 'USDA.GOV Official Source';
  } else if (domain.includes('epa.gov')) {
    return 'EPA.GOV Official Source';
  } else if (domain.includes('mhra.gov') || domain.includes('gov.uk')) {
    return 'GOV.UK Official Source';
  } else if (domain.includes('cpsc.gov')) {
    return 'CPSC.GOV Official Source';
  } else if (domain.includes('who.int')) {
    return 'WHO.INT Official Source';
  } else if (domain.includes('.gov')) {
    return `${upperDomain.replace('.GOV', '.GOV')} Official Source`;
  } else {
    return `${upperDomain} Official Source`;
  }
}

function createIntelligentSources(content: string): Array<{title: string, url: string}> {
  const sources: Array<{title: string, url: string}> = [];
  const lowerContent = content.toLowerCase();
  
  // UK/MHRA specific sources
  if (lowerContent.includes('mhra') || lowerContent.includes('uk') || lowerContent.includes('medicines and healthcare')) {
    sources.push({
      title: 'MHRA Official Guidance',
      url: 'https://www.gov.uk/government/organisations/medicines-and-healthcare-products-regulatory-agency'
    });
    sources.push({
      title: 'MHRA Guidance Documents',
      url: 'https://www.gov.uk/guidance/apply-for-a-licence-to-manufacture-medicines'
    });
  }
  
  // Decentralized manufacturing specific
  if (lowerContent.includes('decentrali') || lowerContent.includes('designation') || lowerContent.includes('manufacturing')) {
    sources.push({
      title: 'MHRA Decentralised Manufacture Guidance',
      url: 'https://www.gov.uk/government/publications/decentralised-manufacture-guidance'
    });
  }
  
  // FDA sources
  if (lowerContent.includes('fda') || lowerContent.includes('recall') || lowerContent.includes('food safety')) {
    sources.push({
      title: 'FDA Recalls & Safety Alerts',
      url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts'
    });
  }
  
  // USDA sources
  if (lowerContent.includes('usda') || lowerContent.includes('meat') || lowerContent.includes('poultry')) {
    sources.push({
      title: 'USDA FSIS Recalls',
      url: 'https://www.fsis.usda.gov/news-events/recalls'
    });
  }
  
  // Generic regulatory source if nothing specific matches
  if (sources.length === 0) {
    sources.push({
      title: 'Government Regulatory Information',
      url: 'https://www.federalregister.gov/'
    });
  }
  
  return sources;
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