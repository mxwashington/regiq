import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CDC Food Safety Information RSS Feed
const CDC_FOOD_SAFETY_RSS_URL = 'http://www2c.cdc.gov/podcasts/createrss.asp?c=146';

// High-relevance food safety keywords (all records default to HIGH)
const FOOD_SAFETY_KEYWORDS = [
  'recall', 'outbreak', 'salmonella', 'e.coli', 'listeria', 
  'contamination', 'foodborne', 'illness', 'investigation',
  'norovirus', 'campylobacter', 'shigella', 'botulism', 
  'cyclospora', 'hepatitis', 'vibrio', 'cronobacter'
];

interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  guid: string;
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

    const { test_mode = false } = await req.json().catch(() => ({ test_mode: false }));

    console.log(`🚀 Starting CDC Food Safety RSS ingestion (test_mode: ${test_mode})`);
    
    const startTime = Date.now();
    const errors: string[] = [];
    let totalFetched = 0;
    let foodSafetyRecords = 0;
    let uniqueRecords = 0;
    let duplicates = 0;
    const sampleRecords: any[] = [];

    // Log health check start
    if (!test_mode) {
      await supabaseClient.from('source_health_logs').insert({
        source_name: 'CDC Food Safety',
        status: 'checking',
        metadata: { feed_url: CDC_FOOD_SAFETY_RSS_URL }
      });
    }

    // Fetch RSS feed
    console.log(`📡 Fetching CDC Food Safety RSS: ${CDC_FOOD_SAFETY_RSS_URL}`);
    const response = await fetch(CDC_FOOD_SAFETY_RSS_URL);
    
    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    console.log(`📄 Received ${xmlText.length} bytes of XML`);

    // Parse RSS items using regex (robust XML parsing)
    const items: RSSItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let itemMatch;

    while ((itemMatch = itemRegex.exec(xmlText)) !== null) {
      const itemContent = itemMatch[1];
      
      const title = extractTag(itemContent, 'title');
      const description = extractTag(itemContent, 'description');
      const link = extractTag(itemContent, 'link');
      const pubDate = extractTag(itemContent, 'pubDate');
      const guid = extractTag(itemContent, 'guid') || link;

      if (title && link) {
        items.push({ title, description, link, pubDate, guid });
      }
    }

    totalFetched = items.length;
    console.log(`📊 Parsed ${totalFetched} items from CDC Food Safety RSS`);

    // Process each item
    for (const item of items) {
      try {
        // Parse publication date
        const publishedDate = parsePubDate(item.pubDate);
        
        // Calculate relevance score (all food safety records default to HIGH)
        const relevanceScore = calculateRelevanceScore(item.title, item.description);
        
        // Determine urgency based on relevance score
        const urgency = relevanceScore >= 60 ? 'High' : 
                       relevanceScore >= 30 ? 'Medium' : 'Low';

        // Create external_id for deduplication
        const external_id = `CDC-FOODSAFETY-${item.guid}`;

        // Check for duplicates across all sources
        const { data: existingAlert } = await supabaseClient
          .from('alerts')
          .select('id, source')
          .or(`external_id.eq.${external_id},external_url.eq.${item.link}`)
          .maybeSingle();

        if (existingAlert) {
          console.log(`⏭️  Duplicate found: ${item.title} (existing source: ${existingAlert.source})`);
          duplicates++;
          continue;
        }

        const alertData = {
          external_id,
          source: 'CDC Food Safety',
          agency: 'CDC',
          title: cleanText(item.title),
          summary: cleanText(item.description) || cleanText(item.title),
          external_url: item.link,
          published_date: publishedDate,
          urgency,
          urgency_score: relevanceScore,
          region: 'US',
          full_content: JSON.stringify(item)
        };

        if (test_mode) {
          // Insert into test table
          const { error: testInsertError } = await supabaseClient
            .from('cdc_foodsafety_test')
            .insert({
              ...alertData,
              relevance_score: relevanceScore,
              test_run_id: crypto.randomUUID()
            });

          if (testInsertError) {
            console.error('Test insert error:', testInsertError);
            errors.push(`Test insert failed: ${testInsertError.message}`);
          } else {
            uniqueRecords++;
            if (sampleRecords.length < 5) {
              sampleRecords.push({
                title: alertData.title,
                published_date: alertData.published_date,
                relevance_score: relevanceScore,
                urgency: alertData.urgency,
                url: alertData.external_url
              });
            }
          }
        } else {
          // Insert into production alerts table
          const { error: insertError } = await supabaseClient
            .from('alerts')
            .insert(alertData);

          if (insertError) {
            console.error('Insert error:', insertError);
            errors.push(`Insert failed for ${item.title}: ${insertError.message}`);
          } else {
            uniqueRecords++;
            foodSafetyRecords++;
          }
        }
      } catch (itemError: any) {
        console.error(`Error processing item: ${item.title}`, itemError);
        errors.push(`Failed to process "${item.title}": ${itemError.message}`);
      }
    }

    const duration = Date.now() - startTime;

    // Log health check results
    if (!test_mode) {
      await supabaseClient.from('source_health_logs').insert({
        source_name: 'CDC Food Safety',
        status: errors.length > 0 ? 'degraded' : 'healthy',
        records_fetched: totalFetched,
        records_inserted: uniqueRecords,
        errors: errors.length > 0 ? errors.slice(0, 5) : null,
        response_time_ms: duration,
        metadata: {
          feed_url: CDC_FOOD_SAFETY_RSS_URL,
          duplicates_found: duplicates,
          food_safety_records: foodSafetyRecords
        }
      });
    }

    const result = {
      success: errors.length === 0,
      test_mode,
      source: 'CDC Food Safety',
      total_fetched: totalFetched,
      food_safety_records: test_mode ? uniqueRecords : foodSafetyRecords,
      unique_records: uniqueRecords,
      duplicates,
      errors: errors.slice(0, 10),
      duration_ms: duration,
      sample_records: test_mode ? sampleRecords : undefined,
      message: test_mode 
        ? `Test completed: ${uniqueRecords} unique records (${duplicates} duplicates filtered)`
        : `Ingestion completed: ${uniqueRecords} new alerts from CDC Food Safety RSS`
    };

    console.log('✅ CDC Food Safety ingestion completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('❌ CDC Food Safety ingestion failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Helper functions
function extractTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  
  let content = match[1];
  
  // Handle CDATA
  content = content.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  
  // Decode HTML entities
  content = content
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  
  return content.trim();
}

function cleanText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .trim()
    .substring(0, 5000);      // Limit length
}

function parsePubDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function calculateRelevanceScore(title: string, description: string): number {
  // All CDC Food Safety RSS records default to HIGH relevance (60+)
  // But we calculate based on keyword matches for prioritization
  const text = `${title} ${description}`.toLowerCase();
  
  let score = 60; // Base score for curated food safety feed
  
  // High priority keywords (+15 each)
  const highPriorityTerms = ['outbreak', 'recall', 'death', 'hospitalized', 'multistate'];
  highPriorityTerms.forEach(term => {
    if (text.includes(term)) score += 15;
  });
  
  // Medium priority keywords (+10 each)
  const mediumPriorityTerms = ['investigation', 'ill', 'sick', 'contamination'];
  mediumPriorityTerms.forEach(term => {
    if (text.includes(term)) score += 10;
  });
  
  // Food safety pathogens (+5 each)
  FOOD_SAFETY_KEYWORDS.forEach(keyword => {
    if (text.includes(keyword)) score += 5;
  });
  
  return Math.min(score, 100); // Cap at 100
}
