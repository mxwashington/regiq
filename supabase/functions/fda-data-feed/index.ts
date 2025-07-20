import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FDA-DATA-FEED] ${step}${detailsStr}`);
};

interface FDASearchParams {
  search?: string;
  limit?: number;
  skip?: number;
  sort?: string;
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
    logStep("FDA Data Feed function started");

    // This function fetches FDA data and pushes it to the alerts feed
    const { action, ...params } = await req.json();

    switch (action) {
      case 'fetch_recent_recalls':
        return await fetchRecentRecalls(supabaseClient, params);
      case 'fetch_class_i_recalls':
        return await fetchClassIRecalls(supabaseClient);
      case 'fetch_drug_shortages':
        return await fetchDrugShortages(supabaseClient);
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in fda-data-feed", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function fetchRecentRecalls(supabase: any, params: any) {
  const days = params.days || 30;
  const date = new Date();
  date.setDate(date.getDate() - days);
  const dateString = date.toISOString().split('T')[0];
  
  // Fetch FDA enforcement data
  const endpoints = [
    { name: 'Food Enforcement', url: '/food/enforcement.json' },
    { name: 'Drug Enforcement', url: '/drug/enforcement.json' },
    { name: 'Device Enforcement', url: '/device/enforcement.json' }
  ];

  let totalProcessed = 0;

  for (const endpoint of endpoints) {
    try {
      const searchQuery = `recall_initiation_date:[${dateString}+TO+*]`;
      const url = `https://api.fda.gov${endpoint.url}?search=${encodeURIComponent(searchQuery)}&limit=20&sort=recall_initiation_date:desc`;
      
      logStep(`Fetching FDA data from ${endpoint.name}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        logStep(`FDA API error for ${endpoint.name}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        for (const item of data.results) {
          const alert = {
            title: `${item.classification || 'Class Unknown'}: ${item.product_description || 'FDA Recall'}`,
            source: 'FDA',
            urgency: getUrgencyFromClassification(item.classification),
            summary: `${item.reason_for_recall || 'No reason provided'} - ${item.company_name || 'Unknown company'}`,
            published_date: item.recall_initiation_date ? new Date(item.recall_initiation_date).toISOString() : new Date().toISOString(),
            external_url: `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`,
            full_content: JSON.stringify(item)
          };

          // Check if already exists
          const { data: existing } = await supabase
            .from('alerts')
            .select('id')
            .eq('title', alert.title)
            .eq('source', alert.source)
            .gte('published_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase
              .from('alerts')
              .insert(alert);

            if (!error) {
              totalProcessed++;
              logStep(`Added FDA alert: ${alert.title}`);
            }
          }
        }
      }

      // Rate limit pause
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      logStep(`Error processing ${endpoint.name}:`, error);
    }
  }

  return new Response(JSON.stringify({ 
    message: `Processed ${totalProcessed} FDA alerts`,
    processed: totalProcessed 
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function fetchClassIRecalls(supabase: any) {
  const url = 'https://api.fda.gov/food/enforcement.json?search=classification:"Class+I"&limit=20&sort=recall_initiation_date:desc';
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FDA API error: ${response.status}`);
    }

    const data = await response.json();
    let processed = 0;

    if (data.results) {
      for (const item of data.results) {
        const alert = {
          title: `Class I Recall: ${item.product_description || 'FDA Food Recall'}`,
          source: 'FDA',
          urgency: 'High',
          summary: `URGENT: ${item.reason_for_recall || 'Critical food safety issue'} - ${item.company_name || 'Unknown company'}`,
          published_date: item.recall_initiation_date ? new Date(item.recall_initiation_date).toISOString() : new Date().toISOString(),
          external_url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts',
          full_content: JSON.stringify(item)
        };

        const { data: existing } = await supabase
          .from('alerts')
          .select('id')
          .eq('title', alert.title)
          .eq('source', alert.source)
          .gte('published_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from('alerts')
            .insert(alert);

          if (!error) {
            processed++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: `Processed ${processed} Class I recalls`,
      processed 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    throw new Error(`Failed to fetch Class I recalls: ${error.message}`);
  }
}

async function fetchDrugShortages(supabase: any) {
  const url = 'https://api.fda.gov/drug/shortages.json?limit=20';
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FDA API error: ${response.status}`);
    }

    const data = await response.json();
    let processed = 0;

    if (data.results) {
      for (const item of data.results) {
        const alert = {
          title: `Drug Shortage: ${item.product_name || 'Unknown Drug'}`,
          source: 'FDA',
          urgency: 'Medium',
          summary: `${item.reason || 'Drug shortage reported'} - Status: ${item.status || 'Unknown'}`,
          published_date: item.revision_date ? new Date(item.revision_date).toISOString() : new Date().toISOString(),
          external_url: 'https://www.accessdata.fda.gov/scripts/drugshortages/',
          full_content: JSON.stringify(item)
        };

        const { data: existing } = await supabase
          .from('alerts')
          .select('id')
          .eq('title', alert.title)
          .eq('source', alert.source)
          .gte('published_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from('alerts')
            .insert(alert);

          if (!error) {
            processed++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: `Processed ${processed} drug shortages`,
      processed 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    throw new Error(`Failed to fetch drug shortages: ${error.message}`);
  }
}

function getUrgencyFromClassification(classification: string): string {
  if (!classification) return 'Medium';
  
  const lowerClass = classification.toLowerCase();
  if (lowerClass.includes('class i')) return 'High';
  if (lowerClass.includes('class ii')) return 'Medium';
  if (lowerClass.includes('class iii')) return 'Low';
  
  return 'Medium';
}