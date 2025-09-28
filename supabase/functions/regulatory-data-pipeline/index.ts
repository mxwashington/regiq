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

// Agency configurations for regulatory announcements
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
    keywords: ['recall', 'outbreak', 'contamination', 'food safety', 'FSIS'],
    priority: 9
  },
  {
    name: 'EPA',
    datagovOrg: 'epa-gov',
    pollingInterval: 15, // 15 minutes for high priority
    datasets: ['enforcement-actions', 'violations', 'pesticide-registrations'],
    keywords: ['enforcement', 'violation', 'penalty', 'settlement', 'compliance'],
    priority: 8
  },
  {
    name: 'CDC',
    datagovOrg: 'cdc-gov',
    pollingInterval: 60, // hourly
    datasets: ['disease-outbreaks', 'health-alerts', 'mmwr'],
    keywords: ['outbreak', 'alert', 'investigation', 'surveillance', 'health advisory'],
    priority: 8
  },
  {
    name: 'OSHA',
    datagovOrg: 'osha-gov',
    pollingInterval: 60, // hourly
    datasets: ['enforcement', 'fatalities', 'inspections'],
    keywords: ['citation', 'penalty', 'fatality', 'inspection', 'violation'],
    priority: 7
  },
  {
    name: 'FTC',
    datagovOrg: 'ftc-gov',
    pollingInterval: 60, // hourly
    datasets: ['enforcement-actions', 'consumer-alerts'],
    keywords: ['enforcement', 'settlement', 'complaint', 'action', 'order'],
    priority: 6
  },
  {
    name: 'EFSA',
    datagovOrg: 'efsa-eu',
    pollingInterval: 60, // hourly
    datasets: ['food-safety', 'nutrition', 'animal-health'],
    keywords: ['food safety', 'nutrition', 'animal health', 'scientific opinion'],
    priority: 7
  },
  {
    name: 'Canada_Health',
    datagovOrg: 'health-canada',
    pollingInterval: 60, // hourly  
    datasets: ['recalls', 'advisories', 'health-alerts'],
    keywords: ['recall', 'advisory', 'health alert', 'consumer alert'],
    priority: 8
  }
];

function logStep(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  logger.info(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

async function checkRateLimit(supabase: any): Promise<boolean> {
  const { data } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'data_gov_rate_limit')
    .maybeSingle();

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
    .maybeSingle();

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

  // Use proper upsert to avoid duplicate key constraint errors
  const { error } = await supabase.rpc('upsert_system_setting', {
    key_param: 'data_gov_rate_limit',
    value_param: rateLimit,
    description_param: 'Data.gov API rate limit tracking'
  });

  if (error) {
    logStep('Error upserting system setting:', error);
  }
}

async function fetchAgencyRSSData(agency: AgencyConfig): Promise<any[]> {
  const results: any[] = [];
  
  // Define RSS feeds for each agency - updated with working RSS feed URLs
  const rssFeeds: { [key: string]: string[] } = {
    'FDA': [
      'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/food-updates/rss.xml',
      'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/drug-updates/rss.xml',
      'https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medical-device-updates/rss.xml'
    ],
    'USDA': [
      'https://www.fsis.usda.gov/wps/wcm/connect/fsis-content/internet/main/topics/recalls-and-public-health-alerts/current-recalls-and-alerts'
    ],
    'CDC': [
      'https://tools.cdc.gov/api/v2/resources/media/316422.rss'
    ],
    'FTC': [
      'https://www.ftc.gov/news-events/news/press-releases.rss'
    ],
    'EFSA': [
      'https://www.efsa.europa.eu/en/rss/rss.xml'
    ],
    'Canada_Health': [
      'https://healthycanadians.gc.ca/recall-alert-rappel-avis/api/recent/en'
    ]
  };

  const feeds = rssFeeds[agency.name] || [];
  
  for (const feedUrl of feeds) {
    try {
      logStep(`Fetching RSS feed for ${agency.name}: ${feedUrl}`);
      
      const response = await fetch(feedUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'RegIQ-DataPipeline/1.0',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        }
      });

      if (response.ok) {
        const xmlText = await response.text();
        const items = parseRSSFeed(xmlText, agency.name);
        results.push(...items);
        logStep(`Parsed ${items.length} items from ${agency.name} RSS feed`);
      } else {
        logStep(`Failed to fetch ${agency.name} RSS: ${response.status}`);
      }

      // Small delay to avoid hitting rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      logStep(`Error fetching RSS for ${agency.name}:`, error);
    }
  }
  
  return results;
}

