import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface AgencyConfig {
  name: string;
  datagovOrg: string;
  pollingInterval: number; // in minutes
  datasets: string[];
  keywords: string[];
  priority: number;
}

interface ProcessedAlert {
  title: string;
  source: string;
  urgency: string;
  summary: string;
  published_date: string;
  external_url?: string;
  full_content?: string;
}

// Agency configurations for data.gov
const AGENCY_CONFIGS: AgencyConfig[] = [
  {
    name: 'FDA',
    datagovOrg: 'fda-gov',
    pollingInterval: 15, // 15 minutes for high priority
    datasets: ['recalls', 'enforcement-reports', 'adverse-events'],
    keywords: ['recall', 'warning letter', 'safety alert', 'guidance', 'approval', 'withdrawal'],
    priority: 9
  },
  {
    name: 'USDA',
    datagovOrg: 'usda-gov',
    pollingInterval: 15, // 15 minutes for high priority
    datasets: ['food-recalls', 'inspection-reports', 'fsis-recalls'],
    keywords: ['recall', 'outbreak', 'contamination', 'salmonella', 'listeria', 'e.coli'],
    priority: 9
  },
  {
    name: 'EPA',
    datagovOrg: 'epa-gov',
    pollingInterval: 15, // 15 minutes for high priority
    datasets: ['enforcement-actions', 'violations', 'pesticide-registrations'],
    keywords: ['violation', 'enforcement', 'pesticide', 'toxic', 'environmental'],
    priority: 8
  },
  {
    name: 'CDC',
    datagovOrg: 'cdc-gov',
    pollingInterval: 60, // hourly
    datasets: ['disease-outbreaks', 'health-alerts', 'mmwr'],
    keywords: ['outbreak', 'disease', 'health alert', 'warning', 'surveillance'],
    priority: 8
  },
  {
    name: 'OSHA',
    datagovOrg: 'osha-gov',
    pollingInterval: 60, // hourly
    datasets: ['enforcement', 'fatalities', 'inspections'],
    keywords: ['workplace safety', 'violation', 'fatality', 'injury', 'inspection'],
    priority: 7
  },
  {
    name: 'FTC',
    datagovOrg: 'ftc-gov',
    pollingInterval: 60, // hourly
    datasets: ['enforcement-actions', 'consumer-alerts'],
    keywords: ['enforcement', 'consumer protection', 'fraud', 'deceptive practices'],
    priority: 6
  }
];

function logStep(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

async function checkRateLimit(supabase: any): Promise<boolean> {
  const { data } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'data_gov_rate_limit')
    .single();

  if (!data?.setting_value) return true;

  const rateLimit = data.setting_value;
  const now = Date.now();
  const today = new Date().toDateString();
  
  // Reset if new day
  if (rateLimit.date !== today || now > rateLimit.reset_time) {
    return true;
  }
  
  return (rateLimit.requests_made || 0) < 950; // Leave buffer of 50 requests
}

async function updateRateLimit(supabase: any) {
  const { data } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'data_gov_rate_limit')
    .single();

  const now = Date.now();
  const today = new Date().toDateString();
  
  let rateLimit = data?.setting_value || {
    date: today,
    requests_made: 0,
    reset_time: now + (24 * 60 * 60 * 1000)
  };

  if (rateLimit.date !== today || now > rateLimit.reset_time) {
    rateLimit = {
      date: today,
      requests_made: 1,
      reset_time: now + (24 * 60 * 60 * 1000)
    };
  } else {
    rateLimit.requests_made = (rateLimit.requests_made || 0) + 1;
  }

  await supabase
    .from('system_settings')
    .upsert({
      setting_key: 'data_gov_rate_limit',
      setting_value: rateLimit,
      description: 'Data.gov API rate limit tracking'
    });
}

