import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// This function is designed to be called by a cron job
// It automatically finds sources for alerts without external URLs

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Starting scheduled source finder job...')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for cron
    )

    // Check if we should run (every 2 hours)
    const { data: lastRunData } = await supabaseClient
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'last_scheduled_source_finder')
      .maybeSingle()

    const now = Date.now()
    const lastRun = lastRunData?.setting_value?.timestamp || 0
    const twoHours = 2 * 60 * 60 * 1000 // 2 hours in milliseconds

    if ((now - lastRun) < twoHours) {
      console.log('Skipping source finder - ran recently')
      return new Response(JSON.stringify({ 
        message: 'Skipped - ran recently',
        lastRun: new Date(lastRun).toISOString(),
        nextRun: new Date(lastRun + twoHours).toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Update last run timestamp
    await supabaseClient.rpc('upsert_system_setting', {
      key_param: 'last_scheduled_source_finder',
      value_param: { timestamp: now },
      description_param: 'Last time the scheduled source finder ran'
    })

    // Get alerts without good external URLs from the last 7 days
    const { data: alerts, error } = await supabaseClient
      .from('alerts')
      .select('id, title, summary, source, external_url, published_date, agency, full_content')
      .or('external_url.is.null,external_url.ilike.%.gov%')
      .gte('published_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('published_date', { ascending: false })
      .limit(25) // Process more alerts per run

    if (error) {
      console.error('Error fetching alerts:', error)
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
      console.log('No alerts need source enhancement')
      await supabaseClient.rpc('log_source_finder_result', {
        processed_count: 0,
        updated_count: 0,
        status_text: 'Scheduled run completed - no alerts needed enhancement',
        error_text: null
      })
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No alerts need source enhancement',
        processed: 0,
        updated: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${alerts.length} alerts for source enhancement`)
    let updatedCount = 0
    const results = []

    // Process each alert with enhanced source finding
    for (const alert of alerts) {
      try {
        console.log(`Processing alert: ${alert.title.substring(0, 50)}...`)
        
        const sourceResults = await enhancedSourceFinding(alert)
        
        if (sourceResults.length > 0) {
          // Pick the best result based on confidence
          const bestResult = sourceResults.reduce((best, current) => 
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
              results.push({
                id: alert.id,
                title: alert.title.substring(0, 100),
                new_url: bestResult.url,
                confidence: bestResult.confidence,
                method: bestResult.method
              })
              console.log(`Updated alert ${alert.id} with source: ${bestResult.url} (confidence: ${bestResult.confidence})`)
            } else {
              console.error(`Failed to update alert ${alert.id}:`, updateError)
            }
          }
        }
        
        // Wait between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error)
      }
    }

    const result = {
      success: true,
      processed: alerts.length,
      updated: updatedCount,
      results: results,
      timestamp: new Date().toISOString()
    }

    console.log('Scheduled source finder completed:', result)

    // Log the completion
    await supabaseClient.rpc('log_source_finder_result', {
      processed_count: alerts.length,
      updated_count: updatedCount,
      status_text: `Scheduled run completed successfully. Enhanced ${updatedCount} of ${alerts.length} alerts`,
      error_text: null
    })

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in scheduled-source-finder:', error)
    
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
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error',
      timestamp: new Date().toISOString() 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Enhanced source finding with multiple methods
async function enhancedSourceFinding(alert: any): Promise<Array<{url: string, title: string, snippet: string, confidence: number, method: string}>> {
  const results: Array<{url: string, title: string, snippet: string, confidence: number, method: string}> = []
  
  // Method 1: Enhanced web search with multiple queries
  const webResults = await multiEngineWebSearch(alert)
  results.push(...webResults)
  
  // Method 2: Government site specific search
  const govResults = await searchGovernmentSites(alert)
  results.push(...govResults)
  
  // Method 3: Content pattern matching
  const patternResults = await contentPatternMatching(alert)
  results.push(...patternResults)
  
  return results.filter(r => r.confidence > 0.3).sort((a, b) => b.confidence - a.confidence)
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
    } catch (error) {
      console.error(`Web search failed for query: ${query}`, error)
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
    'fda': (slug) => `https://www.fda.gov/news-events/press-announcements/${slug}`,
    'usda': (slug) => `https://www.usda.gov/media/press-releases/${slug}`,
    'epa': (slug) => `https://www.epa.gov/newsroom/${slug}`,
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
  const govDomains = ['fda.gov', 'usda.gov', 'epa.gov', 'cdc.gov', 'nih.gov', 'ema.europa.eu', 'efsa.europa.eu']
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
    (sourceLower.includes('cdc') && urlLower.includes('cdc.gov'))
  
  return hasQualityIndicator && agencyMatch
}

function calculateConfidence(url: string, title: string, alert: any): number {
  let confidence = 0.5
  
  // URL quality
  if (url.includes('press-release') || url.includes('news-events')) confidence += 0.2
  if (url.includes('safety') || url.includes('recall') || url.includes('alert')) confidence += 0.2
  
  // Title matching
  if (title) {
    const titleWords = alert.title.toLowerCase().split(' ').filter((w: string) => w.length > 3)
    const matchedWords = titleWords.filter((word: string) => title.toLowerCase().includes(word)).length
    confidence += (matchedWords / titleWords.length) * 0.3
  }
  
  // Agency matching
  const sourceLower = alert.source.toLowerCase()
  if ((sourceLower.includes('fda') && url.includes('fda.gov')) ||
      (sourceLower.includes('usda') && url.includes('usda.gov')) ||
      (sourceLower.includes('epa') && url.includes('epa.gov'))) {
    confidence += 0.2
  }
  
  return Math.min(confidence, 1.0)
}