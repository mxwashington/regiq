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
  logger.info(`[FDA-IMPORT-ALERTS] ${step}${detailsStr}`);
};

interface ImportAlert {
  alertNumber: string;
  country: string;
  product: string;
  reason: string;
  link: string;
  status: string;
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

  let logId: string | null = null;

  try {
    // Start sync log
    const { data: logData, error: logError } = await supabaseClient.rpc('start_sync_log', {
      p_source: 'FDA-Import',
      p_metadata: { action: 'scrape_import_alerts', timestamp: new Date().toISOString() }
    });

    if (logError) {
      logStep("Failed to start sync log", { error: logError.message });
    } else {
      logId = logData;
      logStep("FDA Import Alerts sync started", { logId });
    }

    const { action } = await req.json().catch(() => ({ action: 'scrape_import_alerts' }));

    let result;
    switch (action) {
      case 'scrape_import_alerts':
        result = await scrapeImportAlerts(supabaseClient, logId);
        break;
      case 'test_scraper':
        result = await testScraper();
        break;
      default:
        result = await scrapeImportAlerts(supabaseClient, logId);
    }

    // Complete sync log on success
    if (logId && result.status === 200) {
      const resultData = await result.clone().json();
      await supabaseClient.rpc('finish_sync_log', {
        p_log_id: logId,
        p_status: 'success',
        p_alerts_fetched: resultData.total_alerts || 0,
        p_alerts_inserted: resultData.processed || 0,
        p_results: { action, success: true }
      });
    }

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    logStep("ERROR in fda-import-alerts", { message: errorMessage, stack: errorStack });

    // Complete sync log on error
    if (logId) {
      await supabaseClient.rpc('finish_sync_log', {
        p_log_id: logId,
        p_status: 'error',
        p_alerts_fetched: 0,
        p_alerts_inserted: 0,
        p_errors: [errorMessage]
      });
    }

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

async function scrapeImportAlerts(supabase: any, logId?: string | null) {
  // FDA Import Alerts page
  const importAlertsUrl = 'https://www.accessdata.fda.gov/cms_ia/default.html';

  logStep('Fetching FDA Import Alerts page', { url: importAlertsUrl });

  try {
    const response = await fetch(importAlertsUrl, {
      headers: {
        'User-Agent': 'RegIQ-FDAImportAlerts/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      throw new Error(`FDA Import Alerts page error: ${response.status} ${response.statusText}`);
    }

    const htmlText = await response.text();
    logStep('FDA Import Alerts page fetched', { length: htmlText.length });

    // Parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    if (!doc) {
      throw new Error('Failed to parse FDA Import Alerts HTML');
    }

    // Extract import alerts from the page
    // FDA lists import alerts in various formats - try multiple selectors
    const tableRows = doc.querySelectorAll('table tbody tr, div.alert-row, article.import-alert');
    logStep('Found potential import alert rows', { count: tableRows.length });

    if (tableRows.length === 0) {
      // Try to find links to import alerts
      const alertLinks = doc.querySelectorAll('a[href*="importalert"], a[href*="ia_"]');
      logStep('Found import alert links', { count: alertLinks.length });

      if (alertLinks.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: 'No import alerts found - page may require updated selectors',
          processed: 0,
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Process links instead
      return await processImportAlertLinks(supabase, alertLinks);
    }

    const importAlerts: ImportAlert[] = [];

    // Parse each row
    for (const row of tableRows) {
      try {
        // Try multiple selectors based on FDA page structure
        const alertNumEl = row.querySelector('td:first-child, .alert-number');
        const countryEl = row.querySelector('td:nth-child(2), .country');
        const productEl = row.querySelector('td:nth-child(3), .product, .subject');
        const reasonEl = row.querySelector('td:nth-child(4), .reason');
        const statusEl = row.querySelector('td:nth-child(5), .status');
        const linkEl = row.querySelector('a[href]');

        const alertNumber = alertNumEl?.textContent?.trim() || '';
        const country = countryEl?.textContent?.trim() || '';
        const product = productEl?.textContent?.trim() || '';
        const reason = reasonEl?.textContent?.trim() || '';
        const status = statusEl?.textContent?.trim() || 'Active';
        const link = linkEl?.getAttribute('href')?.trim() || '';

        if (alertNumber && product) {
          importAlerts.push({
            alertNumber,
            country,
            product,
            reason,
            status,
            link: link.startsWith('http') ? link : `https://www.accessdata.fda.gov${link}`
          });
        }
      } catch (rowError) {
        logStep('Error parsing import alert row', { error: rowError });
        continue;
      }
    }

    logStep('Parsed import alerts', { total: importAlerts.length });

    if (importAlerts.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No import alerts extracted - may need selector updates',
        processed: 0,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Convert to alerts and save to database
    let processedCount = 0;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const alert of importAlerts.slice(0, 100)) { // Process up to 100 alerts
      try {
        const alertData = convertToAlert(alert);

        // Check if alert already exists (avoid duplicates)
        const { data: existing } = await supabase
          .from('alerts')
          .select('id')
          .eq('title', alertData.title)
          .eq('source', alertData.source)
          .gte('published_date', thirtyDaysAgo.toISOString())
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from('alerts')
            .insert(alertData);

          if (error) {
            logStep('Database insert error', { error: error.message, title: alertData.title });
          } else {
            processedCount++;
            logStep('Added FDA import alert', { title: alertData.title });
          }
        } else {
          logStep('Import alert already exists', { title: alertData.title });
        }
      } catch (alertError) {
        logStep('Error processing import alert', {
          error: alertError,
          alertNumber: alert.alertNumber
        });
        continue;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedCount} FDA import alerts`,
      processed: processedCount,
      total_alerts: importAlerts.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    throw new Error(`Failed to scrape FDA import alerts: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function processImportAlertLinks(supabase: any, links: any[]): Promise<Response> {
  logStep('Processing import alert links', { count: links.length });

  let processedCount = 0;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  for (const link of Array.from(links).slice(0, 50)) { // Process up to 50 links
    try {
      const href = link.getAttribute('href')?.trim() || '';
      const linkText = link.textContent?.trim() || '';

      if (!href || !linkText) continue;

      const fullUrl = href.startsWith('http') ? href : `https://www.accessdata.fda.gov${href}`;

      const alertData = {
        title: `FDA Import Alert: ${linkText}`,
        source: 'FDA-Import',
        urgency: 'High',
        summary: `FDA Import Alert ${linkText} - Import restrictions or detention without physical examination`,
        published_date: new Date().toISOString(),
        external_url: fullUrl,
        full_content: JSON.stringify({ link: fullUrl, text: linkText }),
        agency: 'FDA',
        region: 'US',
        category: 'import'
      };

      // Check if alert already exists
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('title', alertData.title)
        .eq('source', alertData.source)
        .gte('published_date', thirtyDaysAgo.toISOString())
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase
          .from('alerts')
          .insert(alertData);

        if (!error) {
          processedCount++;
          logStep('Added import alert from link', { title: alertData.title });
        }
      }
    } catch (linkError) {
      logStep('Error processing import alert link', { error: linkError });
      continue;
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Processed ${processedCount} FDA import alerts from links`,
    processed: processedCount,
    total_links: links.length,
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function testScraper() {
  const importAlertsUrl = 'https://www.accessdata.fda.gov/cms_ia/default.html';

  logStep('Testing FDA Import Alerts page access', { url: importAlertsUrl });

  try {
    const response = await fetch(importAlertsUrl, {
      headers: {
        'User-Agent': 'RegIQ-FDAImportAlerts/1.0',
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

function convertToAlert(alert: ImportAlert): any {
  // Determine urgency based on status and content
  const urgency = determineUrgency(alert);

  // Create summary
  const summary = `Import Alert ${alert.alertNumber}${alert.country ? ` - Country: ${alert.country}` : ''}${alert.reason ? ` - Reason: ${alert.reason}` : ''} - Status: ${alert.status}`;

  return {
    title: `FDA Import Alert ${alert.alertNumber}: ${alert.product}`,
    source: 'FDA-Import',
    urgency,
    summary: summary.length > 500 ? summary.substring(0, 497) + '...' : summary,
    published_date: new Date().toISOString(),
    external_url: alert.link || 'https://www.accessdata.fda.gov/cms_ia/default.html',
    full_content: JSON.stringify(alert),
    agency: 'FDA',
    region: 'US',
    category: 'import'
  };
}

function determineUrgency(alert: ImportAlert): string {
  const text = `${alert.alertNumber} ${alert.product} ${alert.reason} ${alert.status}`.toLowerCase();

  // High urgency keywords
  const highUrgencyKeywords = [
    'detention', 'banned', 'prohibited', 'contamination', 'adulteration',
    'pathogen', 'salmonella', 'listeria', 'e. coli', 'active', 'immediate'
  ];

  // Medium urgency keywords
  const mediumUrgencyKeywords = [
    'misbranding', 'labeling', 'registration', 'inspection', 'pesticide'
  ];

  // Check if alert is active
  const isActive = alert.status.toLowerCase().includes('active');

  if (isActive && highUrgencyKeywords.some(keyword => text.includes(keyword))) {
    return 'High';
  } else if (isActive || mediumUrgencyKeywords.some(keyword => text.includes(keyword))) {
    return 'Medium';
  }

  return 'Low';
}