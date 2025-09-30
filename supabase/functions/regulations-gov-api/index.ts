// Simple logger for edge functions
const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || '')
};

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  logger.info(`[REGULATIONS-GOV-API] ${step}${detailsStr}`);
};

interface RegulationsGovRequest {
  action: 'search' | 'get_document' | 'get_comments' | 'sync_recent';
  query?: string;
  documentId?: string;
  agencyId?: string;
  documentType?: 'Rule' | 'Proposed Rule' | 'Notice' | 'Other';
  postedDate?: string;
  limit?: number;
  offset?: number;
}

const REGULATIONS_BASE_URL = 'https://api.regulations.gov/v4';

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
    logStep("Regulations.gov API function started");

    const apiKey = Deno.env.get("REGULATIONS_GOV_API_KEY");
    if (!apiKey) {
      throw new Error("Regulations.gov API key not configured");
    }

    const body = await req.json() as RegulationsGovRequest;
    const { action } = body;

    switch (action) {
      case 'search':
        return await searchDocuments(supabaseClient, apiKey, body);
      case 'get_document':
        return await getDocument(supabaseClient, apiKey, body);
      case 'get_comments':
        return await getComments(supabaseClient, apiKey, body);
      case 'sync_recent':
        return await syncRecentDocuments(supabaseClient, apiKey, body);
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in regulations-gov-api", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function searchDocuments(supabase: any, apiKey: string, params: RegulationsGovRequest) {
  const searchParams = new URLSearchParams({
    'api_key': apiKey,
    'page[size]': (params.limit || 25).toString(),
    'page[number]': Math.floor((params.offset || 0) / (params.limit || 25)).toString()
  });

  if (params.query) {
    searchParams.append('filter[searchTerm]', params.query);
  }
  
  if (params.agencyId) {
    searchParams.append('filter[agencyId]', params.agencyId);
  }

  if (params.documentType) {
    searchParams.append('filter[documentType]', params.documentType);
  }

  if (params.postedDate) {
    searchParams.append('filter[postedDate][ge]', params.postedDate);
  }

  // Default to last 30 days
  if (!params.postedDate) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    searchParams.append('filter[postedDate][ge]', thirtyDaysAgo.toISOString().split('T')[0]);
  }

  const url = `${REGULATIONS_BASE_URL}/documents?${searchParams}`;
  
  logStep(`Searching documents: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'X-API-Key': apiKey,
      'Accept': 'application/vnd.api+json'
    }
  });

  if (!response.ok) {
    throw new Error(`Regulations.gov API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform results to match our alert format
  const alerts = data.data?.map((doc: any) => ({
    id: doc.id,
    title: doc.attributes.title || 'Untitled Document',
    documentType: doc.attributes.documentType,
    agencyId: doc.attributes.agencyId,
    postedDate: doc.attributes.postedDate,
    summary: doc.attributes.summary || doc.attributes.title,
    openForComment: doc.attributes.openForComment,
    commentEndDate: doc.attributes.commentEndDate,
    url: `https://www.regulations.gov/document/${doc.id}`
  })) || [];

  return new Response(JSON.stringify({ 
    documents: alerts,
    meta: data.meta || {},
    total: data.meta?.totalElements || 0
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function getDocument(supabase: any, apiKey: string, params: RegulationsGovRequest) {
  if (!params.documentId) {
    throw new Error("Document ID is required");
  }

  const url = `${REGULATIONS_BASE_URL}/documents/${params.documentId}?api_key=${apiKey}`;
  
  logStep(`Getting document: ${params.documentId}`);
  
  const response = await fetch(url, {
    headers: {
      'X-API-Key': apiKey,
      'Accept': 'application/vnd.api+json'
    }
  });

  if (!response.ok) {
    throw new Error(`Regulations.gov API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function getComments(supabase: any, apiKey: string, params: RegulationsGovRequest) {
  if (!params.documentId) {
    throw new Error("Document ID is required");
  }

  const searchParams = new URLSearchParams({
    'api_key': apiKey,
    'filter[docketId]': params.documentId,
    'page[size]': (params.limit || 25).toString(),
    'page[number]': Math.floor((params.offset || 0) / (params.limit || 25)).toString()
  });

  const url = `${REGULATIONS_BASE_URL}/comments?${searchParams}`;
  
  logStep(`Getting comments for: ${params.documentId}`);
  
  const response = await fetch(url, {
    headers: {
      'X-API-Key': apiKey,
      'Accept': 'application/vnd.api+json'
    }
  });

  if (!response.ok) {
    throw new Error(`Regulations.gov API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function syncRecentDocuments(supabase: any, apiKey: string, params: RegulationsGovRequest) {
  // Get documents from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const searchParams = new URLSearchParams({
    'api_key': apiKey,
    'filter[postedDate][ge]': sevenDaysAgo.toISOString().split('T')[0],
    'page[size]': '100',
    'sort': '-postedDate'
  });

  // Focus on high-priority document types and agencies
  const priorityAgencies = ['FDA', 'EPA', 'OSHA', 'USDA', 'CDC'];
  const priorityTypes = ['Rule', 'Proposed Rule'];

  let totalProcessed = 0;

  for (const agency of priorityAgencies) {
    for (const docType of priorityTypes) {
      try {
        const agencySearchParams = new URLSearchParams(searchParams);
        agencySearchParams.set('filter[agencyId]', agency);
        agencySearchParams.set('filter[documentType]', docType);

        const url = `${REGULATIONS_BASE_URL}/documents?${agencySearchParams}`;
        
        logStep(`Syncing ${agency} ${docType} documents`);
        
        const response = await fetch(url, {
          headers: {
            'X-API-Key': apiKey,
            'Accept': 'application/vnd.api+json'
          }
        });

        if (!response.ok) {
          logStep(`Error fetching ${agency} ${docType}: ${response.status}`);
          continue;
        }

        const data = await response.json();

        if (data.data && data.data.length > 0) {
          for (const doc of data.data) {
            const alert = {
              title: `${agency} ${docType}: ${doc.attributes.title}`,
              source: 'Regulations.gov',
              urgency: determineUrgency(doc.attributes),
              summary: doc.attributes.summary || doc.attributes.title,
              published_date: new Date(doc.attributes.postedDate).toISOString(),
              external_url: `https://www.regulations.gov/document/${doc.id}`,
              full_content: JSON.stringify(doc),
              agency: doc.attributes.agencyId,
              region: 'US'
            };

            // Check if already exists
            const { data: existing } = await supabase
              .from('alerts')
              .select('id')
              .eq('title', alert.title)
              .eq('source', alert.source)
              .gte('published_date', sevenDaysAgo.toISOString())
              .maybeSingle();

            if (!existing) {
              const { error } = await supabase
                .from('alerts')
                .insert(alert);

              if (!error) {
                totalProcessed++;
                logStep(`Added Regulations.gov alert: ${alert.title}`);
              }
            }
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        logStep(`Error processing ${agency} ${docType}:`, error);
      }
    }
  }

  return new Response(JSON.stringify({ 
    message: `Processed ${totalProcessed} Regulations.gov documents`,
    processed: totalProcessed 
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

function determineUrgency(attributes: any): string {
  const title = (attributes.title || '').toLowerCase();
  const summary = (attributes.summary || '').toLowerCase();
  const text = `${title} ${summary}`;

  // High urgency keywords
  const highUrgencyKeywords = [
    'recall', 'emergency', 'immediate', 'urgent', 'critical', 'danger', 
    'hazard', 'death', 'injury', 'contamination', 'outbreak', 'violation',
    'enforcement', 'penalty', 'warning', 'alert'
  ];

  // Medium urgency keywords  
  const mediumUrgencyKeywords = [
    'rule', 'regulation', 'compliance', 'requirement', 'standard', 
    'guideline', 'policy', 'proposed', 'final', 'effective'
  ];

  if (highUrgencyKeywords.some(keyword => text.includes(keyword))) {
    return 'High';
  } else if (mediumUrgencyKeywords.some(keyword => text.includes(keyword))) {
    return 'Medium';  
  }

  return 'Low';
}