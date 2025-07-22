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

    // Get alerts without external URLs
    const { data: alerts, error } = await supabaseClient
      .from('alerts')
      .select('id, title, summary, source, external_url, published_date')
      .is('external_url', null)
      .limit(10) // Process in batches

    if (error) {
      console.error('Error fetching alerts:', error)
      return new Response(JSON.stringify({ error: 'Failed to fetch alerts' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ message: 'No alerts without sources found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const updatedAlerts = []

    // Process each alert
    for (const alert of alerts) {
      try {
        const sourceUrl = await findAlertSource(alert)
        
        if (sourceUrl) {
          // Update the alert with the found source
          const { error: updateError } = await supabaseClient
            .from('alerts')
            .update({ external_url: sourceUrl })
            .eq('id', alert.id)

          if (!updateError) {
            updatedAlerts.push({ 
              id: alert.id, 
              title: alert.title, 
              sourceUrl 
            })
          }
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error)
      }
    }

    return new Response(JSON.stringify({ 
      processed: alerts.length,
      updated: updatedAlerts.length,
      updatedAlerts 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in alert-source-finder function:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function findAlertSource(alert: Alert): Promise<string | null> {
  const searchQueries = [
    `"${alert.title}" ${alert.source}`,
    `"${alert.title.substring(0, 50)}" site:fda.gov OR site:usda.gov OR site:epa.gov`,
    `${alert.title.substring(0, 30)} ${alert.source} regulatory`,
  ]

  for (const query of searchQueries) {
    try {
      // Use DuckDuckGo instant answer API (no key required)
      const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'RegIQ Alert Source Finder'
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        // Check for relevant results
        if (data.Results && data.Results.length > 0) {
          for (const result of data.Results) {
            if (result.FirstURL && isRelevantGovernmentSite(result.FirstURL, alert.source)) {
              return result.FirstURL
            }
          }
        }

        // Check abstract for URLs
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

  // Fallback: construct likely URLs based on source
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

  // Check if URL contains government domain
  const hasGovDomain = govDomains.some(domain => urlLower.includes(domain))
  
  // Check if URL domain matches the source
  const matchesSource = 
    (sourceLower.includes('fda') && urlLower.includes('fda.gov')) ||
    (sourceLower.includes('usda') && urlLower.includes('usda.gov')) ||
    (sourceLower.includes('epa') && urlLower.includes('epa.gov')) ||
    (sourceLower.includes('cdc') && urlLower.includes('cdc.gov'))

  return hasGovDomain && (matchesSource || govDomains.some(domain => urlLower.includes(domain)))
}

function constructLikelyUrl(alert: Alert): string | null {
  const source = alert.source.toLowerCase()
  
  // Map common sources to their likely base URLs
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