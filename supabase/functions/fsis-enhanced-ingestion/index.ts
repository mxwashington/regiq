import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

// FSIS Data Sources
const FSIS_API_URL = 'https://www.fsis.usda.gov/api/recalls';
const FSIS_RSS_URL = 'https://www.fsis.usda.gov/recalls-alerts/rss.xml';

interface FSISRecall {
  recall_number?: string;
  case_id?: string;
  title: string;
  description: string;
  published_date: string;
  product_type?: string;
  company_name?: string;
  url?: string;
}

interface IngestResult {
  source: 'api' | 'rss';
  total_fetched: number;
  inserted: number;
  updated: number;
  duplicates: number;
  errors: number;
  freshness_hours: number;
  sample_records?: any[];
}

function logStep(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

/**
 * Fetch recalls from FSIS API
 */
async function fetchFromAPI(): Promise<FSISRecall[]> {
  logStep('Attempting FSIS API fetch...');
  
  try {
    const response = await fetch(FSIS_API_URL, {
      headers: {
        'User-Agent': 'RegIQ/1.0',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    logStep(`API fetch successful, received ${data?.results?.length || 0} records`);
    
    // Transform API response to standardized format
    const records = (data?.results || []).map((item: any) => ({
      recall_number: item.recall_number || item.recallNumber || item.id,
      case_id: item.case_id || item.caseId,
      title: item.title || item.product_description || 'Untitled Recall',
      description: item.description || item.reason_for_recall || '',
      published_date: item.published_date || item.recall_initiation_date || new Date().toISOString(),
      product_type: item.product_type || item.productType,
      company_name: item.company_name || item.recalling_firm,
      url: item.url || `https://www.fsis.usda.gov/recalls/${item.recall_number || ''}`
    }));

    return records;
  } catch (error) {
    logStep('FSIS API fetch failed:', error);
    throw error;
  }
}

/**
 * Fetch recalls from FSIS RSS feed (fallback)
 */
async function fetchFromRSS(): Promise<FSISRecall[]> {
  logStep('Attempting FSIS RSS fetch (fallback)...');
  
  try {
    const response = await fetch(FSIS_RSS_URL, {
      headers: {
        'User-Agent': 'RegIQ/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`RSS returned ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();
    
    if (!xmlText || xmlText.length === 0) {
      throw new Error('Empty RSS response');
    }

    logStep(`RSS fetch successful, XML length: ${xmlText.length}`);

    // Parse XML with robust error handling
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');

    if (!doc) {
      throw new Error('Failed to parse XML');
    }

    const items = doc.querySelectorAll('item');
    const records: FSISRecall[] = [];

    for (const item of items) {
      try {
        const title = item.querySelector('title')?.textContent?.trim() || '';
        let description = item.querySelector('description')?.textContent?.trim() || '';
        const link = item.querySelector('link')?.textContent?.trim() || '';
        const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
        const guid = item.querySelector('guid')?.textContent?.trim() || '';

        // Clean HTML from description
        description = description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

        // Extract recall number from title or description
        const recallMatch = (title + ' ' + description).match(/recall\s*#?\s*(\d{3}-\d{4}|\d+)/i);
        const recall_number = recallMatch ? recallMatch[1] : guid || `rss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        if (title && description) {
          records.push({
            recall_number,
            case_id: guid,
            title,
            description,
            published_date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            product_type: extractProductType(title + ' ' + description),
            company_name: extractCompanyName(description),
            url: link || 'https://www.fsis.usda.gov/recalls'
          });
        }
      } catch (error) {
        logStep('Error parsing RSS item:', error);
      }
    }

    logStep(`RSS parsing complete, ${records.length} valid records found`);
    return records;

  } catch (error) {
    logStep('FSIS RSS fetch failed:', error);
    throw error;
  }
}

/**
 * Extract product type from text
 */
function extractProductType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('beef') || lower.includes('steak')) return 'Beef';
  if (lower.includes('pork') || lower.includes('bacon') || lower.includes('ham')) return 'Pork';
  if (lower.includes('chicken') || lower.includes('poultry') || lower.includes('turkey')) return 'Poultry';
  if (lower.includes('fish') || lower.includes('seafood')) return 'Seafood';
  if (lower.includes('egg')) return 'Eggs';
  return 'Other';
}

/**
 * Extract company name from description
 */
function extractCompanyName(description: string): string | undefined {
  // Look for patterns like "Company Inc.", "Company LLC", etc.
  const match = description.match(/([A-Z][a-zA-Z\s&]+(?:Inc|LLC|Corp|Company|Co\.))/);
  return match ? match[1].trim() : undefined;
}

/**
 * Calculate urgency based on recall content
 */
function calculateUrgency(recall: FSISRecall): string {
  const text = (recall.title + ' ' + recall.description).toLowerCase();
  
  // High urgency keywords
  if (text.includes('class i') || 
      text.includes('listeria') || 
      text.includes('e. coli') || 
      text.includes('salmonella') ||
      text.includes('death') ||
      text.includes('serious illness')) {
    return 'High';
  }
  
  // Medium urgency
  if (text.includes('class ii') || 
      text.includes('contamination') ||
      text.includes('allergen') ||
      text.includes('undeclared')) {
    return 'Medium';
  }
  
  // Low urgency
  return 'Low';
}

/**
 * Save recalls to database with deduplication
 */
async function saveRecalls(
  supabase: any,
  recalls: FSISRecall[],
  testMode: boolean = false
): Promise<{ inserted: number; updated: number; duplicates: number; errors: number }> {
  
  let inserted = 0, updated = 0, duplicates = 0, errors = 0;

  for (const recall of recalls) {
    try {
      const uniqueKey = recall.recall_number || recall.case_id;
      
      if (!uniqueKey) {
        logStep('Skipping record without unique identifier:', recall.title);
        errors++;
        continue;
      }

      // Check for existing record by external_id or title+source
      const { data: existing } = await supabase
        .from('alerts')
        .select('id, updated_at')
        .or(`external_id.eq.${uniqueKey},and(title.eq.${recall.title},source.eq.FSIS)`)
        .maybeSingle();

      const alertData = {
        external_id: uniqueKey,
        source: 'FSIS',
        agency: 'FSIS',
        title: recall.title,
        summary: recall.description.substring(0, 500),
        urgency: calculateUrgency(recall),
        published_date: recall.published_date,
        external_url: recall.url,
        full_content: JSON.stringify({
          ...recall,
          source_type: 'FSIS',
          ingested_at: new Date().toISOString()
        }),
        region: 'US',
        data_classification: testMode ? 'test' : 'production'
      };

      if (existing) {
        // Check if update is needed (e.g., description changed)
        const { error: updateError } = await supabase
          .from('alerts')
          .update({
            summary: alertData.summary,
            full_content: alertData.full_content,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          logStep('Error updating alert:', updateError);
          errors++;
        } else {
          updated++;
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('alerts')
          .insert(alertData);

        if (insertError) {
          // Check if it's a duplicate constraint error
          if (insertError.code === '23505') {
            duplicates++;
          } else {
            logStep('Error inserting alert:', insertError);
            errors++;
          }
        } else {
          inserted++;
        }
      }
    } catch (error) {
      logStep('Error processing recall:', error);
      errors++;
    }
  }

  return { inserted, updated, duplicates, errors };
}

/**
 * Check if API is stale (>12h since last successful fetch)
 */
async function isAPIStale(supabase: any): Promise<boolean> {
  const { data } = await supabase
    .from('data_freshness')
    .select('last_successful_fetch')
    .eq('source_name', 'FSIS')
    .maybeSingle();

  if (!data) return true;

  const lastFetch = new Date(data.last_successful_fetch);
  const hoursAgo = (Date.now() - lastFetch.getTime()) / (1000 * 60 * 60);
  
  return hoursAgo > 12;
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { test_mode = false } = await req.json().catch(() => ({}));
    
    logStep(`Starting FSIS ingestion${test_mode ? ' (TEST MODE)' : ''}...`);

    let recalls: FSISRecall[] = [];
    let source: 'api' | 'rss' = 'api';
    let shouldFallback = false;

    // Try API first
    try {
      recalls = await fetchFromAPI();
      source = 'api';
    } catch (apiError) {
      logStep('API fetch failed, checking if RSS fallback needed...', apiError);
      shouldFallback = true;
    }

    // Fallback to RSS if API failed or data is stale
    if (shouldFallback || recalls.length === 0 || await isAPIStale(supabase)) {
      logStep('Using RSS fallback...');
      recalls = await fetchFromRSS();
      source = 'rss';
    }

    // Calculate freshness
    const now = Date.now();
    const latestDate = recalls.reduce((latest, recall) => {
      const date = new Date(recall.published_date).getTime();
      return date > latest ? date : latest;
    }, 0);
    const freshness_hours = (now - latestDate) / (1000 * 60 * 60);

    // Save to database (or test table in test mode)
    const saveResult = await saveRecalls(supabase, recalls, test_mode);

    // Update data freshness
    await supabase
      .from('data_freshness')
      .upsert({
        source_name: 'FSIS',
        last_successful_fetch: new Date().toISOString(),
        last_attempt: new Date().toISOString(),
        fetch_status: 'success',
        records_fetched: recalls.length,
        error_message: null
      }, {
        onConflict: 'source_name'
      });

    const result: IngestResult = {
      source,
      total_fetched: recalls.length,
      inserted: saveResult.inserted,
      updated: saveResult.updated,
      duplicates: saveResult.duplicates,
      errors: saveResult.errors,
      freshness_hours: Math.round(freshness_hours * 10) / 10,
      sample_records: test_mode ? recalls.slice(0, 5) : undefined
    };

    logStep('FSIS ingestion completed successfully', result);

    return new Response(
      JSON.stringify({
        success: true,
        result,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    logStep('FSIS ingestion failed:', error);

    // Update data freshness with error
    try {
      await supabase
        .from('data_freshness')
        .upsert({
          source_name: 'FSIS',
          last_attempt: new Date().toISOString(),
          fetch_status: 'error',
          error_message: error.message,
          records_fetched: 0
        }, {
          onConflict: 'source_name'
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});