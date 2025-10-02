import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CDC RSS feed URLs
const CDC_FEEDS = {
  EID: 'https://wwwnc.cdc.gov/eid/rss/ahead-of-print.xml',
  MMWR: 'https://www.cdc.gov/mmwr/rss.xml'
};

// Food-related keywords for filtering
const FOOD_KEYWORDS = [
  'salmonella', 'e.coli', 'e. coli', 'listeria', 'outbreak', 'foodborne',
  'food safety', 'contamination', 'recall', 'norovirus', 'campylobacter',
  'shigella', 'botulism', 'hepatitis a', 'cyclospora', 'vibrio', 'yersinia',
  'food poisoning', 'gastroenteritis', 'diarrheal', 'enteric'
];

interface CDCAlert {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  guid: string;
  source: 'EID' | 'MMWR';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { test_mode = false } = await req.json().catch(() => ({}));

    console.log('🦠 CDC Enhanced Ingestion Started', { test_mode });

    // Fetch from both feeds
    const [eidAlerts, mmwrAlerts] = await Promise.all([
      fetchCDCFeed('EID', CDC_FEEDS.EID),
      fetchCDCFeed('MMWR', CDC_FEEDS.MMWR)
    ]);

    const allAlerts = [...eidAlerts, ...mmwrAlerts];
    console.log(`📊 Total alerts fetched: ${allAlerts.length} (EID: ${eidAlerts.length}, MMWR: ${mmwrAlerts.length})`);

    // Filter for food-related content
    const foodRelatedAlerts = allAlerts.filter(alert => {
      const text = `${alert.title} ${alert.description}`.toLowerCase();
      return FOOD_KEYWORDS.some(keyword => text.includes(keyword));
    });

    console.log(`🍔 Food-related alerts: ${foodRelatedAlerts.length}`);

    // Transform to regulatory alerts format
    const transformedAlerts = foodRelatedAlerts.map(alert => transformCDCAlert(alert));

    // Deduplicate by external_id
    const uniqueAlerts = deduplicateAlerts(transformedAlerts);
    console.log(`✨ Unique alerts after deduplication: ${uniqueAlerts.length}`);

