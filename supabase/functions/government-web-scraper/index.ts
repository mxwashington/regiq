import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { DOMParser } from 'https://esm.sh/linkedom@0.16.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface ScrapingTarget {
  id: string;
  name: string;
  agency: string;
  url: string;
  selectors: {
    title?: string;
    content?: string;
    date?: string;
    links?: string;
  };
  frequency: string; // daily, weekly, etc.
  legal_basis: string;
  compliance_notes: string;
}

interface ScrapingResult {
  target_id: string;
  success: boolean;
  data?: any[];
  error?: string;
  items_found: number;
  legal_compliance_logged: boolean;
}

function logStep(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// Enhanced scraping targets with comprehensive agency coverage
const SCRAPING_TARGETS: ScrapingTarget[] = [
  // US Federal Agencies
  {
    id: 'fda-recalls-alerts',
    name: 'FDA Recalls and Safety Alerts',
    agency: 'FDA',
    url: 'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts',
    selectors: {
      title: '.field-name-title a, .views-field-title a',
      content: '.field-name-body, .views-field-body',
      date: '.date-display-single, .views-field-field-date',
      links: '.field-name-title a, .views-field-title a'
    },
    frequency: 'daily',
    legal_basis: 'Public safety information under Federal Food, Drug, and Cosmetic Act',
    compliance_notes: 'FDA safety alerts are published for public protection'
  },
  {
    id: 'usda-fsis-recalls',
    name: 'USDA FSIS Recalls and Alerts',
    agency: 'USDA',
    url: 'https://www.fsis.usda.gov/recalls-alerts',
    selectors: {
      title: '.views-field-title a, .node-title a',
      content: '.views-field-body, .field-name-body',
      date: '.views-field-field-recall-date, .date-display-single',
      links: '.views-field-title a, .node-title a'
    },
    frequency: 'daily',
    legal_basis: 'Public safety information under Federal Food, Drug, and Cosmetic Act',
    compliance_notes: 'Food safety recalls are published for public protection'
  },
  {
    id: 'epa-enforcement',
    name: 'EPA Enforcement Actions',
    agency: 'EPA',
    url: 'https://www.epa.gov/enforcement',
    selectors: {
      title: '.field-name-title, .node-title a',
      content: '.field-name-body, .node-content',
      date: '.date-display-single, .field-name-post-date',
      links: 'a[href*="enforcement"], .node-title a'
    },
    frequency: 'weekly',
    legal_basis: 'Public information under Environmental laws',
    compliance_notes: 'Environmental enforcement actions are public record'
  },
  {
    id: 'cdc-media-releases',
    name: 'CDC Media Releases',
    agency: 'CDC',
    url: 'https://www.cdc.gov/media/releases/',
    selectors: {
      title: '.syndicate h3 a, .list-item-title a',
      content: '.syndicate .summary, .list-item-description',
      date: '.syndicate .date, .list-item-date',
      links: '.syndicate h3 a, .list-item-title a'
    },
    frequency: 'daily',
    legal_basis: 'Public health information under CDC authority',
    compliance_notes: 'Public health communications are in the public interest'
  },
  {
    id: 'osha-news',
    name: 'OSHA News Releases',
    agency: 'OSHA',
    url: 'https://www.osha.gov/news/newsreleases',
    selectors: {
      title: '.views-field-title a, .node-title a',
      content: '.views-field-field-summary, .field-name-body',
      date: '.views-field-field-news-release-date, .date-display-single',
      links: '.views-field-title a, .node-title a'
    },
    frequency: 'weekly',
    legal_basis: 'Public workplace safety information',
    compliance_notes: 'Workplace safety information serves public interest'
  },
  {
    id: 'ftc-press-releases',
    name: 'FTC Press Releases',
    agency: 'FTC',
    url: 'https://www.ftc.gov/news-events/news/press-releases',
    selectors: {
      title: '.views-field-title a, .press-release-title a',
      content: '.views-field-field-summary, .press-release-summary',
      date: '.views-field-field-date, .press-release-date',
      links: '.views-field-title a, .press-release-title a'
    },
    frequency: 'weekly',
    legal_basis: 'Public consumer protection information',
    compliance_notes: 'Consumer protection information is public'
  },
  // International Agencies
  {
    id: 'ema-news',
    name: 'EMA European Medicines Agency News',
    agency: 'EMA',
    url: 'https://www.ema.europa.eu/en/news',
    selectors: {
      title: '.views-field-title a, .news-item-title a',
      content: '.views-field-field-news-teaser, .news-item-summary',
      date: '.views-field-field-ema-news-date, .news-item-date',
      links: '.views-field-title a, .news-item-title a'
    },
    frequency: 'daily',
    legal_basis: 'Public pharmaceutical safety information under EU regulations',
    compliance_notes: 'European pharmaceutical safety information is public'
  },
  {
    id: 'efsa-news',
    name: 'EFSA European Food Safety Authority News',
    agency: 'EFSA',
    url: 'https://www.efsa.europa.eu/en/news',
    selectors: {
      title: '.views-field-title a, .news-title a',
      content: '.views-field-field-news-summary, .news-summary',
      date: '.views-field-field-news-date, .news-date',
      links: '.views-field-title a, .news-title a'
    },
    frequency: 'daily',
    legal_basis: 'Public food safety information under EU regulations',
    compliance_notes: 'European food safety information serves public interest'
  },
  {
    id: 'health-canada-recalls',
    name: 'Health Canada Recalls and Safety Alerts',
    agency: 'Health Canada',
    url: 'https://recalls-rappels.canada.ca/en',
    selectors: {
      title: '.gc-advnc-srch-rslt h3 a, .recall-title a',
      content: '.gc-advnc-srch-rslt .description, .recall-summary',
      date: '.gc-advnc-srch-rslt .date, .recall-date',
      links: '.gc-advnc-srch-rslt h3 a, .recall-title a'
    },
    frequency: 'daily',
    legal_basis: 'Public health safety information under Canadian regulations',
    compliance_notes: 'Canadian health safety information is public'
  }
];

async function logComplianceActivity(supabase: any, targetId: string, action: string, details: any) {
  try {
    await supabase
      .from('admin_activities')
      .insert({
        action: `government_scraping_${action}`,
        target_type: 'scraping_target',
        target_id: targetId,
        details: {
          timestamp: new Date().toISOString(),
          legal_compliance: true,
          ...details
        }
      });
  } catch (error) {
    logStep('Failed to log compliance activity', { error, targetId, action });
  }
}

async function scrapeWebsite(target: ScrapingTarget): Promise<any[]> {
  logStep(`Starting scrape of ${target.name}`, { url: target.url });
  
  const response = await fetch(target.url, {
    headers: {
      'User-Agent': 'RegIQ-Legal-Compliance-Monitor/1.0 (Contact: compliance@regiq.com)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const document = new DOMParser().parseFromString(html, 'text/html');
  
  const results: any[] = [];
  
  // Extract data based on selectors
  const titleElements = target.selectors.title ? 
    document.querySelectorAll(target.selectors.title) : [];
  const contentElements = target.selectors.content ? 
    document.querySelectorAll(target.selectors.content) : [];
  const dateElements = target.selectors.date ? 
    document.querySelectorAll(target.selectors.date) : [];
  const linkElements = target.selectors.links ? 
    document.querySelectorAll(target.selectors.links) : [];

  const maxItems = Math.max(
    titleElements.length,
    contentElements.length,
    dateElements.length,
    linkElements.length
  );

  for (let i = 0; i < Math.min(maxItems, 20); i++) { // Limit to 20 items per scrape
    const item: any = {
      scraped_at: new Date().toISOString(),
      source: target.name,
      agency: target.agency,
      target_id: target.id
    };

    if (titleElements[i]) {
      item.title = titleElements[i].textContent?.trim();
    }
    
    if (contentElements[i]) {
      item.content = contentElements[i].textContent?.trim();
    }
    
    if (dateElements[i]) {
      item.date = dateElements[i].textContent?.trim();
    }
    
    if (linkElements[i]) {
      const href = linkElements[i].getAttribute('href');
      if (href) {
        item.link = href.startsWith('http') ? href : `${new URL(target.url).origin}${href}`;
      }
    }

    // Only add items with meaningful content
    if (item.title || item.content) {
      results.push(item);
    }
  }

  return results;
}

async function processScrapingTarget(supabase: any, target: ScrapingTarget): Promise<ScrapingResult> {
  const startTime = Date.now();
  
  try {
    // Log compliance start
    await logComplianceActivity(supabase, target.id, 'started', {
      legal_basis: target.legal_basis,
      compliance_notes: target.compliance_notes,
      frequency: target.frequency
    });

    const data = await scrapeWebsite(target);
    const duration = Date.now() - startTime;
    
    // Store scraped data
    if (data.length > 0) {
      await supabase
        .from('search_cache')
        .upsert({
          cache_key: `scraped_${target.id}_${new Date().toISOString().split('T')[0]}`,
          query: `scraped_data_${target.agency}`,
          result_data: {
            target: target.name,
            agency: target.agency,
            scraped_at: new Date().toISOString(),
            items: data,
            legal_compliance: {
              basis: target.legal_basis,
              notes: target.compliance_notes
            }
          },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        });
    }

    // Log compliance completion
    await logComplianceActivity(supabase, target.id, 'completed', {
      duration_ms: duration,
      items_found: data.length,
      success: true
    });

    logStep(`Successfully scraped ${target.name}`, { 
      itemsFound: data.length, 
      duration 
    });

    return {
      target_id: target.id,
      success: true,
      data,
      items_found: data.length,
      legal_compliance_logged: true
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    // Log compliance error
    await logComplianceActivity(supabase, target.id, 'failed', {
      duration_ms: duration,
      error: error.message,
      success: false
    });

    logStep(`Failed to scrape ${target.name}`, { error: error.message });

    return {
      target_id: target.id,
      success: false,
      error: error.message,
      items_found: 0,
      legal_compliance_logged: true
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Government web scraper request received');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('target');
    const agency = searchParams.get('agency');

    let targetsToProcess = SCRAPING_TARGETS;

    // Filter targets if specific target or agency requested
    if (targetId) {
      targetsToProcess = SCRAPING_TARGETS.filter(t => t.id === targetId);
      if (targetsToProcess.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Target not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else if (agency) {
      targetsToProcess = SCRAPING_TARGETS.filter(t => 
        t.agency.toLowerCase() === agency.toLowerCase()
      );
    }

    logStep(`Processing ${targetsToProcess.length} scraping targets`);

    // Process targets (limit concurrent requests)
    const results: ScrapingResult[] = [];
    const batchSize = 3; // Process 3 targets at a time

    for (let i = 0; i < targetsToProcess.length; i += batchSize) {
      const batch = targetsToProcess.slice(i, i + batchSize);
      const batchPromises = batch.map(target => processScrapingTarget(supabase, target));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to be respectful
      if (i + batchSize < targetsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const summary = {
      success: true,
      total_targets: results.length,
      successful_scrapes: results.filter(r => r.success).length,
      failed_scrapes: results.filter(r => !r.success).length,
      total_items: results.reduce((sum, r) => sum + r.items_found, 0),
      results: results,
      compliance_logged: results.every(r => r.legal_compliance_logged),
      timestamp: new Date().toISOString()
    };

    logStep('Government scraping completed', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    logStep('Unexpected error in government web scraper', { error: error.message });
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});