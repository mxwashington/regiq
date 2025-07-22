import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// This function is designed to be called by a cron job
// It automatically finds sources for alerts without external URLs

serve(async (req) => {
  try {
    console.log('Starting scheduled source finder job...')
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for cron
    )

    // Get alerts without external URLs from the last 7 days
    const { data: alerts, error } = await supabaseClient
      .from('alerts')
      .select('id, title, summary, source, external_url, published_date')
      .is('external_url', null)
      .gte('published_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(20) // Process max 20 per run to avoid timeouts

    if (error) {
      console.error('Error fetching alerts:', error)
      return new Response(JSON.stringify({ error: 'Failed to fetch alerts' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!alerts || alerts.length === 0) {
      console.log('No alerts without sources found')
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No alerts without sources found',
        processed: 0,
        updated: 0 
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`Found ${alerts.length} alerts without sources`)
    let updatedCount = 0

    // Process each alert with a delay to avoid rate limiting
    for (const alert of alerts) {
      try {
        console.log(`Processing alert: ${alert.title}`)
        const sourceUrl = await findAlertSource(alert)
        
        if (sourceUrl) {
          const { error: updateError } = await supabaseClient
            .from('alerts')
            .update({ external_url: sourceUrl })
            .eq('id', alert.id)

          if (!updateError) {
            updatedCount++
            console.log(`Updated alert ${alert.id} with source: ${sourceUrl}`)
          } else {
            console.error(`Failed to update alert ${alert.id}:`, updateError)
          }
        }
        
        // Wait 2 seconds between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error)
      }
    }

    const result = {
      success: true,
      processed: alerts.length,
      updated: updatedCount,
      timestamp: new Date().toISOString()
    }

    console.log('Scheduled source finder completed:', result)

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in scheduled-source-finder:', error)
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error',
      timestamp: new Date().toISOString() 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function findAlertSource(alert: any): Promise<string | null> {
  const searchQueries = [
    `"${alert.title}" ${alert.source}`,
    `"${alert.title.substring(0, 50)}" site:fda.gov OR site:usda.gov OR site:epa.gov`,
    `${alert.title.substring(0, 30)} ${alert.source} regulatory`,
  ]

  for (const query of searchQueries) {
    try {
      // Use a different search approach for better results
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'RegIQ Alert Source Finder Bot 1.0'
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.Results && data.Results.length > 0) {
          for (const result of data.Results) {
            if (result.FirstURL && isRelevantGovernmentSite(result.FirstURL, alert.source)) {
              return result.FirstURL
            }
          }
        }

        if (data.Abstract && data.AbstractURL) {
          if (isRelevantGovernmentSite(data.AbstractURL, alert.source)) {
            return data.AbstractURL
          }
        }
      }
    } catch (error) {
      console.error(`Search failed for query: ${query}`, error)
    }
  }

  return constructLikelyUrl(alert)
}

function isRelevantGovernmentSite(url: string, source: string): boolean {
  const govDomains = [
    'fda.gov',
    'usda.gov', 
    'epa.gov',
    'cdc.gov',
    'nih.gov',
    'ema.europa.eu',
    'efsa.europa.eu'
  ]

  const urlLower = url.toLowerCase()
  const sourceLower = source.toLowerCase()

  const hasGovDomain = govDomains.some(domain => urlLower.includes(domain))
  
  const matchesSource = 
    (sourceLower.includes('fda') && urlLower.includes('fda.gov')) ||
    (sourceLower.includes('usda') && urlLower.includes('usda.gov')) ||
    (sourceLower.includes('epa') && urlLower.includes('epa.gov')) ||
    (sourceLower.includes('cdc') && urlLower.includes('cdc.gov'))

  return hasGovDomain && (matchesSource || govDomains.some(domain => urlLower.includes(domain)))
}

function constructLikelyUrl(alert: any): string | null {
  const source = alert.source.toLowerCase()
  
  const sourceUrls: Record<string, string> = {
    'fda': 'https://www.fda.gov',
    'usda': 'https://www.usda.gov', 
    'epa': 'https://www.epa.gov',
    'cdc': 'https://www.cdc.gov'
  }

  for (const [key, baseUrl] of Object.entries(sourceUrls)) {
    if (source.includes(key)) {
      return baseUrl
    }
  }

  return null
}