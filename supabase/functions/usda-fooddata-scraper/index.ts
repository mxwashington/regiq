import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FoodDataItem {
  fdcId: number;
  description: string;
  brandOwner?: string;
  ingredients?: string;
  dataType: string;
  publishedDate: string;
  modifiedDate: string;
  foodNutrients?: Array<{
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
}

interface SearchResponse {
  totalHits: number;
  foods: FoodDataItem[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('FOODDATA_API_KEY');
    if (!apiKey) {
      throw new Error('FOODDATA_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔍 Starting USDA FoodData Central scraper...');

    // Start sync log
    const { data: logData } = await supabase.rpc('start_sync_log', {
      p_source: 'USDA-FDC',
      p_metadata: { trigger: 'manual', timestamp: new Date().toISOString() }
    });
    const logId = logData as string;

    // Fetch recent recall keywords from alerts
    const { data: recentAlerts } = await supabase
      .from('alerts')
      .select('title, summary')
      .in('source', ['FDA', 'FSIS', 'USDA'])
      .gte('published_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(20);

    // Extract food-related keywords from recalls
    const keywords = extractFoodKeywords(recentAlerts || []);
    console.log(`🔑 Extracted keywords: ${keywords.slice(0, 5).join(', ')}...`);

    let totalProcessed = 0;
    let totalSaved = 0;
    const results: Record<string, number> = {};

    // Search for each keyword (respecting rate limit)
    for (const keyword of keywords.slice(0, 10)) { // Limit to 10 searches per run
      try {
        const searchUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(keyword)}&dataType=Branded&pageSize=25&api_key=${apiKey}`;
        
        const response = await fetch(searchUrl);
        
        if (!response.ok) {
          console.error(`❌ Search failed for "${keyword}": ${response.status}`);
          continue;
        }

        const data: SearchResponse = await response.json();
        console.log(`📊 Found ${data.totalHits} results for "${keyword}"`);

        for (const food of data.foods) {
          totalProcessed++;

          // Check if this fdcId already exists
          const { data: existing } = await supabase
            .from('alerts')
            .select('id')
            .eq('source', 'USDA-FDC')
            .contains('full_content', `"fdcId":${food.fdcId}`)
            .single();

          if (existing) {
            console.log(`⏭️  Skipping existing food: ${food.description}`);
            continue;
          }

          // Check for existing alert using fdcId to avoid duplicates
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          const { data: existingAlert } = await supabase
            .from('alerts')
            .select('id')
            .eq('source', 'USDA-FDC')
            .eq('external_url', `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${food.fdcId}`)
            .gte('published_date', thirtyDaysAgo.toISOString())
            .maybeSingle();

          if (!existingAlert) {
            // Prepare alert data
            const alertData = {
              title: `${food.description} - ${food.brandOwner || 'Unknown Brand'}`,
              summary: buildFoodSummary(food),
              source: 'USDA-FDC',
              agency: 'USDA',
              urgency: 'Low',
              urgency_score: 3,
              published_date: food.modifiedDate || food.publishedDate || new Date().toISOString(),
              external_url: `https://fdc.nal.usda.gov/fdc-app.html#/food-details/${food.fdcId}`,
              full_content: JSON.stringify({
                foodData: food
              }),
            };

            const { error: insertError } = await supabase
              .from('alerts')
              .insert(alertData);

            if (insertError) {
              console.error(`❌ Failed to insert ${food.description}:`, insertError);
            } else {
              totalSaved++;
              console.log(`✅ Saved: ${food.description}`);
            }
          } else {
            totalSkipped++;
          }
        }

        results[keyword] = data.foods.length;

        // Rate limit handling: wait 3.6 seconds between requests (1000/hour = ~1 per 3.6s)
        await new Promise(resolve => setTimeout(resolve, 3600));

      } catch (error) {
        console.error(`❌ Error processing keyword "${keyword}":`, error);
      }
    }

    console.log(`✅ USDA FoodData scraper completed: ${totalSaved}/${totalProcessed} saved`);

    // Finish sync log with success
    await supabase.rpc('finish_sync_log', {
      p_log_id: logId,
      p_status: 'success',
      p_alerts_fetched: totalProcessed,
      p_alerts_inserted: totalSaved,
      p_alerts_skipped: totalProcessed - totalSaved,
      p_results: { keywords: keywords.slice(0, 10), results }
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed,
        totalSaved,
        keywordsSearched: keywords.slice(0, 10),
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ USDA FoodData scraper error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log failure to sync logs
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      await supabase.rpc('finish_sync_log', {
        p_log_id: (typeof logId !== 'undefined' ? logId : null),
        p_status: 'error',
        p_errors: [errorMessage]
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function extractFoodKeywords(alerts: any[]): string[] {
  const keywords = new Set<string>();
  
  // Common food-related terms to extract
  const foodTerms = [
    'chicken', 'beef', 'pork', 'turkey', 'salmon', 'tuna',
    'egg', 'milk', 'cheese', 'yogurt', 'ice cream',
    'salad', 'lettuce', 'spinach', 'cucumber', 'tomato',
    'bread', 'cookie', 'cake', 'chocolate',
    'salsa', 'hummus', 'peanut butter',
  ];

  for (const alert of alerts) {
    const text = `${alert.title} ${alert.summary}`.toLowerCase();
    
    for (const term of foodTerms) {
      if (text.includes(term)) {
        keywords.add(term);
      }
    }
    
    // Extract brand names (words in quotes or capitalized)
    const brandMatches = text.match(/["']([^"']+)["']|([A-Z][a-z]+\s[A-Z][a-z]+)/g);
    if (brandMatches) {
      brandMatches.forEach(brand => keywords.add(brand.replace(/['"]/g, '').toLowerCase()));
    }
  }

  return Array.from(keywords);
}

function buildFoodSummary(food: FoodDataItem): string {
  const parts: string[] = [];
  
  if (food.brandOwner) {
    parts.push(`Brand: ${food.brandOwner}`);
  }
  
  if (food.ingredients) {
    parts.push(`Ingredients: ${food.ingredients.substring(0, 200)}${food.ingredients.length > 200 ? '...' : ''}`);
  }
  
  if (food.foodNutrients && food.foodNutrients.length > 0) {
    const nutrients = food.foodNutrients
      .slice(0, 5)
      .map(n => `${n.nutrientName}: ${n.value}${n.unitName}`)
      .join(', ');
    parts.push(`Key nutrients: ${nutrients}`);
  }
  
  return parts.join(' | ') || 'Food product data from USDA FoodData Central';
}
