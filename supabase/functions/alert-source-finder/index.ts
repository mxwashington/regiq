import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Alert {
  id: string;
  title: string;
  summary: string;
  source: string;
  external_url?: string;
  published_date: string;
  agency?: string;
  full_content?: string;
}

interface SourceResult {
  url: string;
  title: string;
  snippet: string;
  confidence: number;
  method: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Get alerts without external URLs or with low confidence URLs
    const { data: alerts, error } = await supabaseClient
      .from('alerts')
      .select('id, title, summary, source, external_url, published_date, agency, full_content')
      .or('external_url.is.null,external_url.like.%.gov%')
      .order('published_date', { ascending: false })
      .limit(20) // Process more alerts

    if (error) {
      console.error('Error fetching alerts:', error)
      return new Response(JSON.stringify({ error: 'Failed to fetch alerts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ message: 'No alerts need source enhancement' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const results = []

    // Log the processing start
    await supabaseClient.rpc('log_source_finder_result', {
      processed_count: alerts.length,
      updated_count: 0,
      status_text: `Starting enhanced source finding for ${alerts.length} alerts`,
      error_text: null
    })

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
          
          // Update the alert with enhanced source information
          const updateData: any = {
            external_url: bestResult.url
          }
          
          // If we don't have full content, try to extract it
          if (!alert.full_content && bestResult.snippet) {
            updateData.full_content = bestResult.snippet
          }

          const { error: updateError } = await supabaseClient
            .from('alerts')
            .update(updateData)
            .eq('id', alert.id)

          if (!updateError) {
            results.push({ 
              id: alert.id, 
              title: alert.title.substring(0, 100),
              old_url: alert.external_url,
              new_url: bestResult.url,
              confidence: bestResult.confidence,
              method: bestResult.method
            })
          } else {
            console.error(`Update error for alert ${alert.id}:`, updateError)
          }
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 800))
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error)
      }
    }

    // Log the final results
    await supabaseClient.rpc('log_source_finder_result', {
      processed_count: alerts.length,
      updated_count: results.length,
      status_text: `Enhanced source finding completed. Updated ${results.length} of ${alerts.length} alerts`,
      error_text: null
    })

    return new Response(JSON.stringify({ 
      processed: alerts.length,
      updated: results.length,
      results: results,
      message: `Enhanced ${results.length} alerts with better source information`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in enhanced alert-source-finder function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function enhancedSourceFinding(alert: Alert): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  
  // Method 1: Government site direct search
  const govResults = await searchGovernmentSites(alert)
  results.push(...govResults)
  
  // Method 2: RSS feed reverse lookup
  const rssResults = await rssReverseLookup(alert)
  results.push(...rssResults)
  
  // Method 3: Web search with multiple engines
  const webResults = await multiEngineWebSearch(alert)
  results.push(...webResults)
  
  // Method 4: Content pattern matching
  const patternResults = await contentPatternMatching(alert)
  results.push(...patternResults)
  
  return results.filter(r => r.confidence > 0.3).sort((a, b) => b.confidence - a.confidence)
}

async function searchGovernmentSites(alert: Alert): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  
  const govSites = [
    { domain: 'fda.gov', api: 'https://www.fda.gov/search?query=' },
    { domain: 'usda.gov', api: 'https://search.usa.gov/search?affiliate=usda&query=' },
    { domain: 'epa.gov', api: 'https://search.epa.gov/search?query=' },
    { domain: 'cdc.gov', api: 'https://search.cdc.gov/search?query=' }
  ]
  
  const relevantSite = govSites.find(site => 
    alert.source.toLowerCase().includes(site.domain.split('.')[0]) ||
    alert.agency?.toLowerCase().includes(site.domain.split('.')[0])
  )
  
  if (relevantSite) {
    try {
      const searchQuery = encodeURIComponent(`"${alert.title.substring(0, 100)}"`)
      const searchUrl = `${relevantSite.api}${searchQuery}`
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'RegIQ Source Finder Bot/2.0'
        }
      })
      
      if (response.ok) {
        const html = await response.text()
        const links = extractLinksFromHTML(html, relevantSite.domain)
        
        for (const link of links) {
          if (isHighConfidenceMatch(link, alert)) {
            results.push({
              url: link.url,
              title: link.title,
              snippet: link.snippet,
              confidence: 0.9,
              method: 'government_site_search'
            })
          }
        }
      }
    } catch (error) {
      console.error(`Government site search failed:`, error)
    }
  }
  
  return results
}

async function rssReverseLookup(alert: Alert): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  
  // Common RSS feed patterns for government agencies
  const rssFeedPatterns = [
    `https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds`,
    `https://www.usda.gov/rss`,
    `https://www.epa.gov/newsroom/rss-feeds`
  ]
  
  // This would ideally check known RSS feeds for the alert
  // For now, construct likely URLs based on patterns
  const likelyUrl = constructDetailedUrl(alert)
  if (likelyUrl) {
    results.push({
      url: likelyUrl,
      title: alert.title,
      snippet: alert.summary,
      confidence: 0.7,
      method: 'rss_reverse_lookup'
    })
  }
  
  return results
}

async function multiEngineWebSearch(alert: Alert): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  
  const searchQueries = [
    `"${alert.title}" site:${getSourceDomain(alert.source)}`,
    `"${alert.title.substring(0, 60)}" ${alert.source} official`,
    `${alert.title.split(' ').slice(0, 8).join(' ')} ${alert.agency || alert.source}`
  ]
  
  for (const query of searchQueries) {
    try {
      // Use DuckDuckGo API (free, no key required)
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'RegIQ Enhanced Source Finder/2.0'
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
    
    // Delay between searches
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return results
}

async function contentPatternMatching(alert: Alert): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  
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

function extractLinksFromHTML(html: string, expectedDomain: string): Array<{url: string, title: string, snippet: string}> {
  const links: Array<{url: string, title: string, snippet: string}> = []
  
  // Simple regex to extract links (in production, use a proper HTML parser)
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi
  let match
  
  while ((match = linkPattern.exec(html)) !== null) {
    const url = match[1]
    const title = match[2]
    
    if (url.includes(expectedDomain) && !url.includes('#') && !url.includes('mailto:')) {
      links.push({
        url: url.startsWith('http') ? url : `https://${expectedDomain}${url}`,
        title: title.trim(),
        snippet: title.trim()
      })
    }
  }
  
  return links.slice(0, 5) // Limit results
}

function isHighConfidenceMatch(link: {url: string, title: string}, alert: Alert): boolean {
  const titleWords = alert.title.toLowerCase().split(' ').filter(w => w.length > 3)
  const linkTitle = link.title.toLowerCase()
  
  const matchCount = titleWords.filter(word => linkTitle.includes(word)).length
  return matchCount >= Math.min(3, titleWords.length * 0.5)
}

function constructDetailedUrl(alert: Alert): string | null {
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

function calculateConfidence(url: string, title: string, alert: Alert): number {
  let confidence = 0.5
  
  // URL quality
  if (url.includes('press-release') || url.includes('news-events')) confidence += 0.2
  if (url.includes('safety') || url.includes('recall') || url.includes('alert')) confidence += 0.2
  
  // Title matching
  if (title) {
    const titleWords = alert.title.toLowerCase().split(' ').filter(w => w.length > 3)
    const matchedWords = titleWords.filter(word => title.toLowerCase().includes(word)).length
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