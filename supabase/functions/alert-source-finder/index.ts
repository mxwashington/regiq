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

    // Get alerts without external URLs (null or empty string)
    const { data: alerts, error } = await supabaseClient
      .from('alerts')
      .select('id, title, summary, source, external_url, published_date, agency, full_content')
      .or('external_url.is.null,external_url.eq.')
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
  
  // Method 1: Check cached scraped data first
  const cachedResults = await checkScrapedCache(alert)
  results.push(...cachedResults)
  
  // Method 2: Government site direct search
  const govResults = await searchGovernmentSites(alert)
  results.push(...govResults)
  
  // Method 3: Fuzzy title matching with scraped data
  const fuzzyResults = await fuzzyMatchScrapedData(alert)
  results.push(...fuzzyResults)
  
  // Method 4: Date-based matching for recent alerts
  const dateResults = await dateBasedMatching(alert)
  results.push(...dateResults)
  
  // Method 5: Content pattern matching
  const patternResults = await contentPatternMatching(alert)
  results.push(...patternResults)
  
  return results.filter(r => r.confidence > 0.3).sort((a, b) => b.confidence - a.confidence)
}

async function checkScrapedCache(alert: Alert): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    
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
          const confidence = calculateTitleMatch(alert.title, item.title || '')
          
          if (confidence > 0.7 && item.link) {
            results.push({
              url: item.link,
              title: item.title || alert.title,
              snippet: item.content || alert.summary,
              confidence: confidence * 0.95, // Slightly lower than direct match
              method: 'cached_scraped_exact'
            })
          } else if (confidence > 0.4 && item.link) {
            results.push({
              url: item.link,
              title: item.title || alert.title,
              snippet: item.content || alert.summary,
              confidence: confidence * 0.8,
              method: 'cached_scraped_fuzzy'
            })
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking scraped cache:', error)
  }
  
  return results
}