    if (test_mode) {
      // Insert into test table
      const { error: testError } = await supabaseClient
        .from('cdc_test')
        .insert(uniqueAlerts.map(alert => ({
          ...alert,
          test_run_id: crypto.randomUUID()
        })));

      if (testError) {
        console.error('❌ Test insertion error:', testError);
        throw testError;
      }

      // Log health check
      await logHealthCheck(supabaseClient, 'success', uniqueAlerts.length, 0);

      return new Response(JSON.stringify({
        success: true,
        test_mode: true,
        total_fetched: allAlerts.length,
        food_related: foodRelatedAlerts.length,
        unique_records: uniqueAlerts.length,
        sample_records: uniqueAlerts.slice(0, 5),
        feeds: {
          EID: eidAlerts.length,
          MMWR: mmwrAlerts.length
        },
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Production mode: Check for duplicates
    const existingUrls = new Set();
    if (uniqueAlerts.length > 0) {
      const { data: existing } = await supabaseClient
        .from('alerts')
        .select('external_url')
        .in('external_url', uniqueAlerts.map(a => a.external_url));

      if (existing) {
        existing.forEach(e => existingUrls.add(e.external_url));
      }
    }

    const newAlerts = uniqueAlerts.filter(a => !existingUrls.has(a.external_url));
    console.log(`🆕 New alerts to insert: ${newAlerts.length}`);

    // Insert new alerts
    let inserted = 0;
    if (newAlerts.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('alerts')
        .insert(newAlerts);

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        await logHealthCheck(supabaseClient, 'error', uniqueAlerts.length, 0, insertError.message);
        throw insertError;
      }

      inserted = newAlerts.length;
    }

    // Log successful health check
    await logHealthCheck(supabaseClient, 'success', uniqueAlerts.length, inserted);

    return new Response(JSON.stringify({
      success: true,
      total_fetched: allAlerts.length,
      food_related: foodRelatedAlerts.length,
      unique_records: uniqueAlerts.length,
      inserted: inserted,
      feeds: {
        EID: eidAlerts.length,
        MMWR: mmwrAlerts.length
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ CDC ingestion error:', error);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await logHealthCheck(supabaseClient, 'error', 0, 0, error.message);

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function fetchCDCFeed(source: 'EID' | 'MMWR', url: string): Promise<CDCAlert[]> {
  console.log(`🔍 Fetching ${source} feed from ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RegIQ-CDC-Fetcher/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();
    
    // Robust XML parsing
    const alerts: CDCAlert[] = [];
    
    // Extract items using regex (handles malformed XML better than DOM parser)
    const itemMatches = xmlText.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi);
    
    for (const match of itemMatches) {
      const itemXml = match[1];
      
      try {
        const title = extractXMLTag(itemXml, 'title');
        const description = extractXMLTag(itemXml, 'description');
        const link = extractXMLTag(itemXml, 'link');
        const pubDate = extractXMLTag(itemXml, 'pubDate');
        const guid = extractXMLTag(itemXml, 'guid') || link;

        if (title && link) {
          alerts.push({
            title: cleanText(title),
            description: cleanText(description || ''),
            link: cleanText(link),
            pubDate: cleanText(pubDate || new Date().toISOString()),
            guid: cleanText(guid),
            source
          });
        }
      } catch (itemError) {
        console.warn(`⚠️ Skipping malformed item in ${source}:`, itemError.message);
        continue;
      }
    }

    console.log(`✅ ${source} feed parsed: ${alerts.length} alerts`);
    return alerts;

  } catch (error) {
    console.error(`❌ Error fetching ${source} feed:`, error);
    return [];
  }
}

function extractXMLTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)))
    .trim();
}

function transformCDCAlert(alert: CDCAlert): any {
  const text = `${alert.title} ${alert.description}`.toLowerCase();
  
  // Calculate relevance score
  let relevanceScore = 0;
  const highPriorityKeywords = ['outbreak', 'recall', 'e.coli', 'listeria', 'salmonella'];
  const mediumPriorityKeywords = ['foodborne', 'contamination', 'norovirus'];
  
  highPriorityKeywords.forEach(keyword => {
    if (text.includes(keyword)) relevanceScore += 30;
  });
  
  mediumPriorityKeywords.forEach(keyword => {
    if (text.includes(keyword)) relevanceScore += 15;
  });
  
  FOOD_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) relevanceScore += 5;
  });
  
  relevanceScore = Math.min(100, relevanceScore);
  
  // Determine urgency
  let urgency = 'Low';
  if (relevanceScore >= 60) urgency = 'High';
  else if (relevanceScore >= 30) urgency = 'Medium';

  // Parse date
  let publishedDate: string;
  try {
    const date = new Date(alert.pubDate);
    publishedDate = isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  } catch {
    publishedDate = new Date().toISOString();
  }

  return {
    external_id: `CDC-${alert.source}-${alert.guid.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50)}`,
    title: `CDC ${alert.source}: ${alert.title}`,
    source: 'CDC',
    urgency,
    summary: alert.description.length > 500 
      ? alert.description.substring(0, 497) + '...' 
      : alert.description,
    published_date: publishedDate,
    external_url: alert.link,
    full_content: JSON.stringify(alert),
    agency: 'CDC',
    region: 'US',
    relevance_score: relevanceScore
  };
}

function deduplicateAlerts(alerts: any[]): any[] {
  const seen = new Set<string>();
  return alerts.filter(alert => {
    const key = alert.external_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function logHealthCheck(
  supabase: any,
  status: string,
  recordsFetched: number,
  recordsInserted: number,
  errorMessage?: string
) {
  await supabase.from('source_health_logs').insert({
    source_name: 'CDC',
    status,
    records_fetched: recordsFetched,
    records_inserted: recordsInserted,
    error_message: errorMessage || null,
    response_time_ms: 0,
    metadata: {
      feeds: ['EID', 'MMWR'],
      timestamp: new Date().toISOString()
    }
  });
}
