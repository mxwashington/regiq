import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DataSource {
  id: string;
  name: string;
  agency: string;
  source_type: string;
  url: string;
  is_active: boolean;
  last_fetched_at: string;
  fetch_interval: number;
  metadata: any;
}

interface Alert {
  title: string;
  summary: string;
  urgency: string;
  source: string;
  published_date: string;
  external_url?: string;
  full_content?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get all active data sources that need updating
    const { data: sources, error: sourcesError } = await supabaseClient
      .from('data_sources')
      .select('*')
      .eq('is_active', true)
      .or(`last_fetched_at.is.null,last_fetched_at.lt.${new Date(Date.now() - 3600000).toISOString()}`) // 1 hour ago

    if (sourcesError) {
      throw sourcesError
    }

    const alerts: Alert[] = []
    
    for (const source of sources as DataSource[]) {
      console.log(`Processing source: ${source.name}`)
      
      try {
        let sourceAlerts: Alert[] = []
        
        if (source.source_type === 'api') {
          sourceAlerts = await fetchApiData(source)
        } else if (source.source_type === 'rss') {
          sourceAlerts = await fetchRssData(source)
        }
        
        alerts.push(...sourceAlerts)
        
        // Update last_fetched_at
        await supabaseClient
          .from('data_sources')
          .update({ last_fetched_at: new Date().toISOString() })
          .eq('id', source.id)
          
      } catch (error) {
        console.error(`Error processing source ${source.name}:`, error)
        continue
      }
    }

    // Insert new alerts into database
    if (alerts.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('alerts')
        .upsert(alerts, { onConflict: 'title,source,published_date' })

      if (insertError) {
        console.error('Error inserting alerts:', insertError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed_sources: sources.length,
        new_alerts: alerts.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in regulatory-feeds-scraper:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function fetchApiData(source: DataSource): Promise<Alert[]> {
  const alerts: Alert[] = []
  
  try {
    // Handle FDA API endpoints
    if (source.url.includes('api.fda.gov')) {
      const response = await fetch(`${source.url}?limit=50`)
      const data = await response.json()
      
      if (data.results) {
        for (const result of data.results) {
          alerts.push({
            title: result.product_description || result.reason_for_recall || 'FDA Alert',
            summary: `${result.product_description || ''} - ${result.reason_for_recall || ''}`.substring(0, 500),
            urgency: result.classification === 'Class I' ? 'high' : 
                    result.classification === 'Class II' ? 'medium' : 'low',
            source: source.agency,
            published_date: result.report_date || result.recall_initiation_date || new Date().toISOString(),
            external_url: `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`,
            full_content: JSON.stringify(result)
          })
        }
      }
    }
  } catch (error) {
    console.error(`Error fetching API data from ${source.url}:`, error)
  }
  
  return alerts
}

async function fetchRssData(source: DataSource): Promise<Alert[]> {
  const alerts: Alert[] = []
  
  try {
    const response = await fetch(source.url)
    const rssText = await response.text()
    
    // Basic RSS parsing - extract title, description, and pubDate
    const items = rssText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || []
    
    for (const item of items.slice(0, 20)) { // Limit to 20 items per feed
      const title = item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim()
      const description = item.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim()
      const pubDate = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim()
      const link = item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim()
      
      if (title) {
        // Determine urgency based on keywords
        const urgencyKeywords = {
          high: ['recall', 'contamination', 'outbreak', 'emergency', 'class i', 'death', 'serious'],
          medium: ['warning', 'alert', 'class ii', 'injury', 'adverse'],
          low: ['notice', 'update', 'guidance', 'class iii']
        }
        
        let urgency = 'low'
        const titleLower = title.toLowerCase()
        const descLower = (description || '').toLowerCase()
        
        if (urgencyKeywords.high.some(keyword => titleLower.includes(keyword) || descLower.includes(keyword))) {
          urgency = 'high'
        } else if (urgencyKeywords.medium.some(keyword => titleLower.includes(keyword) || descLower.includes(keyword))) {
          urgency = 'medium'
        }
        
        alerts.push({
          title: title.substring(0, 200),
          summary: (description || title).substring(0, 500),
          urgency,
          source: source.agency,
          published_date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          external_url: link || source.url,
          full_content: item
        })
      }
    }
  } catch (error) {
    console.error(`Error fetching RSS data from ${source.url}:`, error)
  }
  
  return alerts
}