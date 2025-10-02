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
  logger.info(`[FDA-WARNING-LETTERS] ${step}${detailsStr}`);
};

interface WarningLetter {
  title: string;
  issuedDate: string;
  company: string;
  subject: string;
  link: string;
  issuerOffice: string;
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
    logStep("FDA Warning Letters scraper started");

    const { action = 'scrape_warning_letters', test_mode = false, fallback_trigger = false } = await req.json().catch(() => ({}));

    // Check if FDA Enforcement API is down and we need fallback
    if (fallback_trigger || await shouldUseFallback(supabaseClient)) {
      logStep('FDA Enforcement API unavailable - triggering Warning Letters fallback');
    }

    switch (action) {
      case 'scrape_warning_letters':
        return await scrapeWarningLetters(supabaseClient, test_mode);
      case 'test_scraper':
        return await testScraper();
      case 'test_inline':
        return await runInlineTest(supabaseClient);
      default:
        return await scrapeWarningLetters(supabaseClient, test_mode);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in fda-warning-letters", { message: errorMessage });

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

/**
 * Check if FDA Enforcement API is down and fallback needed
 */
async function shouldUseFallback(supabase: any): Promise<boolean> {
  try {
    const { data: recentHealth } = await supabase
      .from('api_health_checks')
      .select('*')
      .eq('api_name', 'FDA')
      .order('checked_at', { ascending: false })
      .limit(1)
      .single();

    if (!recentHealth) return false;

    // Check if last check was >24h ago or failed
    const lastCheck = new Date(recentHealth.checked_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60);

    return hoursDiff > 24 || recentHealth.status !== 'healthy';
  } catch {
    return false;
  }
}

/**
 * Run inline test - fetch sample data to validate
 */
async function runInlineTest(supabaseClient: any) {
  logStep('Running inline test mode');

  try {
    // Fetch sample letters
    const letters = await fetchWarningLettersFromHTML();
    
    if (letters.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No warning letters found',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

    // Take first 5 for testing
    const testLetters = letters.slice(0, 5);
    const testRecords = testLetters.map(letter => transformToAlert(letter));

    // Check for duplicates against existing enforcement alerts
    const { data: existingAlerts } = await supabaseClient
      .from('alerts')
      .select('external_url')
      .in('external_url', testRecords.map(r => r.external_url));

    const existingUrls = new Set(existingAlerts?.map((a: any) => a.external_url) || []);
    const deduped = testRecords.filter(r => !existingUrls.has(r.external_url));

    logStep('Inline test complete', {
      total_fetched: testLetters.length,
      duplicates_found: testRecords.length - deduped.length,
      unique_records: deduped.length
    });

    return new Response(JSON.stringify({
      success: true,
      test_mode: true,
      sample_records: deduped,
      total_fetched: testLetters.length,
      duplicates_found: testRecords.length - deduped.length,
      unique_records: deduped.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logStep('Inline test failed', { error: errorMsg });

    return new Response(JSON.stringify({
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
}

async function fetchWithRetry(url: string, retryCount = 0): Promise<Response> {
  const maxRetries = 3;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'RegIQ Food Safety Monitor/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(45000) // 45 second timeout
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

async function scrapeWarningLetters(supabase: any, testMode: boolean = false) {
  // FDA Warning Letters page - CORRECTED URL
  const warningLettersUrl = 'https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters';

  logStep('Fetching FDA Warning Letters page', { url: warningLettersUrl, test_mode: testMode });

  try {
    const letters = await fetchWarningLettersFromHTML();

    if (letters.length === 0) {
      logStep('No warning letters found - page structure may have changed');
      return new Response(JSON.stringify({
        success: true,
        message: 'No warning letters found - page structure may have changed',
        processed: 0,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep('Warning letters extracted', { count: letters.length });

    // Transform to alerts
    const alerts = letters.map(letter => transformToAlert(letter));

    // Check for duplicates against existing alerts (both enforcement and warning letters)
    const { data: existingAlerts } = await supabase
      .from('alerts')
      .select('external_url')
      .in('external_url', alerts.map(a => a.external_url));

    const existingUrls = new Set(existingAlerts?.map((a: any) => a.external_url) || []);
    const newAlerts = alerts.filter(a => !existingUrls.has(a.external_url));

    logStep('Deduplication complete', {
      total: alerts.length,
      duplicates: alerts.length - newAlerts.length,
      new: newAlerts.length
    });

    if (testMode) {
      return new Response(JSON.stringify({
        success: true,
        test_mode: true,
        message: 'Test mode - no data inserted',
        total_fetched: letters.length,
        unique_records: newAlerts.length,
        sample_records: newAlerts.slice(0, 5),
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Insert new alerts
    if (newAlerts.length > 0) {
      const { error: insertError } = await supabase
        .from('alerts')
        .insert(newAlerts);

      if (insertError) {
        throw insertError;
      }
    }

    logStep('FDA Warning Letters scrape complete', {
      inserted: newAlerts.length
    });

    return new Response(JSON.stringify({
      success: true,
      processed: letters.length,
      inserted: newAlerts.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logStep('Scrape error', { error: errorMsg });

    return new Response(JSON.stringify({
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
}

/**
 * Fetch warning letters from HTML page
 */
async function fetchWarningLettersFromHTML(): Promise<WarningLetter[]> {
  const warningLettersUrl = 'https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters';

  logStep('Fetching FDA Warning Letters page', { url: warningLettersUrl });

  try {
    const response = await fetchWithRetry(warningLettersUrl);

    if (!response.ok) {
      throw new Error(`FDA Warning Letters page error: ${response.status} ${response.statusText}`);
    }

    const htmlText = await response.text();
    logStep('FDA Warning Letters page fetched', { length: htmlText.length });

    // Parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    if (!doc) {
      throw new Error('Failed to parse FDA Warning Letters HTML');
    }

    // Extract warning letters from the page
    // FDA lists warning letters in various formats - try multiple selectors
    let tableRows = doc.querySelectorAll('table.views-table tbody tr, table tbody tr');
    logStep('Found table rows', { count: tableRows.length });

    if (tableRows.length === 0) {
      // Try views rows
      tableRows = doc.querySelectorAll('div.views-row, article.node--type-warning-letter');
      logStep('Trying alternative selectors (views-row)', { count: tableRows.length });
    }

    if (tableRows.length === 0) {
      // Try list items
      tableRows = doc.querySelectorAll('li.views-row, div.item-list li');
      logStep('Trying list item selectors', { count: tableRows.length });

    }

    if (tableRows.length === 0) {
      logStep('No warning letters found with any selector - page may have changed structure');
      return [];
    }

    const warningLetters: WarningLetter[] = [];

    // Parse each row - try multiple selector strategies
    for (const row of tableRows) {
      try {
        // Strategy 1: Table-based layout
        let titleEl = row.querySelector('td:first-child a, td a');
        let dateEl = row.querySelector('td:nth-child(2), time');
        let companyEl = row.querySelector('td:nth-child(3)');
        let subjectEl = row.querySelector('td:nth-child(4)');
        let officeEl = row.querySelector('td:nth-child(5)');

        // Strategy 2: Views field-based layout
        if (!titleEl) {
          titleEl = row.querySelector('.views-field-title a, .field--name-title a, h3 a, h4 a, h2 a');
          dateEl = row.querySelector('.views-field-field-issued-date, .field--name-field-issued-date, .date, time');
          companyEl = row.querySelector('.views-field-field-warning-letter-company, .field--name-field-warning-letter-company, .company');
          subjectEl = row.querySelector('.views-field-field-warning-letter-subject, .field--name-field-warning-letter-subject, .subject');
          officeEl = row.querySelector('.views-field-field-issuing-office, .field--name-field-issuing-office, .office');
        }

        const title = titleEl?.textContent?.trim() || '';
        const link = titleEl?.getAttribute('href')?.trim() || '';
        const issuedDate = dateEl?.textContent?.trim() || '';
        const company = companyEl?.textContent?.trim() || 'Unknown Company';
        const subject = subjectEl?.textContent?.trim() || '';
        const issuerOffice = officeEl?.textContent?.trim() || '';

        // Filter for food-related warning letters
        const combinedText = `${title} ${subject} ${company}`.toLowerCase();
        const foodKeywords = ['food', 'dietary', 'supplement', 'cgmp', 'haccp', 'sanitation',
          'adulteration', 'misbranding', 'allergen', 'listeria', 'salmonella', 'processing',
          'manufacturing', 'facility', 'beverage', 'produce', 'meat', 'seafood', 'dairy'];

        const isFoodRelated = foodKeywords.some(keyword => combinedText.includes(keyword));

        if (title && link && isFoodRelated) {
          warningLetters.push({
            title,
            issuedDate,
            company,
            subject,
            link: link.startsWith('http') ? link : `https://www.fda.gov${link}`,
            issuerOffice
          });
        }
      } catch (rowError) {
        logStep('Error parsing warning letter row', { error: rowError });
        continue;
      }
    }

    logStep('Parsed warning letters', { total: warningLetters.length });
    return warningLetters;

  } catch (error) {
    throw new Error(`Failed to fetch FDA warning letters: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Transform warning letter to alert format
 */
function transformToAlert(letter: WarningLetter): any {
        
        // Extract violations from subject/title
        const violations: string[] = [];
        const text = `${letter.title} ${letter.subject}`.toLowerCase();
        if (text.includes('cgmp')) violations.push('CGMP Violations');
        if (text.includes('adulteration')) violations.push('Adulteration');
        if (text.includes('misbranding')) violations.push('Misbranding');
        if (text.includes('inspection')) violations.push('Inspection Issues');

        // Save to dedicated fda_warning_letters table
        const { error: wlError } = await supabase
          .from('fda_warning_letters')
          .upsert({
            letter_number: `WL-${letter.title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50)}-${Date.now()}`,
            issuing_office: letter.issuerOffice || 'FDA',
            issue_date: alert.published_date.split('T')[0],
            subject: letter.subject || letter.title,
            company_name: letter.company,
            letter_url: letter.link,
            product_type: ['Food'],
            violations: violations,
            raw_data: letter
          }, {
            onConflict: 'letter_number'
          });

        if (wlError) {
          logStep('Error saving to fda_warning_letters table', { error: wlError.message });
        }

        // Check if alert already exists in general alerts table (avoid duplicates)
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

          if (error) {
            logStep('Database insert error', { error: error.message, title: alert.title });
          } else {
            processedCount++;
            logStep('Added FDA warning letter alert', { title: alert.title });
          }
        } else {
          logStep('Warning letter already exists', { title: alert.title });
        }
      } catch (alertError) {
        logStep('Error processing warning letter', {
          error: alertError,
          title: letter.title
        });
        continue;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processedCount} FDA warning letters`,
      processed: processedCount,
      total_letters: warningLetters.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    throw new Error(`Failed to scrape FDA warning letters: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Transform warning letter to alert format
 */
function transformToAlert(letter: WarningLetter): any {
  return convertToAlert(letter);
}

async function testScraper() {
  const warningLettersUrl = 'https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters';

  logStep('Testing FDA Warning Letters page access', { url: warningLettersUrl });

  try {
    const response = await fetch(warningLettersUrl, {
      headers: {
        'User-Agent': 'RegIQ-FDAWarningLetters/1.0',
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

function convertToAlert(letter: WarningLetter): any {
  // Parse publication date
  let publishedDate: string;
  try {
    if (letter.issuedDate) {
      // Try various date formats
      const dateStr = letter.issuedDate.trim();
      const date = new Date(dateStr);

      if (!isNaN(date.getTime())) {
        publishedDate = date.toISOString();
      } else {
        // Try MM/DD/YYYY format
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const [month, day, year] = parts;
          publishedDate = new Date(`${year}-${month}-${day}`).toISOString();
        } else {
          publishedDate = new Date().toISOString();
        }
      }
    } else {
      publishedDate = new Date().toISOString();
    }
  } catch {
    publishedDate = new Date().toISOString();
  }

  // Determine urgency based on subject matter
  const urgency = determineUrgency(letter);

  // Create summary
  const summary = `Warning letter issued to ${letter.company}${letter.subject ? ` regarding ${letter.subject}` : ''}${letter.issuerOffice ? ` by ${letter.issuerOffice}` : ''}`;

  return {
    title: `FDA Warning Letter: ${letter.company} - ${letter.title}`,
    source: 'FDA-Warnings',
    urgency,
    summary: summary.length > 500 ? summary.substring(0, 497) + '...' : summary,
    published_date: publishedDate,
    external_url: letter.link,
    full_content: JSON.stringify(letter),
    agency: 'FDA',
    region: 'US',
    category: 'compliance'
  };
}

function determineUrgency(letter: WarningLetter): string {
  const text = `${letter.title} ${letter.subject} ${letter.company}`.toLowerCase();

  // High urgency keywords
  const highUrgencyKeywords = [
    'adulteration', 'contamination', 'misbranding', 'serious', 'immediate',
    'critical', 'cgmp', 'sanitation', 'pathogen', 'recall', 'outbreak',
    'death', 'injury', 'hazard', 'listeria', 'salmonella', 'e. coli'
  ];

  // Medium urgency keywords
  const mediumUrgencyKeywords = [
    'labeling', 'registration', 'inspection', 'violation', 'compliance',
    'documentation', 'records', 'procedures', 'quality', 'manufacturing'
  ];

  if (highUrgencyKeywords.some(keyword => text.includes(keyword))) {
    return 'High';
  } else if (mediumUrgencyKeywords.some(keyword => text.includes(keyword))) {
    return 'Medium';
  }

  return 'Medium'; // Default to Medium for all warning letters as they indicate compliance issues
}