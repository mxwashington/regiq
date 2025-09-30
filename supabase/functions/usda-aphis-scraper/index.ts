import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  logger.info(`[USDA-APHIS] ${step}${detailsStr}`);
};

// USDA APHIS sources for plant and animal health
const APHIS_SOURCES = [
  {
    name: 'Plant Health',
    url: 'https://www.aphis.usda.gov/aphis/newsroom/news',
    keywords: ['plant', 'import', 'pest', 'disease', 'quarantine', 'restriction', 'outbreak']
  },
  {
    name: 'Animal Health',
    url: 'https://www.aphis.usda.gov/aphis/ourfocus/animalhealth',
    keywords: ['animal', 'disease', 'outbreak', 'quarantine', 'import', 'restriction', 'avian', 'livestock']
  }
];

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
    logStep("USDA APHIS scraper started");

    const { action } = await req.json().catch(() => ({ action: 'scrape_aphis' }));

    switch (action) {
      case 'scrape_aphis':
        return await scrapeAPHIS(supabaseClient);
      case 'test_scraper':
        return await testScraper();
      default:
        return await scrapeAPHIS(supabaseClient);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in usda-aphis-scraper", { message: errorMessage });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function scrapeAPHIS(supabase: any) {
  logStep('Scraping USDA APHIS sources');

  let totalProcessed = 0;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  for (const source of APHIS_SOURCES) {
    try {
      logStep(`Fetching ${source.name}`, { url: source.url });

      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'RegIQ-APHIS/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache'
        },
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        logStep(`APHIS source error: ${response.status}`, { source: source.name });
        continue;
      }

      const htmlText = await response.text();
      logStep('APHIS page fetched', { source: source.name, length: htmlText.length });

      // Parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      if (!doc) {
        logStep('Failed to parse HTML', { source: source.name });
        continue;
      }

      // Extract news items, articles, and announcements
      const contentItems = doc.querySelectorAll(
        'article, .news-item, .view-content .views-row, .alert, .announcement, h2, h3'
      );

      logStep('Found content items', { source: source.name, count: contentItems.length });

      for (const item of Array.from(contentItems).slice(0, 30)) {
        try {
          const text = item.textContent?.trim() || '';
          const linkEl = item.querySelector('a[href]');
          const link = linkEl?.getAttribute('href')?.trim() || '';

          // Check if content matches APHIS keywords
          const isRelevant = source.keywords.some(keyword =>
            text.toLowerCase().includes(keyword.toLowerCase())
          );

          if (!isRelevant || text.length < 30) {
            continue;
          }

          // Extract title and description
          const titleEl = item.querySelector('h2, h3, h4, .title, a');
          const title = titleEl?.textContent?.trim() || text.substring(0, 100);
          const description = text.substring(0, 500);

          // Look for date information
          const dateEl = item.querySelector('time, .date, .published, .post-date');
          const dateStr = dateEl?.textContent?.trim() || dateEl?.getAttribute('datetime');

          if (!title || title.length < 15) {
            continue;
          }

          const fullUrl = link
            ? (link.startsWith('http') ? link : `https://www.aphis.usda.gov${link}`)
            : source.url;

          let publishedDate = new Date().toISOString();
          if (dateStr) {
            try {
              const date = new Date(dateStr);
              if (!isNaN(date.getTime())) {
                publishedDate = date.toISOString();
              }
            } catch {
              // Use current date if parsing fails
            }
          }

          const alert = {
            title: `USDA APHIS: ${title}`,
            source: 'USDA-APHIS',
            urgency: determineUrgency(text),
            summary: description.length > 500 ? description.substring(0, 497) + '...' : description,
            published_date: publishedDate,
            external_url: fullUrl,
            full_content: JSON.stringify({
              source: source.name,
              text,
              link: fullUrl,
              date: dateStr,
              scraped_at: new Date().toISOString()
            }),
            agency: 'USDA-APHIS',
            region: 'US',
            category: 'agricultural-health'
          };

          // Check for duplicates
          const { data: existing } = await supabase
            .from('alerts')
            .select('id')
            .eq('title', alert.title)
            .eq('source', alert.source)
            .gte('published_date', thirtyDaysAgo.toISOString())
            .maybeSingle();

          if (!existing) {
            const { error } = await supabase
              .from('alerts')
              .insert(alert);

            if (!error) {
              totalProcessed++;
              logStep('Added APHIS alert', { title: alert.title });
            }
          }
        } catch (itemError) {
          logStep('Error processing content item', { error: itemError });
          continue;
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (sourceError) {
      logStep('Error processing APHIS source', { source: source.name, error: sourceError });
      continue;
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Processed ${totalProcessed} USDA APHIS alerts`,
    processed: totalProcessed,
    sources_checked: APHIS_SOURCES.length,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function testScraper() {
  const testUrl = APHIS_SOURCES[0].url;

  logStep('Testing USDA APHIS page access', { url: testUrl });

  try {
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'RegIQ-APHIS/1.0',
        'Accept': 'text/html',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(15000)
    });

    const isSuccess = response.ok;
    const responseText = await response.text();

    return new Response(JSON.stringify({
      success: isSuccess,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      contentLength: responseText.length,
      contentPreview: responseText.substring(0, 1000),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
}

function determineUrgency(text: string): string {
  const lowerText = text.toLowerCase();

  // High urgency keywords
  const highUrgencyKeywords = [
    'outbreak', 'emergency', 'quarantine', 'immediate', 'urgent',
    'avian flu', 'bird flu', 'african swine fever', 'foot-and-mouth',
    'highly pathogenic', 'eradication', 'detection', 'confirmed',
    'restricted', 'prohibited', 'banned'
  ];

  // Medium urgency keywords
  const mediumUrgencyKeywords = [
    'disease', 'pest', 'import', 'restriction', 'requirement',
    'inspection', 'surveillance', 'monitoring', 'alert', 'notice'
  ];

  if (highUrgencyKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'High';
  } else if (mediumUrgencyKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'Medium';
  }

  return 'Low';
}