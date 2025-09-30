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
  logger.info(`[NOAA-FISHERIES] ${step}${detailsStr}`);
};

// NOAA Fisheries sources - CORRECTED URLs
const NOAA_SOURCES = [
  {
    name: 'News and Announcements',
    url: 'https://www.fisheries.noaa.gov/news-and-announcements/news',
    keywords: ['advisory', 'mercury', 'contamination', 'closure', 'alert', 'safety', 'seafood', 'fish', 'recall']
  },
  {
    name: 'Bulletins',
    url: 'https://www.fisheries.noaa.gov/news-and-announcements/bulletins',
    keywords: ['closure', 'closed', 'emergency', 'suspension', 'prohibition', 'fishery', 'commercial', 'harvest']
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
    logStep("NOAA Fisheries scraper started");

    const { action } = await req.json().catch(() => ({ action: 'scrape_noaa' }));

    switch (action) {
      case 'scrape_noaa':
        return await scrapeNOAA(supabaseClient);
      case 'test_scraper':
        return await testScraper();
      default:
        return await scrapeNOAA(supabaseClient);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in noaa-fisheries-scraper", { message: errorMessage });

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

async function fetchWithRetry(url: string, retryCount = 0): Promise<Response> {
  const maxRetries = 3;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RegIQ Food Safety Monitor/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(45000)
    });

    if (!response.ok && (response.status === 429 || response.status >= 500) && retryCount < maxRetries) {
      const backoffMs = Math.pow(2, retryCount) * 2000;
      logStep(`Retrying after ${backoffMs}ms (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return fetchWithRetry(url, retryCount + 1);
    }

    return response;
  } catch (error) {
    if (retryCount < maxRetries) {
      const backoffMs = Math.pow(2, retryCount) * 2000;
      logStep(`Network error, retrying after ${backoffMs}ms`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return fetchWithRetry(url, retryCount + 1);
    }
    throw error;
  }
}

async function scrapeNOAA(supabase: any) {
  logStep('Scraping NOAA Fisheries sources');

  let totalProcessed = 0;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  for (const source of NOAA_SOURCES) {
    try {
      logStep(`Fetching ${source.name}`, { url: source.url });

      const response = await fetchWithRetry(source.url);

      if (!response.ok) {
        logStep(`NOAA source error: ${response.status}`, { source: source.name });
        continue;
      }

      const htmlText = await response.text();
      logStep('NOAA page fetched', { source: source.name, length: htmlText.length });

      // Parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');

      if (!doc) {
        logStep('Failed to parse HTML', { source: source.name });
        continue;
      }

      // Extract relevant content - NOAA uses specific structure
      // Try multiple selectors for NOAA news pages
      let contentItems = doc.querySelectorAll('article.node--type-news, article.news-article');
      logStep('Found news articles', { source: source.name, count: contentItems.length });

      if (contentItems.length === 0) {
        // Try bulletin structure
        contentItems = doc.querySelectorAll('article.node--type-bulletin, div.views-row');
        logStep('Trying bulletin selectors', { count: contentItems.length });
      }

      if (contentItems.length === 0) {
        // Fallback to generic article/heading selectors
        contentItems = doc.querySelectorAll('article, div.field--type-text-with-summary, h2.field--name-title');
        logStep('Trying generic selectors', { count: contentItems.length });
      }

      logStep('Found content items total', { source: source.name, count: contentItems.length });

      for (const item of Array.from(contentItems).slice(0, 30)) {
        try {
          const text = item.textContent?.trim() || '';

          // Extract link - try multiple strategies
          let linkEl = item.querySelector('a.field--name-title, a.node__title, h2 a, h3 a');
          if (!linkEl) {
            linkEl = item.querySelector('a[href*="/news/"], a[href*="/bulletin/"]');
          }
          const link = linkEl?.getAttribute('href')?.trim() || '';

          // Check if content matches keywords
          const isRelevant = source.keywords.some(keyword =>
            text.toLowerCase().includes(keyword.toLowerCase())
          );

          if (!isRelevant || text.length < 30) {
            continue;
          }

          // Extract title - try multiple selectors
          let titleEl = item.querySelector('h2.field--name-title, h3.field--name-title, h2.node__title');
          if (!titleEl) {
            titleEl = item.querySelector('h2, h3, h4, .title, a');
          }
          const title = titleEl?.textContent?.trim() || text.substring(0, 100);

          // Extract description/summary
          const summaryEl = item.querySelector('.field--name-body, .field--name-field-summary, .node__content, p');
          const description = summaryEl?.textContent?.trim() || text.substring(0, 500);

          // Extract date if available
          const dateEl = item.querySelector('time, .field--name-post-date, .date, span.date');
          const dateStr = dateEl?.getAttribute('datetime') || dateEl?.textContent?.trim();

          if (!title || title.length < 10) {
            continue;
          }

          const fullUrl = link
            ? (link.startsWith('http') ? link : `https://www.fisheries.noaa.gov${link}`)
            : source.url;

          // Parse date if available
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
            title: `NOAA Fisheries: ${title}`,
            source: 'NOAA',
            urgency: determineUrgency(text),
            summary: description.length > 500 ? description.substring(0, 497) + '...' : description,
            published_date: publishedDate,
            external_url: fullUrl,
            full_content: JSON.stringify({
              source: source.name,
              text,
              link: fullUrl,
              scraped_at: new Date().toISOString()
            }),
            agency: 'NOAA',
            region: 'US',
            category: 'seafood'
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
              logStep('Added NOAA alert', { title: alert.title });
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
      logStep('Error processing NOAA source', { source: source.name, error: sourceError });
      continue;
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Processed ${totalProcessed} NOAA Fisheries alerts`,
    processed: totalProcessed,
    sources_checked: NOAA_SOURCES.length,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function testScraper() {
  const testUrl = NOAA_SOURCES[0].url;

  logStep('Testing NOAA Fisheries page access', { url: testUrl });

  try {
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'RegIQ-NOAA/1.0',
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
    'emergency', 'closure', 'closed', 'immediate', 'urgent', 'alert',
    'contamination', 'mercury', 'toxin', 'danger', 'hazard', 'outbreak',
    'prohibited', 'banned', 'suspended'
  ];

  // Medium urgency keywords
  const mediumUrgencyKeywords = [
    'advisory', 'warning', 'caution', 'update', 'restriction',
    'limited', 'monitoring', 'testing'
  ];

  if (highUrgencyKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'High';
  } else if (mediumUrgencyKeywords.some(keyword => lowerText.includes(keyword))) {
    return 'Medium';
  }

  return 'Low';
}