async function fuzzyMatchScrapedData(alert: Alert): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    
    // Get all recent scraped data for fuzzy matching
    const { data: cachedData } = await supabaseClient
      .from('search_cache')
      .select('result_data')
      .like('query', 'scraped_data_%')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (cachedData && cachedData.length > 0) {
      for (const cache of cachedData) {
        const items = cache.result_data?.items || []
        
        for (const item of items) {
          // Check if agencies match
          if (item.agency === alert.source || 
              alert.source.toLowerCase().includes(item.agency.toLowerCase()) ||
              item.agency.toLowerCase().includes(alert.source.toLowerCase())) {
            
            const titleMatch = calculateFuzzyTitleMatch(alert.title, item.title || '')
            const dateMatch = calculateDateMatch(alert.published_date, item.date)
            
            const combinedConfidence = (titleMatch * 0.7) + (dateMatch * 0.3)
            
            if (combinedConfidence > 0.5 && item.link) {
              results.push({
                url: item.link,
                title: item.title || alert.title,
                snippet: item.content || alert.summary,
                confidence: combinedConfidence,
                method: 'fuzzy_scraped_match'
              })
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in fuzzy matching:', error)
  }
  
  return results
}

async function dateBasedMatching(alert: Alert): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    
    const alertDate = new Date(alert.published_date)
    const startDate = new Date(alertDate.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days before
    const endDate = new Date(alertDate.getTime() + 2 * 24 * 60 * 60 * 1000) // 2 days after
    
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
          if (item.date && item.link) {
            const itemDate = parseFlexibleDate(item.date)
            
            if (itemDate && itemDate >= startDate && itemDate <= endDate) {
              const confidence = 0.6 + (0.3 * calculateTitleMatch(alert.title, item.title || ''))
              
              results.push({
                url: item.link,
                title: item.title || alert.title,
                snippet: item.content || alert.summary,
                confidence: confidence,
                method: 'date_based_match'
              })
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in date-based matching:', error)
  }
  
  return results
}

function calculateTitleMatch(title1: string, title2: string): number {
  if (!title1 || !title2) return 0
  
  const words1 = title1.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const words2 = title2.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  
  if (words1.length === 0 || words2.length === 0) return 0
  
  const commonWords = words1.filter(word => words2.includes(word))
  return commonWords.length / Math.max(words1.length, words2.length)
}

function calculateFuzzyTitleMatch(title1: string, title2: string): number {
  if (!title1 || !title2) return 0
  
  // Normalize titles
  const normalize = (text: string) => text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  const norm1 = normalize(title1)
  const norm2 = normalize(title2)
  
  // Check for substring matches
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return 0.8
  }
  
  // Word-based matching with stemming-like approach
  const words1 = norm1.split(' ').filter(w => w.length > 3)
  const words2 = norm2.split(' ').filter(w => w.length > 3)
  
  let matchCount = 0
  for (const word1 of words1) {
    for (const word2 of words2) {
      // Exact match
      if (word1 === word2) {
        matchCount += 1
      }
      // Prefix match (for plurals, verb forms, etc.)
      else if (word1.length >= 4 && word2.length >= 4) {
        const minLen = Math.min(word1.length, word2.length)
        const prefix = Math.floor(minLen * 0.8)
        if (word1.substring(0, prefix) === word2.substring(0, prefix)) {
          matchCount += 0.7
        }
      }
    }
  }
  
  return matchCount / Math.max(words1.length, words2.length)
}

function calculateDateMatch(alertDate: string, scrapedDate?: string): number {
  if (!scrapedDate) return 0
  
  const alert = new Date(alertDate)
  const scraped = parseFlexibleDate(scrapedDate)
  
  if (!scraped) return 0
  
  const diffMs = Math.abs(alert.getTime() - scraped.getTime())
  const diffDays = diffMs / (24 * 60 * 60 * 1000)
  
  if (diffDays <= 1) return 1.0
  if (diffDays <= 3) return 0.8
  if (diffDays <= 7) return 0.6
  if (diffDays <= 14) return 0.4
  return 0.2
}

function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null
  
  try {
    // Try direct parsing first
    let date = new Date(dateStr)
    if (!isNaN(date.getTime())) return date
    
    // Try common government date formats
    const formats = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
      /(\d{4})-(\d{1,2})-(\d{1,2})/,    // YYYY-MM-DD
      /(\w+)\s+(\d{1,2}),?\s+(\d{4})/,  // Month DD, YYYY
    ]
    
    for (const format of formats) {
      const match = dateStr.match(format)
      if (match) {
        date = new Date(dateStr)
        if (!isNaN(date.getTime())) return date
      }
    }
    
    return null
  } catch {
    return null
  }
}

async function searchGovernmentSites(alert: Alert): Promise<SourceResult[]> {
  const results: SourceResult[] = []
  
  const govSites = [
    { domain: 'fda.gov', searchPath: '/search?query=' },
    { domain: 'usda.gov', searchPath: '/search?q=' },
    { domain: 'epa.gov', searchPath: '/search?query=' },
    { domain: 'cdc.gov', searchPath: '/search/?query=' }
  ]
  
  const relevantSite = govSites.find(site => 
    alert.source.toLowerCase().includes(site.domain.split('.')[0])
  )
  
  if (relevantSite) {
    try {
      const searchQuery = encodeURIComponent(`"${alert.title.substring(0, 80)}"`)
      const searchUrl = `https://www.${relevantSite.domain}${relevantSite.searchPath}${searchQuery}`
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'RegIQ Enhanced Source Finder/2.0'
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
  
  // Construct likely URLs based on agency patterns
  const likelyUrl = constructDetailedUrl(alert)
  if (likelyUrl) {
    results.push({
      url: likelyUrl,
      title: alert.title,
      snippet: alert.summary,
      confidence: 0.7,
      method: 'pattern_construction'
    })
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

function calculateConfidence(url: string, title: string, alert: Alert): number {
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