async function fetchDataGovData(agency: AgencyConfig, apiKey: string): Promise<any[]> {
  const results: any[] = [];
  
  for (const keyword of agency.keywords.slice(0, 3)) { // Limit to 3 keywords per agency
    try {
      // Use the correct CKAN API endpoint
      const url = `https://catalog.data.gov/api/3/action/package_search?q=${encodeURIComponent(keyword + ' AND organization:' + agency.datagovOrg)}&rows=10&sort=metadata_modified desc`;
      
      logStep(`Fetching data for ${agency.name} with keyword: ${keyword}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'RegIQ-DataPipeline/1.0',
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // CKAN API returns results in data.result.results
        if (data.result?.results) {
          results.push(...data.result.results);
        }
      } else {
        logStep(`Error fetching data for ${agency.name}: ${response.status}`);
      }

      // Small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      logStep(`Error processing keyword ${keyword} for ${agency.name}:`, error);
    }
  }
  
  return results;
}

function calculateUrgency(item: any, agency: AgencyConfig): string {
  let urgencyScore = 0;
  
  // Base urgency from agency priority
  urgencyScore += agency.priority;
  
  // Check for urgent keywords in title and description
  const text = (item.title + ' ' + (item.notes || '')).toLowerCase();
  const urgentKeywords = ['recall', 'outbreak', 'warning', 'alert', 'urgent', 'immediate', 'critical'];
  const foundUrgentKeywords = urgentKeywords.filter(keyword => text.includes(keyword));
  
  urgencyScore += foundUrgentKeywords.length * 2;
  
  // Recency boost
  const publishedDate = new Date(item.metadata_created || item.metadata_modified);
  const hoursOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
  
  if (hoursOld < 24) urgencyScore += 3;
  else if (hoursOld < 72) urgencyScore += 1;
  
  // Determine urgency level
  if (urgencyScore >= 12) return 'High';
  if (urgencyScore >= 8) return 'Medium';
  return 'Low';
}

async function generateAISummary(title: string, description: string, openaiKey?: string): Promise<string> {
  if (!openaiKey) {
    // Fallback to simple truncation if no OpenAI key
    return description ? description.substring(0, 200) + '...' : 'No summary available.';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert regulatory analyst. Summarize regulatory information in 1-2 sentences, focusing on key impacts and actionable insights for businesses. Be concise and professional.'
          },
          {
            role: 'user',
            content: `Summarize this regulatory update:\n\nTitle: ${title}\n\nDescription: ${description}`
          }
        ],
        max_tokens: 150,
        temperature: 0.3
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0]?.message?.content || description.substring(0, 200) + '...';
    }
  } catch (error) {
    logStep('Error generating AI summary:', error);
  }
  
  return description ? description.substring(0, 200) + '...' : 'No summary available.';
}

function processDataGovItem(item: any, agency: AgencyConfig): ProcessedAlert {
  const publishedDate = new Date(item.metadata_created || item.metadata_modified || Date.now());
  
  return {
    title: item.title || 'Untitled Regulatory Update',
    source: agency.name,
    urgency: calculateUrgency(item, agency),
    summary: item.notes || item.description || 'No description available.',
    published_date: publishedDate.toISOString(),
    external_url: item.landing_page || `https://catalog.data.gov/dataset/${item.id}`,
    full_content: JSON.stringify(item)
  };
}

async function isDuplicate(supabase: any, alert: ProcessedAlert): Promise<boolean> {
  const { data } = await supabase
    .from('alerts')
    .select('id')
    .eq('title', alert.title)
    .eq('source', alert.source)
    .gte('published_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
    .single();

  return !!data;
}

async function saveAlert(supabase: any, alert: ProcessedAlert, openaiKey?: string): Promise<boolean> {
  try {
    // Check for duplicates
    if (await isDuplicate(supabase, alert)) {
      logStep(`Duplicate alert skipped: ${alert.title}`);
      return false;
    }

    // Generate AI summary
    alert.summary = await generateAISummary(alert.title, alert.summary, openaiKey);

    // Save to database
    const { data: insertedAlert, error } = await supabase
      .from('alerts')
      .insert(alert)
      .select('id')
      .single();

    if (error) {
      logStep('Error saving alert:', error);
      return false;
    }

    logStep(`Saved new alert: ${alert.title}`);

    // Classify and tag the alert
    if (insertedAlert?.id) {
      await classifyAndTagAlert(supabase, insertedAlert.id, alert);
    }

    return true;
  } catch (error) {
    logStep('Error in saveAlert:', error);
    return false;
  }
}

async function classifyAndTagAlert(supabase: any, alertId: string, alert: ProcessedAlert): Promise<void> {
  try {
    logStep(`Starting classification for alert: ${alertId}`);
    
    // Call the AI content classifier edge function
    const classificationPayload = {
      title: alert.title,
      content: alert.summary || alert.full_content || '',
      source: alert.source,
      alert_id: alertId
    };

    const { error: classificationError } = await supabase.functions.invoke(
      'ai-content-classifier',
      {
        body: classificationPayload
      }
    );

    if (classificationError) {
      logStep('Classification service error', classificationError);
      // Continue without failing the alert save
    } else {
      logStep(`Successfully classified alert: ${alertId}`);
    }

  } catch (error) {
    logStep('Error in classifyAndTagAlert', error);
    // Don't let classification errors block alert saving
  }
}

async function processAgency(supabase: any, agency: AgencyConfig, apiKey: string, openaiKey?: string): Promise<number> {
  try {
    logStep(`Processing agency: ${agency.name}`);
    
    // Check if we should process this agency based on its polling interval
    const { data: lastRun } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', `last_run_${agency.name.toLowerCase()}`)
      .single();

    const now = Date.now();
    const lastRunTime = lastRun?.setting_value?.timestamp || 0;
    const intervalMs = agency.pollingInterval * 60 * 1000;

    if (now - lastRunTime < intervalMs) {
      logStep(`Skipping ${agency.name} - not yet time for next poll`);
      return 0;
    }

    // Fetch data from data.gov
    const rawData = await fetchDataGovData(agency, apiKey);
    logStep(`Fetched ${rawData.length} items for ${agency.name}`);

    let savedCount = 0;
    for (const item of rawData) {
      if (await checkRateLimit(supabase)) {
        await updateRateLimit(supabase);
        
        const alert = processDataGovItem(item, agency);
        if (await saveAlert(supabase, alert, openaiKey)) {
          savedCount++;
        }
      } else {
        logStep('Rate limit reached, stopping processing');
        break;
      }
    }

    // Update last run timestamp
    await supabase
      .from('system_settings')
      .upsert({
        setting_key: `last_run_${agency.name.toLowerCase()}`,
        setting_value: { timestamp: now },
        description: `Last data pipeline run for ${agency.name}`
      });

    logStep(`Processed ${agency.name}: ${savedCount} new alerts saved`);
    return savedCount;

  } catch (error) {
    logStep(`Error processing agency ${agency.name}:`, error);
    return 0;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Regulatory data pipeline started');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API keys
    const dataGovApiKey = Deno.env.get('DATA_GOV_API_KEY');
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!dataGovApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Data.gov API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check overall rate limit
    if (!(await checkRateLimit(supabase))) {
      return new Response(
        JSON.stringify({ success: false, error: 'Daily rate limit exceeded' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Process each agency
    let totalAlertsProcessed = 0;
    const results: { [agency: string]: number } = {};

    for (const agency of AGENCY_CONFIGS) {
      const savedCount = await processAgency(supabase, agency, dataGovApiKey, openaiApiKey);
      results[agency.name] = savedCount;
      totalAlertsProcessed += savedCount;

      // Small delay between agencies to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logStep('Data pipeline completed', { totalAlertsProcessed, results });

    return new Response(
      JSON.stringify({ 
        success: true, 
        totalAlertsProcessed,
        agencyResults: results,
        message: 'Regulatory data pipeline completed successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    logStep('Unexpected error in regulatory-data-pipeline', { error: error.message });
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});