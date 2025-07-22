import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ENHANCED-GPT-SEARCH] ${step}${detailsStr}`);
};

interface SearchRequest {
  query: string;
  agencies?: string[];
  industry?: string;
  timeRange?: string;
  searchType?: 'enhanced_keywords' | 'summary_generation' | 'smart_search';
}

interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface SearchResult {
  content: string;
  citations: string[];
  relatedQuestions: string[];
  urgencyScore: number;
  agenciesMentioned: string[];
  searchType: string;
  query: string;
  timestamp: string;
  cached: boolean;
  enhancedKeywords?: string;
  smartSummary?: string;
  webResults?: WebSearchResult[];
  rssData?: any[];
  databaseAlerts?: any[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Get auth user
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query, agencies, industry, timeRange, searchType = 'smart_search' }: SearchRequest = await req.json();
    logStep("Search request received", { query, agencies, industry, timeRange, searchType });

    if (!query || query.trim() === '') {
      return new Response(JSON.stringify({ error: 'Search query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check cache first
    const cacheKey = `enhanced_gpt_search:${btoa(JSON.stringify({ query, agencies, industry, timeRange, searchType }))}`;
    const { data: cachedResult } = await supabaseClient
      .from('search_cache')
      .select('result_data')
      .eq('cache_key', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (cachedResult) {
      logStep("Returning cached result");
      return new Response(JSON.stringify({
        ...cachedResult.result_data,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build enhanced query
    const enhancedQuery = buildRegulatoryQuery({ query, agencies, industry, timeRange, searchType });
    logStep("Enhanced query built", { enhancedQuery });

    // Get data from multiple sources in parallel - PRIORITIZE LIVE DASHBOARD DATA
    logStep("Starting parallel data collection - prioritizing live dashboard alerts");
    const [databaseAlerts, webResults, rssData] = await Promise.all([
      searchDatabaseAlerts(supabaseClient, query, agencies, timeRange), // First priority: live data
      performWebSearch(enhancedQuery, agencies),  // Second priority: web search
      searchRSSFeeds(supabaseClient, enhancedQuery, agencies) // Third priority: RSS feeds
    ]);

    logStep("Data collection completed", { 
      databaseAlertsCount: databaseAlerts.length,
      webResultsCount: webResults.length,
      rssDataCount: rssData.length,
      mostRecentDashboardAlert: databaseAlerts[0]?.published_date,
      dataFreshness: databaseAlerts.length > 0 ? 'Live dashboard data available' : 'No recent dashboard data'
    });

    let result: SearchResult;

    switch (searchType) {
      case 'enhanced_keywords':
        result = await generateEnhancedKeywords(enhancedQuery, query, webResults, databaseAlerts);
        break;
      case 'summary_generation':
        result = await generateAlertSummary(enhancedQuery, query, webResults, databaseAlerts);
        break;
      case 'smart_search':
      default:
        result = await performSmartSearch(enhancedQuery, query, agencies, webResults, databaseAlerts, rssData);
        break;
    }

    // Cache the result
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Cache for 1 hour

    await supabaseClient
      .from('search_cache')
      .upsert({
        cache_key: cacheKey,
        query: query,
        result_data: result,
        expires_at: expiresAt.toISOString()
      });

    logStep("Result cached successfully");

    // Log the search with correct search_type values
    const validSearchType = query.toLowerCase().includes('recall') ? 'recalls' : 
                           query.toLowerCase().includes('deadline') ? 'deadlines' :
                           query.toLowerCase().includes('guidance') ? 'guidance' : 'general';
    
    await supabaseClient
      .from('perplexity_searches')
      .insert({
        user_id: user.id,
        query,
        search_type: validSearchType,
        agencies,
        industry,
        tokens_used: result.content.length, // Approximate token count
        success: true
      });

    logStep("Search logged successfully");

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in enhanced-gpt-search", { 
      message: errorMessage, 
      stack: error instanceof Error ? error.stack : undefined 
    });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Enhanced web search function with real Tavily API calls
async function performWebSearch(query: string, agencies?: string[]): Promise<WebSearchResult[]> {
  try {
    logStep("Starting real web search with Tavily", { query, agencies });
    
    const results: WebSearchResult[] = [];
    
    // Use Tavily for real-time web search
    const tavilyApiKey = Deno.env.get('TAVILY_API_KEY');
    if (tavilyApiKey) {
      try {
        // Build search query targeting government sites
        const searchQuery = agencies?.length 
          ? `${query} site:${agencies.map(a => `${a.toLowerCase()}.gov`).join(' OR site:')}`
          : `${query} site:fda.gov OR site:usda.gov OR site:epa.gov OR site:cdc.gov`;

        logStep("Calling Tavily API", { searchQuery });

        const tavilyResponse = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: tavilyApiKey,
            query: searchQuery,
            search_depth: 'advanced',
            include_answer: false,
            include_raw_content: true,
            max_results: 8,
            include_domains: ['fda.gov', 'usda.gov', 'epa.gov', 'cdc.gov', 'federalregister.gov', 'osha.gov'],
            exclude_domains: []
          })
        });

        if (tavilyResponse.ok) {
          const tavilyData = await tavilyResponse.json();
          logStep("Tavily API response", { 
            resultsCount: tavilyData.results?.length || 0,
            status: tavilyResponse.status 
          });

          if (tavilyData.results && Array.isArray(tavilyData.results)) {
            for (const result of tavilyData.results.slice(0, 6)) {
              // Determine source agency from URL
              let source = "Government";
              if (result.url.includes('fda.gov')) source = "FDA";
              else if (result.url.includes('usda.gov')) source = "USDA";
              else if (result.url.includes('epa.gov')) source = "EPA";
              else if (result.url.includes('cdc.gov')) source = "CDC";
              else if (result.url.includes('osha.gov')) source = "OSHA";
              else if (result.url.includes('federalregister.gov')) source = "Federal Register";

              results.push({
                title: result.title || "Government Source",
                url: result.url,
                snippet: result.content?.substring(0, 200) || "Regulatory information source",
                source: source
              });
            }
            logStep("Added Tavily search results", { count: results.length });
          }
        } else {
          const errorText = await tavilyResponse.text();
          logStep("Tavily API failed", { 
            status: tavilyResponse.status, 
            error: errorText 
          });
        }
      } catch (tavilyError) {
        logStep("Tavily search failed", { error: tavilyError.message });
      }
    } else {
      logStep("No Tavily API key found, using fallback");
    }

    // Enhanced fallback: Call FDA API directly for recalls if query mentions recalls
    if (query.toLowerCase().includes('recall') && (results.length === 0 || !agencies || agencies.includes('FDA'))) {
      try {
        logStep("Calling FDA openFDA API for recalls");
        
        const fdaResponse = await fetch('https://api.fda.gov/food/enforcement.json?limit=5');
        if (fdaResponse.ok) {
          const fdaData = await fdaResponse.json();
          if (fdaData.results && fdaData.results.length > 0) {
            fdaData.results.slice(0, 3).forEach((recall: any, index: number) => {
              results.push({
                title: `FDA Recall: ${recall.product_description?.substring(0, 80) || 'Food Product'}`,
                url: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
                snippet: `${recall.reason_for_recall || 'Safety recall'} - ${recall.distribution_pattern || 'Multiple states'}`,
                source: "FDA"
              });
            });
            logStep("Added FDA API recall results", { count: fdaData.results.length });
          }
        }
      } catch (fdaError) {
        logStep("FDA API call failed", { error: fdaError.message });
      }
    }

    // Fallback to targeted searches only if no real results found
    if (results.length === 0) {
      logStep("Using static fallback sources");
      
      const searchTerms = query.toLowerCase();
      
      if (!agencies || agencies.includes('FDA') || searchTerms.includes('fda') || searchTerms.includes('food')) {
        results.push({
          title: "FDA Food Safety and Applied Nutrition",
          url: "https://www.fda.gov/food",
          snippet: "Current FDA regulations, guidance documents, and safety alerts for food industry compliance.",
          source: "FDA"
        });
        
        if (searchTerms.includes('recall')) {
          results.push({
            title: "FDA Recalls, Market Withdrawals, & Safety Alerts",
            url: "https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts",
            snippet: "Latest FDA recalls and safety alerts affecting food products.",
            source: "FDA"
          });
        }
      }
      
      if (!agencies || agencies.includes('USDA') || searchTerms.includes('usda') || searchTerms.includes('meat') || searchTerms.includes('agriculture')) {
        results.push({
          title: "USDA Food Safety and Inspection Service",
          url: "https://www.fsis.usda.gov/",
          snippet: "USDA regulations for meat, poultry, and egg product safety and inspection.",
          source: "USDA"
        });
      }
    }
    
    logStep("Web search completed", { resultsCount: results.length });
    return results;
    
  } catch (error) {
    logStep("Web search error", { error: error.message });
    return [];
  }
}

// Search database alerts function - prioritize fresh data
async function searchDatabaseAlerts(supabaseClient: any, query: string, agencies?: string[], timeRange?: string): Promise<any[]> {
  try {
    logStep("Searching live dashboard alerts first", { query, agencies, timeRange });
    
    // First priority: Get the most recent alerts (last 24-48 hours)
    let queryBuilder = supabaseClient
      .from('alerts')
      .select('*')
      .order('published_date', { ascending: false })
      .limit(50); // Get more results to ensure we have fresh data
    
    // Default to last 7 days for "most recent" queries, last 24 hours for priority
    const now = new Date();
    let startDate = new Date();
    
    if (timeRange) {
      switch (timeRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
    } else {
      // For "most recent" queries, prioritize last 48 hours, fallback to 7 days
      const queryLower = query.toLowerCase();
      if (queryLower.includes('most recent') || queryLower.includes('latest') || queryLower.includes('current')) {
        startDate.setDate(now.getDate() - 2); // Last 48 hours first
      } else {
        startDate.setDate(now.getDate() - 7); // Last 7 days
      }
    }
    
    queryBuilder = queryBuilder.gte('published_date', startDate.toISOString());
    
    // Filter by agencies if specified
    if (agencies && agencies.length > 0) {
      queryBuilder = queryBuilder.in('source', agencies);
    }
    
    // Search by keywords in title and summary
    const keywords = query.split(' ').filter(word => word.length > 2);
    if (keywords.length > 0) {
      const searchTerm = keywords.join(' | ');
      queryBuilder = queryBuilder.or(`title.ilike.%${query}%,summary.ilike.%${query}%`);
    }
    
    const { data: alerts, error } = await queryBuilder;
    
    if (error) {
      logStep("Database search error", { error: error.message });
      return [];
    }
    
    const freshAlerts = alerts || [];
    logStep("Database search completed", { 
      alertsCount: freshAlerts.length,
      dateRange: `${startDate.toISOString()} to ${now.toISOString()}`,
      mostRecentAlert: freshAlerts[0]?.published_date
    });
    
    // If no results in recent timeframe and query suggests "most recent", try expanding to 7 days
    if (freshAlerts.length === 0 && query.toLowerCase().includes('recent') && timeRange !== 'week') {
      logStep("No recent alerts found, expanding search to last 7 days");
      startDate.setDate(now.getDate() - 7);
      
      const expandedBuilder = supabaseClient
        .from('alerts')
        .select('*')
        .order('published_date', { ascending: false })
        .limit(20)
        .gte('published_date', startDate.toISOString());
      
      if (agencies && agencies.length > 0) {
        expandedBuilder.in('source', agencies);
      }
      
      if (keywords.length > 0) {
        expandedBuilder.or(`title.ilike.%${query}%,summary.ilike.%${query}%`);
      }
      
      const { data: expandedAlerts } = await expandedBuilder;
      return expandedAlerts || [];
    }
    
    return freshAlerts;
    
  } catch (error) {
    logStep("Database search error", { error: error.message });
    return [];
  }
}

// Search RSS feeds function
async function searchRSSFeeds(supabaseClient: any, query: string, agencies?: string[]): Promise<any[]> {
  try {
    logStep("Searching RSS feeds data", { query, agencies });
    
    // Get recent data sources and their latest content
    let queryBuilder = supabaseClient
      .from('regulatory_data_sources')
      .select('*')
      .eq('is_active', true)
      .order('last_successful_fetch', { ascending: false })
      .limit(10);
    
    if (agencies && agencies.length > 0) {
      queryBuilder = queryBuilder.in('agency', agencies);
    }
    
    const { data: dataSources, error } = await queryBuilder;
    
    if (error) {
      logStep("RSS feeds search error", { error: error.message });
      return [];
    }
    
    logStep("RSS feeds search completed", { sourcesCount: dataSources?.length || 0 });
    return dataSources || [];
    
  } catch (error) {
    logStep("RSS feeds search error", { error: error.message });
    return [];
  }
}

async function generateEnhancedKeywords(enhancedQuery: string, originalQuery: string, webResults: WebSearchResult[], databaseAlerts: any[]): Promise<SearchResult> {
  const contextData = `