function parseRSSFeed(xmlText: string, source: string): any[] {
  const items: any[] = [];
  
  try {
    // Simple regex-based RSS parsing for basic item extraction
    const itemPattern = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const titlePattern = /<title[^>]*>([\s\S]*?)<\/title>/i;
    const linkPattern = /<link[^>]*>([\s\S]*?)<\/link>/i;
    const descPattern = /<description[^>]*>([\s\S]*?)<\/description>/i;
    const pubDatePattern = /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i;
    const guidPattern = /<guid[^>]*>([\s\S]*?)<\/guid>/i;
    
    let match;
    while ((match = itemPattern.exec(xmlText)) !== null) {
      const itemXml = match[1];
      
      const titleMatch = titlePattern.exec(itemXml);
      const linkMatch = linkPattern.exec(itemXml);
      const descMatch = descPattern.exec(itemXml);
      const pubDateMatch = pubDatePattern.exec(itemXml);
      const guidMatch = guidPattern.exec(itemXml);
      
      const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
      const link = linkMatch ? linkMatch[1].trim() : '';
      const description = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').trim() : '';
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
      const guid = guidMatch ? guidMatch[1].trim() : '';
      
      if (title && (link || guid)) {
        items.push({
          title,
          link: link || guid,
          description,
          pubDate,
          source
        });
      }
    }
  } catch (error) {
    logStep(`Error parsing RSS feed for ${source}:`, error);
  }
  
  return items;
}

function calculateUrgency(item: any, agency: AgencyConfig): string {
  let urgencyScore = 0;
  
  // Base urgency from agency priority
  urgencyScore += agency.priority;
  
  // Check for urgent keywords in title and description
  const text = (item.title + ' ' + (item.description || '')).toLowerCase();
  const urgentKeywords = ['recall', 'outbreak', 'warning', 'alert', 'urgent', 'immediate', 'critical'];
  const foundUrgentKeywords = urgentKeywords.filter(keyword => text.includes(keyword));
  
  urgencyScore += foundUrgentKeywords.length * 2;
  
  // Recency boost - use proper published date from RSS
  const publishedDate = new Date(item.pubDate || Date.now());
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

function processRSSItem(item: any, agency: AgencyConfig): ProcessedAlert {
  // Parse the RSS published date correctly
  let publishedDate: Date;
  if (item.pubDate) {
    publishedDate = new Date(item.pubDate);
    // If date parsing fails or produces invalid date, use current time
    if (isNaN(publishedDate.getTime())) {
      publishedDate = new Date();
    }
  } else {
    publishedDate = new Date();
  }
  
  // Detect if CDC is republishing FDA recalls and correctly attribute them
  let actualAgency = agency.name;
  let actualSource = agency.name;
  
  if (agency.name === 'CDC') {
    const title = item.title || '';
    const description = item.description || '';
    const content = (title + ' ' + description).toLowerCase();
    
    // Check if this is an FDA-originated recall being republished by CDC
    if (content.includes('fda') || 
        content.includes('food and drug administration') ||
        (content.includes('recall') && (
          content.includes('food') || 
          content.includes('drug') || 
          content.includes('device') || 
          content.includes('allergy') ||
          content.includes('undeclared')
        ))) {
      actualAgency = 'FDA';
      actualSource = 'FDA';
    }
    
    // Check if this is a USDA/FSIS recall being republished by CDC
    if (content.includes('usda') || 
        content.includes('fsis') ||
        content.includes('meat') ||
        content.includes('poultry') ||
        (content.includes('recall') && (
          content.includes('beef') || 
          content.includes('chicken') || 
          content.includes('pork') ||
          content.includes('ground')
        ))) {
      actualAgency = 'USDA';
      actualSource = 'USDA';
    }
  }
  
  return {
    title: item.title || 'Untitled Regulatory Update',
    source: actualSource,
    urgency: calculateUrgency(item, agency),
    summary: item.description || 'No description available.',
    published_date: publishedDate.toISOString(),
    external_url: item.link || '',
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
    .maybeSingle();

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

async function processAgency(supabase: any, agency: AgencyConfig, openaiKey?: string): Promise<number> {
  try {
    logStep(`Processing agency: ${agency.name}`);
    
    // Check if we should process this agency based on its polling interval
    const { data: lastRun } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', `last_run_${agency.name.toLowerCase()}`)
      .maybeSingle();

    const now = Date.now();
    const lastRunTime = lastRun?.setting_value?.timestamp || 0;
    const intervalMs = agency.pollingInterval * 60 * 1000;

    if (now - lastRunTime < intervalMs) {
      logStep(`Skipping ${agency.name} - not yet time for next poll`);
      return 0;
    }

    // Fetch data from RSS feeds instead of data.gov
    const rawData = await fetchAgencyRSSData(agency);
    logStep(`Fetched ${rawData.length} items for ${agency.name}`);

    let savedCount = 0;
    for (const item of rawData) {
      const alert = processRSSItem(item, agency);
      if (await saveAlert(supabase, alert, openaiKey)) {
        savedCount++;
      }
    }

    // Update last run timestamp using proper upsert function
    await supabase.rpc('upsert_system_setting', {
      key_param: `last_run_${agency.name.toLowerCase()}`,
      value_param: { timestamp: now },
      description_param: `Last data pipeline run for ${agency.name}`
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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    // RSS feeds don't require API keys, so we can proceed without data.gov API key

    // RSS feeds have their own rate limits, so we can remove the data.gov rate limit check

    // Process each agency
    let totalAlertsProcessed = 0;
    const results: { [agency: string]: number } = {};

    for (const agency of AGENCY_CONFIGS) {
      const savedCount = await processAgency(supabase, agency, openaiApiKey);
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