// Simple logger for edge functions
const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function logStep(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  logger.info(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// This function is designed to be called by a cron job
// It automatically scrapes sources and finds links for alerts without external URLs

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    logStep('Starting scheduled source finder job...')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for cron
    )

    // Check if we should run (every 4 hours)
    const { data: lastRunData } = await supabaseClient
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'last_scheduled_source_update')
      .maybeSingle()

    const now = Date.now()
    const lastRun = lastRunData?.setting_value?.timestamp ? 
      new Date(lastRunData.setting_value.timestamp).getTime() : 0
    const fourHours = 4 * 60 * 60 * 1000 // 4 hours in milliseconds

    if ((now - lastRun) < fourHours) {
      logStep('Skipping source finder - ran recently', {
        lastRun: new Date(lastRun).toISOString(),
        nextRun: new Date(lastRun + fourHours).toISOString()
      })
      return new Response(JSON.stringify({ 
        message: 'Skipped - ran recently',
        lastRun: new Date(lastRun).toISOString(),
        nextRun: new Date(lastRun + fourHours).toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results: any = {};
    
    // Step 1: Run web scraping first to populate cache
    logStep('Step 1: Running web scraping for all agencies')
    try {
      const { data: scrapingResult, error: scrapingError } = await supabaseClient.functions.invoke(
        'government-web-scraper',
        { body: {} }
      );
      
      if (scrapingError) {
        throw new Error(`Web scraping failed: ${scrapingError.message}`);
      }
      
      results.scraping = scrapingResult;
      logStep('Web scraping completed', {
        totalTargets: scrapingResult.total_targets,
        successfulScrapes: scrapingResult.successful_scrapes,
        totalItems: scrapingResult.total_items
      });
    } catch (error: any) {
      logStep('Web scraping failed, continuing with source finding', { error: error.message });
      results.scraping = { error: error.message };
    }
    
    // Wait for scraping data to be cached
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 2: Run enhanced source finding
    logStep('Step 2: Running enhanced source finding')
    
    // Get alerts without good external URLs from the last 7 days
    const { data: alerts, error } = await supabaseClient
      .from('alerts')
      .select('id, title, summary, source, external_url, published_date, agency, full_content')
      .or('external_url.is.null,external_url.ilike.%.gov%')
      .gte('published_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('published_date', { ascending: false })
      .limit(30) // Process more alerts per run

    if (error) {
      logStep('Error fetching alerts', { error: error.message })
      await supabaseClient.rpc('log_source_finder_result', {
        processed_count: 0,
        updated_count: 0,
        status_text: 'Failed to fetch alerts for scheduled run',
        error_text: error.message
      })
      
      return new Response(JSON.stringify({ error: 'Failed to fetch alerts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!alerts || alerts.length === 0) {
      logStep('No alerts need source enhancement')
      await supabaseClient.rpc('log_source_finder_result', {
        processed_count: 0,
        updated_count: 0,
        status_text: 'Scheduled run completed - no alerts needed enhancement',
        error_text: null
      })
      
      results.sourceFinding = {
        processed: 0,
        updated: 0,
        message: 'No alerts need source enhancement'
      };
    } else {
      logStep(`Found ${alerts.length} alerts for source enhancement`)
      let updatedCount = 0
      const sourceResults = []

      // Process each alert with enhanced source finding
      for (const alert of alerts) {
        try {
          logStep(`Processing alert: ${alert.title.substring(0, 50)}...`)
          
          const sourceMatches = await enhancedSourceFinding(alert, supabaseClient)
          
          if (sourceMatches.length > 0) {
            // Pick the best result based on confidence
            const bestResult = sourceMatches.reduce((best, current) => 
              current.confidence > best.confidence ? current : best
            )
            
            if (bestResult.confidence > 0.5) { // Only update if high confidence
              const updateData: any = {
                external_url: bestResult.url
              }
              
              // If we don't have full content, try to add snippet
              if (!alert.full_content && bestResult.snippet) {
                updateData.full_content = bestResult.snippet
              }

              const { error: updateError } = await supabaseClient
                .from('alerts')
                .update(updateData)
                .eq('id', alert.id)

              if (!updateError) {
                updatedCount++
                sourceResults.push({
                  id: alert.id,
                  title: alert.title.substring(0, 100),
                  old_url: alert.external_url,
                  new_url: bestResult.url,
                  confidence: bestResult.confidence,
                  method: bestResult.method
                })
                logStep(`Updated alert ${alert.id} with source: ${bestResult.url} (confidence: ${bestResult.confidence})`)
              } else {
                logStep(`Failed to update alert ${alert.id}`, { error: updateError })
              }
            }
          }
          
          // Wait between requests to be respectful
          await new Promise(resolve => setTimeout(resolve, 1200))
        } catch (error: any) {
          logStep(`Error processing alert ${alert.id}`, { error: error.message })
        }
      }

      results.sourceFinding = {
        processed: alerts.length,
        updated: updatedCount,
        results: sourceResults
      };

      // Log the completion
      await supabaseClient.rpc('log_source_finder_result', {
        processed_count: alerts.length,
        updated_count: updatedCount,
        status_text: `Scheduled run completed successfully. Enhanced ${updatedCount} of ${alerts.length} alerts`,
        error_text: null
      })
    }

    // Step 3: Update system settings with comprehensive results
    await supabaseClient.rpc('upsert_system_setting', {
      key_param: 'last_scheduled_source_update',
      value_param: {
        timestamp: new Date().toISOString(),
        scraping_results: results.scraping,
        source_finding_results: results.sourceFinding,
        total_alerts_enhanced: results.sourceFinding?.updated || 0,
        total_items_scraped: results.scraping?.total_items || 0
      },
      description_param: 'Last scheduled source link update with scraping and matching results'
    })
    
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      scraping: {
        success: !results.scraping?.error,
        totalTargets: results.scraping?.total_targets || 0,
        successfulScrapes: results.scraping?.successful_scrapes || 0,
        totalItems: results.scraping?.total_items || 0,
        error: results.scraping?.error
      },
      sourceFinding: {
        success: !results.sourceFinding?.error,
        processed: results.sourceFinding?.processed || 0,
        updated: results.sourceFinding?.updated || 0,
        error: results.sourceFinding?.error
      },
      message: `Processed ${results.sourceFinding?.processed || 0} alerts, enhanced ${results.sourceFinding?.updated || 0} with source links`
    };

    logStep('Scheduled source finder completed', summary)

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    logStep('Error in scheduled-source-finder', { error: error.message })
    
    // Try to log the error
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )
      
      await supabaseClient.rpc('log_source_finder_result', {
        processed_count: 0,
        updated_count: 0,
        status_text: 'Scheduled run failed with exception',
        error_text: error.message
      })
    } catch (logError: any) {
      logStep('Failed to log error', { error: logError.message })
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString() 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Enhanced source finding with scraped data integration
async function enhancedSourceFinding(alert: any, supabaseClient: any): Promise<Array<{url: string, title: string, snippet: string, confidence: number, method: string}>> {
  const results: Array<{url: string, title: string, snippet: string, confidence: number, method: string}> = []
  
  // Method 1: Check cached scraped data first (highest priority)
  const cachedResults = await checkScrapedCache(alert, supabaseClient)
  results.push(...cachedResults)
  
  // Method 2: Enhanced web search with multiple queries
  const webResults = await multiEngineWebSearch(alert)
  results.push(...webResults)
  
  // Method 3: Government site specific search
  const govResults = await searchGovernmentSites(alert)
  results.push(...govResults)
  
  // Method 4: Content pattern matching
  const patternResults = await contentPatternMatching(alert)
  results.push(...patternResults)
  
  return results.filter(r => r.confidence > 0.3).sort((a, b) => b.confidence - a.confidence)
}

async function checkScrapedCache(alert: any, supabaseClient: any): Promise<Array<{url: string, title: string, snippet: string, confidence: number, method: string}>> {
  const results: Array<{url: string, title: string, snippet: string, confidence: number, method: string}> = []
  
  try {
    // Look for cached scraped data from the same agency
    const { data: cachedData } = await supabaseClient
      .from('search_cache')
      .select('result_data')
      .like('query', `scraped_data_${alert.source}%`)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (cachedData && cachedData.length > 0) {
      for (const cache of cachedData) {
        const items = cache.result_data?.items || []
        
        for (const item of items) {
          const titleMatch = calculateTitleMatch(alert.title, item.title || '')
          const dateMatch = calculateDateMatch(alert.published_date, item.date)
          
          // Exact title match gets highest confidence
          if (titleMatch > 0.8 && item.link) {
            results.push({
              url: item.link,
              title: item.title || alert.title,
              snippet: item.content || alert.summary,
              confidence: 0.95,
              method: 'cached_scraped_exact'
            })
          }
          // Good fuzzy match with date correlation
          else if (titleMatch > 0.5 && dateMatch > 0.6 && item.link) {
            results.push({
              url: item.link,
              title: item.title || alert.title,
              snippet: item.content || alert.summary,
              confidence: 0.8,
              method: 'cached_scraped_fuzzy'
            })
          }
          // Date-based match for recent items
          else if (dateMatch > 0.8 && titleMatch > 0.3 && item.link) {
            results.push({
              url: item.link,
              title: item.title || alert.title,
              snippet: item.content || alert.summary,
              confidence: 0.7,
              method: 'cached_scraped_date'
            })
          }
        }
      }
    }
  } catch (error: any) {
    logStep('Error checking scraped cache', { error: error.message })
  }
  
  return results
}

function calculateTitleMatch(title1: string, title2: string): number {
  if (!title1 || !title2) return 0
  
  const normalize = (text: string) => text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  const norm1 = normalize(title1)
  const norm2 = normalize(title2)
  
  // Check for substring matches
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.9
  }
  
  const words1 = norm1.split(' ').filter(w => w.length > 3)
  const words2 = norm2.split(' ').filter(w => w.length > 3)
  
  if (words1.length === 0 || words2.length === 0) return 0
  
  const commonWords = words1.filter(word => words2.includes(word))
  return commonWords.length / Math.max(words1.length, words2.length)
}

function calculateDateMatch(alertDate: string, scrapedDate?: string): number {
  if (!scrapedDate) return 0
  
  try {
    const alert = new Date(alertDate)
    const scraped = new Date(scrapedDate)
    
    if (isNaN(alert.getTime()) || isNaN(scraped.getTime())) return 0
    
    const diffMs = Math.abs(alert.getTime() - scraped.getTime())
    const diffDays = diffMs / (24 * 60 * 60 * 1000)
    
    if (diffDays <= 1) return 1.0
    if (diffDays <= 3) return 0.8
    if (diffDays <= 7) return 0.6
    return 0.3
  } catch {
    return 0
  }
}

async function multiEngineWebSearch(alert: any): Promise<Array<{url: string, title: string, snippet: string, confidence: number, method: string}>> {
  const results: Array<{url: string, title: string, snippet: string, confidence: number, method: string}> = []
  
  const searchQueries = [
    `"${alert.title}" site:${getSourceDomain(alert.source)}`,
    `"${alert.title.substring(0, 60)}" ${alert.source} official`,
    `${alert.title.split(' ').slice(0, 8).join(' ')} ${alert.agency || alert.source} press release`,
    `"${alert.title}" ${alert.source} news`
  ]
  
  for (const query of searchQueries) {
    try {
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'RegIQ Enhanced Source Finder Bot 2.0'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.Results && data.Results.length > 0) {
          for (const result of data.Results) {
            if (result.FirstURL && isHighQualityGovernmentURL(result.FirstURL, alert.source)) {
              results.push({
                url: result.FirstURL,
                title: result.Text || alert.title,
                snippet: result.Result || alert.summary,
                confidence: calculateConfidence(result.FirstURL, result.Text, alert),
                method: 'web_search'
              })
            }
          }
        }
        
        if (data.AbstractURL && isHighQualityGovernmentURL(data.AbstractURL, alert.source)) {
          results.push({
            url: data.AbstractURL,
            title: data.AbstractText || alert.title,
            snippet: data.Abstract || alert.summary,
            confidence: calculateConfidence(data.AbstractURL, data.AbstractText, alert),
            method: 'web_search_abstract'
          })
        }
      }
    } catch (error: any) {
      logStep(`Web search failed for query: ${query}`, { error: error.message })
    }
    
    // Small delay between searches
    await new Promise(resolve => setTimeout(resolve, 400))
  }
  
  return results
}

async function searchGovernmentSites(alert: any): Promise<Array<{url: string, title: string, snippet: string, confidence: number, method: string}>> {
  const results: Array<{url: string, title: string, snippet: string, confidence: number, method: string}> = []
  
  // Construct likely URLs based on common government site patterns
  const likelyUrl = constructDetailedUrl(alert)
  if (likelyUrl) {
    results.push({
      url: likelyUrl,
      title: alert.title,
      snippet: alert.summary,
      confidence: 0.7,
      method: 'government_pattern'
    })
  }
  
  return results
}

async function contentPatternMatching(alert: any): Promise<Array<{url: string, title: string, snippet: string, confidence: number, method: string}>> {
  const results: Array<{url: string, title: string, snippet: string, confidence: number, method: string}> = []
  
  // Extract potential URLs from the alert content
  const urlPattern = /https?:\/\/[^\s<>"]+/g
  const urls = [
    ...(alert.summary.match(urlPattern) || []),
    ...(alert.full_content?.match(urlPattern) || [])
  ]
  
  for (const url of urls) {
    if (isHighQualityGovernmentURL(url, alert.source)) {
      results.push({
        url: url,
        title: alert.title,
        snippet: alert.summary,
        confidence: 0.8,
        method: 'content_extraction'
      })
    }
  }
  
  return results
}

function constructDetailedUrl(alert: any): string | null {
  const source = alert.source.toLowerCase()
  const titleSlug = alert.title.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .slice(0, 6)
    .join('-')
  
  const urlMappings: Record<string, (slug: string) => string> = {
    'fda': (slug) => `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/${slug}`,
    'usda': (slug) => `https://www.fsis.usda.gov/recalls-alerts/${slug}`,
    'epa': (slug) => `https://www.epa.gov/enforcement/${slug}`,
    'cdc': (slug) => `https://www.cdc.gov/media/releases/${slug}`
  }
  
  for (const [key, urlBuilder] of Object.entries(urlMappings)) {
    if (source.includes(key)) {
      return urlBuilder(titleSlug)
    }
  }
  
  return null
}

function getSourceDomain(source: string): string {
  const sourceLower = source.toLowerCase()
  if (sourceLower.includes('fda')) return 'fda.gov'
  if (sourceLower.includes('usda')) return 'usda.gov'  
  if (sourceLower.includes('epa')) return 'epa.gov'
  if (sourceLower.includes('cdc')) return 'cdc.gov'
  return 'gov'
}

function isHighQualityGovernmentURL(url: string, source: string): boolean {
  const urlLower = url.toLowerCase()
  const sourceLower = source.toLowerCase()
  
  // Must be government site
  const govDomains = ['fda.gov', 'usda.gov', 'epa.gov', 'cdc.gov', 'nih.gov', 'ema.europa.eu', 'efsa.europa.eu', 'canada.ca']
  const isGovSite = govDomains.some(domain => urlLower.includes(domain))
  
  if (!isGovSite) return false
  
  // Prefer news, press releases, safety communications
  const qualityIndicators = [
    'press-release', 'news-events', 'safety-communication',
    'recall', 'alert', 'warning', 'announcement', 'newsroom'
  ]
  
  const hasQualityIndicator = qualityIndicators.some(indicator => urlLower.includes(indicator))
  
  // Must match source agency
  const agencyMatch = 
    (sourceLower.includes('fda') && urlLower.includes('fda.gov')) ||
    (sourceLower.includes('usda') && urlLower.includes('usda.gov')) ||
    (sourceLower.includes('epa') && urlLower.includes('epa.gov')) ||
    (sourceLower.includes('cdc') && urlLower.includes('cdc.gov')) ||
    (sourceLower.includes('ema') && urlLower.includes('ema.europa.eu')) ||
    (sourceLower.includes('efsa') && urlLower.includes('efsa.europa.eu')) ||
    (sourceLower.includes('health canada') && urlLower.includes('canada.ca'))
  
  return hasQualityIndicator && agencyMatch
}

function calculateConfidence(url: string, title: string, alert: any): number {
  let confidence = 0.5
  
  // URL quality
  if (url.includes('press-release') || url.includes('news-events')) confidence += 0.2
  if (url.includes('safety') || url.includes('recall') || url.includes('alert')) confidence += 0.2
  
  // Title matching
  if (title) {
    const titleMatch = calculateTitleMatch(alert.title, title)
    confidence += titleMatch * 0.3
  }
  
  // Agency matching
  const sourceLower = alert.source.toLowerCase()
  if ((sourceLower.includes('fda') && url.includes('fda.gov')) ||
      (sourceLower.includes('usda') && url.includes('usda.gov')) ||
      (sourceLower.includes('epa') && url.includes('epa.gov')) ||
      (sourceLower.includes('cdc') && url.includes('cdc.gov'))) {
    confidence += 0.2
  }
  
  return Math.min(confidence, 1.0)
}