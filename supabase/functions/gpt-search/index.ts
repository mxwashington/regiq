import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  agencies?: string[];
  industry?: string;
  timeRange?: string;
  searchType?: 'enhanced_keywords' | 'summary_generation' | 'smart_search';
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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    if (!query || query.trim() === '') {
      return new Response(JSON.stringify({ error: 'Search query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check cache first
    const cacheKey = `gpt_search:${btoa(JSON.stringify({ query, agencies, industry, timeRange, searchType }))}`;
    const { data: cachedResult } = await supabaseClient
      .from('search_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (cachedResult) {
      return new Response(JSON.stringify({
        ...cachedResult.result,
        cached: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build enhanced query
    const enhancedQuery = buildRegulatoryQuery({ query, agencies, industry, timeRange, searchType });

    let result: SearchResult;

    switch (searchType) {
      case 'enhanced_keywords':
        result = await generateEnhancedKeywords(enhancedQuery, query);
        break;
      case 'summary_generation':
        result = await generateAlertSummary(enhancedQuery, query);
        break;
      case 'smart_search':
      default:
        result = await performSmartSearch(enhancedQuery, query, agencies);
        break;
    }

    // Cache the result
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Cache for 1 hour

    await supabaseClient
      .from('search_cache')
      .insert({
        cache_key: cacheKey,
        result,
        expires_at: expiresAt.toISOString()
      });

    // Log the search
    await supabaseClient
      .from('search_logs')
      .insert({
        user_id: user.id,
        query,
        search_type: searchType,
        agencies,
        industry,
        time_range: timeRange,
        result_count: result.citations.length,
        urgency_score: result.urgencyScore
      });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gpt-search function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateEnhancedKeywords(enhancedQuery: string, originalQuery: string): Promise<SearchResult> {
  const prompt = `Extract the most important search keywords from this regulatory alert title for finding the original document:

"${originalQuery}"

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
    citations: [],
    relatedQuestions: [],
    urgencyScore: 0,
    agenciesMentioned: [],
    searchType: 'enhanced_keywords',
    query: originalQuery,
    timestamp: new Date().toISOString(),
    cached: false,
    enhancedKeywords
  };
}

async function generateAlertSummary(enhancedQuery: string, originalQuery: string): Promise<SearchResult> {
  const prompt = `Summarize this regulatory alert in 1-2 clear sentences focusing on what compliance professionals need to know:

${originalQuery}

Focus on: What product/company is affected, what the issue is, and what action is required.`;

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
    citations: [],
    relatedQuestions: [],
    urgencyScore: calculateUrgencyScore(smartSummary),
    agenciesMentioned: extractAgencies(smartSummary),
    searchType: 'summary_generation',
    query: originalQuery,
    timestamp: new Date().toISOString(),
    cached: false,
    smartSummary
  };
}

async function performSmartSearch(enhancedQuery: string, originalQuery: string, agencies?: string[]): Promise<SearchResult> {
  const prompt = `As a regulatory compliance expert, analyze this query and provide comprehensive insights:

Query: ${enhancedQuery}

Provide:
1. A clear summary of the regulatory implications
2. Key agencies likely involved
3. Urgency level (1-10) and reasoning
4. Related regulatory areas to monitor
5. Suggested search terms for finding official documents

Focus on actionable insights for compliance professionals.`;

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
          content: 'You are a regulatory compliance expert helping professionals understand regulatory alerts and find relevant information.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 800,
      temperature: 0.2
    }),
  });

  const data = await response.json();
  const content = data.choices[0].message.content;

  return {
    content,
    citations: extractCitations(content),
    relatedQuestions: extractRelatedQuestions(content),
    urgencyScore: calculateUrgencyScore(content),
    agenciesMentioned: extractAgencies(content),
    searchType: 'smart_search',
    query: originalQuery,
    timestamp: new Date().toISOString(),
    cached: false
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