Web Sources Available: ${webResults.map(r => r.title).join(', ')}
Recent Database Alerts: ${databaseAlerts.slice(0, 3).map(a => a.title).join(', ')}
  `;

  const prompt = `Extract the most important search keywords from this regulatory alert title for finding the original document:

"${originalQuery}"

Additional context from available sources:
${contextData}

Return only 3-4 key search terms that would help find this specific alert, removing regulatory jargon and focusing on product names, companies, and specific issues. Format as comma-separated terms.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 50,
      temperature: 0.1
    }),
  });

  const data = await response.json();
  const enhancedKeywords = data.choices[0].message.content.trim();

  return {
    content: `Enhanced keywords extracted: ${enhancedKeywords}`,
    citations: webResults.map(r => r.url),
    relatedQuestions: [],
    urgencyScore: 0,
    agenciesMentioned: [],
    searchType: 'enhanced_keywords',
    query: originalQuery,
    timestamp: new Date().toISOString(),
    cached: false,
    enhancedKeywords,
    webResults,
    databaseAlerts
  };
}

async function generateAlertSummary(enhancedQuery: string, originalQuery: string, webResults: WebSearchResult[], databaseAlerts: any[]): Promise<SearchResult> {
  const contextData = `
Related Web Sources: ${webResults.slice(0, 3).map(r => `${r.title}: ${r.snippet}`).join('\n')}
Recent Similar Alerts: ${databaseAlerts.slice(0, 2).map(a => `${a.title}: ${a.summary}`).join('\n')}
  `;

  const prompt = `Summarize this regulatory alert in 1-2 clear sentences focusing on what compliance professionals need to know:

${originalQuery}

Additional context:
${contextData}

Focus on: What product/company is affected, what the issue is, and what action is required. Use plain text only, no markdown formatting.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.3
    }),
  });

  const data = await response.json();
  const smartSummary = data.choices[0].message.content.trim();

  return {
    content: smartSummary,
    citations: webResults.map(r => r.url),
    relatedQuestions: [],
    urgencyScore: calculateUrgencyScore(smartSummary),
    agenciesMentioned: extractAgencies(smartSummary),
    searchType: 'summary_generation',
    query: originalQuery,
    timestamp: new Date().toISOString(),
    cached: false,
    smartSummary,
    webResults,
    databaseAlerts
  };
}

async function performSmartSearch(enhancedQuery: string, originalQuery: string, agencies?: string[], webResults?: WebSearchResult[], databaseAlerts?: any[], rssData?: any[]): Promise<SearchResult> {
  // Prioritize live dashboard data over web results
  const freshAlerts = databaseAlerts?.slice(0, 5) || [];
  const hasRecentData = freshAlerts.length > 0;
  
  // Build context starting with live dashboard data
  let alertsContext = '';
  if (hasRecentData) {
    alertsContext = freshAlerts.map(a => {
      const publishedDate = new Date(a.published_date);
      const hoursAgo = Math.round((Date.now() - publishedDate.getTime()) / (1000 * 60 * 60));
      return `LIVE DASHBOARD ALERT (${hoursAgo} hours ago): ${a.title}\nAgency: ${a.source}\nSummary: ${a.summary}\nUrgency: ${a.urgency}\nPublished: ${publishedDate.toISOString()}`;
    }).join('\n\n');
  }

  const webContext = webResults?.slice(0, 3).map(r => 
    `Web Source: ${r.source} - ${r.title}\nURL: ${r.url}\nDescription: ${r.snippet}`
  ).join('\n\n') || '';

  const rssContext = rssData?.slice(0, 2).map(r => 
    `Data Source: ${r.agency} - ${r.name}\nType: ${r.source_type}\nLast Updated: ${r.last_successful_fetch}`
  ).join('\n\n') || '';

  // Determine data freshness
  const currentTime = new Date();
  const dataFreshnessNote = hasRecentData 
    ? `\n\nDATA FRESHNESS: This response uses RegIQ's live dashboard data collected within the last ${Math.round((currentTime.getTime() - new Date(freshAlerts[0].published_date).getTime()) / (1000 * 60 * 60))} hours.`
    : '\n\nDATA FRESHNESS: No recent alerts found in RegIQ\'s live dashboard. Using web search results.';

  const prompt = `As a regulatory compliance expert using RegIQ's live monitoring system, analyze this query using PRIORITY DATA SOURCES:

Query: ${enhancedQuery}

PRIORITY 1 - LIVE DASHBOARD DATA (Most Recent Alerts):
${alertsContext || 'No recent alerts found in live dashboard'}

PRIORITY 2 - Web Sources (if needed):
${webContext}

PRIORITY 3 - RSS Data Sources:
${rssContext}

${dataFreshnessNote}

CRITICAL: Respond in PLAIN TEXT ONLY. Do not use any markdown formatting.

Response Format Requirements:
- Use plain text only, no markdown syntax
- No bold (**text**), italic (*text*), or header (###) formatting
- Use simple bullet points with • symbol, not markdown dashes (-)
- Write in clear, readable paragraphs
- Use colons (:) for emphasis instead of bold text
- Keep responses conversational and professional

DATA PRIORITIZATION RULES:
1. If live dashboard data exists, START with those alerts and their timestamps
2. Always mention how recent the information is (hours/days ago)
3. Flag if information is older than 48 hours
4. For "most recent" queries, focus ONLY on alerts from last 7 days
5. If no recent data exists, clearly state this limitation

Provide:
1. Current regulatory status based on live dashboard data (if available)
2. Most recent alerts with specific timestamps 
3. Key agencies involved
4. Urgency assessment based on data recency
5. Related areas to monitor
6. Data freshness disclaimer

Focus on the most current information available in RegIQ's live monitoring system.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: 'You are RegIQ\'s AI assistant with access to live regulatory monitoring data. Always prioritize live dashboard data over web search results. Always respond in plain text without any markdown formatting. Include timestamps and data freshness information.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1200,
      temperature: 0.2
    }),
  });

  const data = await response.json();
  const content = data.choices[0].message.content;

  return {
    content,
    citations: [...(webResults?.map(r => r.url) || []), ...extractCitations(content)],
    relatedQuestions: extractRelatedQuestions(content),
    urgencyScore: calculateUrgencyScore(content),
    agenciesMentioned: extractAgencies(content),
    searchType: 'smart_search',
    query: originalQuery,
    timestamp: new Date().toISOString(),
    cached: false,
    webResults,
    databaseAlerts,
    rssData
  };
}

function buildRegulatoryQuery(request: SearchRequest): string {
  let enhancedQuery = request.query;

  if (request.agencies && request.agencies.length > 0) {
    enhancedQuery += ` related to ${request.agencies.join(', ')}`;
  }

  if (request.industry) {
    enhancedQuery += ` in ${request.industry} industry`;
  }

  if (request.timeRange) {
    const timeMap: Record<string, string> = {
      'today': 'published today',
      'week': 'from the past week',
      'month': 'from the past month',
      'quarter': 'from the past quarter',
      'year': 'from the past year'
    };
    enhancedQuery += ` ${timeMap[request.timeRange] || ''}`;
  }

  return enhancedQuery;
}

function extractCitations(content: string): string[] {
  // Extract potential URLs or references from GPT response
  const urlRegex = /https?:\/\/[^\s)]+/g;
  const matches = content.match(urlRegex) || [];
  
  // For GPT responses, we'll generate suggested government domains to search
  const govDomains = [
    'fda.gov', 'usda.gov', 'epa.gov', 'cdc.gov', 'osha.gov',
    'ftc.gov', 'sec.gov', 'cpsc.gov'
  ];
  
  return [...matches, ...govDomains.slice(0, 3)];
}

function extractRelatedQuestions(content: string): string[] {
  // Extract or generate related questions based on content
  return [
    "What are the compliance requirements?",
    "Which products are affected?",
    "What is the timeline for action?",
    "Are there similar alerts to monitor?"
  ];
}

function calculateUrgencyScore(content: string): number {
  const urgentKeywords = [
    'immediate', 'urgent', 'critical', 'emergency', 'recall',
    'safety', 'hazard', 'risk', 'violation', 'enforcement'
  ];
  
  const lowercaseContent = content.toLowerCase();
  const matches = urgentKeywords.filter(keyword => 
    lowercaseContent.includes(keyword)
  ).length;
  
  return Math.min(Math.max(matches * 2, 1), 10);
}

function extractAgencies(content: string): string[] {
  const agencies = [
    'FDA', 'USDA', 'EPA', 'CDC', 'OSHA', 'FTC', 'SEC', 'CPSC',
    'MHRA', 'EMA', 'EFSA', 'Health Canada'
  ];
  
  return agencies.filter(agency => 
    content.toUpperCase().includes(agency)
  );
}