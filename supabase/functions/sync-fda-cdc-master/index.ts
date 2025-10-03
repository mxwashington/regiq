import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: syncLog } = await supabase
    .from('sync_logs')
    .insert({ job_name: 'syncAllSourcesFDA_CDC', status: 'running' })
    .select()
    .single();

  try {
    const results = {
      fda: { success: false, count: 0, error: null },
      usda: { success: false, count: 0, error: null },
      cdcOutbreaks: { success: false, count: 0, error: null },
    };

    // Run all syncs in parallel
    const [fdaResult, usdaResult, cdcOutbreaksResult] = await Promise.allSettled([
      syncFDARecalls(supabase),
      syncUSDARecalls(supabase),
      syncCDCOutbreakAlerts(supabase),
    ]);

    if (fdaResult.status === 'fulfilled') {
      results.fda = fdaResult.value;
    } else {
      results.fda.error = fdaResult.reason?.message || 'Unknown error';
    }

    if (usdaResult.status === 'fulfilled') {
      results.usda = usdaResult.value;
    } else {
      results.usda.error = usdaResult.reason?.message || 'Unknown error';
    }

    if (cdcOutbreaksResult.status === 'fulfilled') {
      results.cdcOutbreaks = cdcOutbreaksResult.value;
    } else {
      results.cdcOutbreaks.error = cdcOutbreaksResult.reason?.message || 'Unknown error';
    }

    const totalSynced = results.fda.count + results.usda.count + results.cdcOutbreaks.count;

    await supabase
      .from('sync_logs')
      .update({
        status: 'success',
        records_synced: totalSynced,
      })
      .eq('id', syncLog.id);

    return new Response(
      JSON.stringify({
        message: `Successfully synced ${totalSynced} total records`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    await supabase
      .from('sync_logs')
      .update({ status: 'failed', error_message: error.message })
      .eq('id', syncLog.id);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function syncFDARecalls(supabase: any) {
  let newCount = 0;
  let updatedCount = 0;

  // Calculate date range for last 365 days
  const oneYearAgo = new Date();
  oneYearAgo.setDate(oneYearAgo.getDate() - 365);
  const startDate = oneYearAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  const endDate = new Date().toISOString().split('T')[0];

  console.log(`FDA sync: Fetching recalls from ${startDate} to ${endDate}`);

  // FDA API limit is 1000 per request, so we fetch 3 pages (3000 records max)
  for (let page = 0; page < 3; page++) {
    const skip = page * 1000;
    // Use proper date format: YYYY-MM-DD (no transformation needed)
    const url = `https://api.fda.gov/food/enforcement.json?search=recall_initiation_date:[${startDate}+TO+${endDate}]&sort=recall_initiation_date:desc&limit=1000&skip=${skip}`;

    try {
      console.log(`FDA page ${page + 1}/3: Fetching from skip=${skip}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`FDA API error on page ${page + 1}:`, {
          status: response.status,
          statusText: response.statusText,
          url: url,
          error: errorText
        });
        
        // If first page fails, abort completely
        if (page === 0) {
          throw new Error(`FDA API failed on first page: ${response.status}`);
        }
        
        // If subsequent pages fail, log and continue with what we have
        console.warn(`Skipping page ${page + 1} due to error, continuing with ${newCount + updatedCount} records so far`);
        break;
      }
      
      const data = await response.json();
      
      if (!data.results || data.results.length === 0) {
        console.log(`FDA page ${page + 1}: No results, stopping pagination`);
        break;
      }
      
      console.log(`FDA page ${page + 1}: Processing ${data.results.length} recalls`);

      for (const item of data.results) {
        const recallNumber = item.recall_number;
        
        if (!recallNumber) {
          console.warn('Skipping recall without recall_number');
          continue;
        }
        
        const description = item.product_description || item.reason_for_recall || 'FDA Food Recall';
        const classification = mapClassification(item.classification);

        // Insert/update in recalls table
        const recallData = {
          recall_number: recallNumber,
          product_name: description.substring(0, 200),
          product_description: description,
          recall_date: item.recall_initiation_date,
          publish_date: item.report_date || item.recall_initiation_date,
          classification,
          reason: item.reason_for_recall || '',
          company_name: item.recalling_firm || 'Unknown',
          distribution_pattern: item.distribution_pattern || '',
          product_type: inferProductType(description),
          source: 'FDA',
          agency_source: 'FDA',
          severity: classification,
        };

        const { data: existing } = await supabase
          .from('recalls')
          .select('id')
          .eq('recall_number', recallNumber)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('recalls')
            .update(recallData)
            .eq('recall_number', recallNumber);
          updatedCount++;
        } else {
          await supabase.from('recalls').insert(recallData);
          newCount++;
        }

        // Also insert into alerts table for dashboard display
        const alertData = {
          external_id: recallNumber,
          source: 'FDA',
          agency: 'FDA',
          title: description.substring(0, 200),
          summary: item.reason_for_recall || description.substring(0, 500),
          urgency: classification === 'Class I' ? 'High' : classification === 'Class II' ? 'Medium' : 'Low',
          urgency_score: classification === 'Class I' ? 9 : classification === 'Class II' ? 5 : 3,
          published_date: item.recall_initiation_date,
          external_url: `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`,
          full_content: JSON.stringify(item),
        };

        const { data: existingAlert } = await supabase
          .from('alerts')
          .select('id')
          .eq('external_id', recallNumber)
          .eq('source', 'FDA')
          .maybeSingle();

        if (!existingAlert) {
          await supabase.from('alerts').insert(alertData);
        }
      }
    } catch (error) {
      console.error(`FDA sync error on page ${page + 1}:`, error);
      
      // If first page fails completely, throw error
      if (page === 0) {
        throw error;
      }
      
      // Otherwise continue with partial results
      console.warn(`Continuing with ${newCount + updatedCount} records despite page ${page + 1} error`);
      break;
    }
  }

  console.log(`FDA sync complete: ${newCount} new, ${updatedCount} updated (total: ${newCount + updatedCount})`);
  return { success: true, count: newCount + updatedCount, error: null };
}

async function syncUSDARecalls(supabase: any) {
  let newCount = 0;
  let updatedCount = 0;

  const url = 'https://www.fsis.usda.gov/fsis-content/api/recalls';

  async function fetchWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`USDA sync attempt ${attempt}/${maxRetries}`);
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'RegIQ/1.0',
            'Accept': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          console.log(`USDA API returned ${data?.length || 0} recalls`);
          return data;
        }
        console.warn(`USDA API returned status ${response.status}`);
      } catch (error) {
        console.error(`USDA sync attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) throw error;
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  try {
    const data = await fetchWithRetry();
    if (!data || !Array.isArray(data)) {
      console.error('USDA API returned invalid data');
      return { success: false, count: 0, error: 'No valid data returned' };
    }
    
    console.log(`USDA sync: processing ${data.length} recalls`);

    for (const item of data) {
      const recallNumber = item.recallNumber || `USDA-${item.id}`;
      const classification = item.recallClass || 'Class I';

      const recallData = {
        recall_number: recallNumber,
        product_name: item.productName || 'USDA Recall',
        product_description: item.productDescription || '',
        recall_date: item.recallDate,
        publish_date: item.publishDate || item.recallDate,
        classification,
        reason: item.reason || '',
        company_name: item.companyName || 'Unknown',
        distribution_pattern: item.distribution || '',
        product_type: 'meat',
        source: 'USDA',
        agency_source: 'USDA',
      };

      const { data: existing } = await supabase
        .from('recalls')
        .select('id')
        .eq('recall_number', recallNumber)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('recalls')
          .update(recallData)
          .eq('recall_number', recallNumber);
        updatedCount++;
      } else {
        await supabase.from('recalls').insert(recallData);
        newCount++;
      }

      // Also insert into alerts table for dashboard display
      const alertData = {
        external_id: recallNumber,
        source: 'USDA',
        agency: 'USDA',
        title: item.productName || 'USDA Recall',
        summary: item.productDescription || item.reason || 'USDA meat recall',
        urgency: classification === 'Class I' ? 'High' : 'Medium',
        published_date: item.publishDate || item.recallDate,
        external_url: `https://www.fsis.usda.gov/recalls`,
        full_content: JSON.stringify(item),
      };

      const { data: existingAlert } = await supabase
        .from('alerts')
        .select('id')
        .eq('external_id', recallNumber)
        .eq('source', 'USDA')
        .maybeSingle();

      if (!existingAlert) {
        await supabase.from('alerts').insert(alertData);
      }
    }

    console.log(`USDA sync complete: ${newCount} new, ${updatedCount} updated`);
    return { success: true, count: newCount + updatedCount, error: null };
  } catch (error) {
    console.error('USDA sync error:', error);
    // Return partial success instead of failure
    return { success: newCount + updatedCount > 0, count: newCount + updatedCount, error: error.message };
  }
}

async function syncCDCOutbreakAlerts(supabase: any) {
  let newCount = 0;
  let updatedCount = 0;

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const yearParam = oneYearAgo.getFullYear();
  
  const url = `https://data.cdc.gov/resource/5xkq-dg7x.json?$where=year>=${yearParam}&$limit=10000&$order=year DESC`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`CDC API error: ${response.status}`);

    const data = await response.json();
    const uniqueOutbreaks = new Map();

    data.forEach((item: any) => {
      const key = `${item.year}-${item.state}-${item.pathogen}`;
      if (!uniqueOutbreaks.has(key)) {
        uniqueOutbreaks.set(key, item);
      }
    });

    for (const item of uniqueOutbreaks.values()) {
      const pathogen = item.pathogen || 'Unknown Pathogen';
      const state = item.state || 'Unknown';
      const year = item.year || new Date().getFullYear();
      const food = item.food || 'Unknown';
      const title = `${pathogen} Outbreak in ${state} (${year})`;

      const outbreakData = {
        outbreak_title: title,
        pathogen_type: pathogen,
        investigation_status: 'Historical',
        implicated_foods: [food].filter(Boolean),
        publish_date: `${year}-01-01`,
        source_url: 'https://www.cdc.gov/foodsafety/outbreaks/',
        keywords: [pathogen, state, food].filter(Boolean),
      };

      const { data: existing } = await supabase
        .from('cdc_outbreak_alerts')
        .select('id')
        .eq('outbreak_title', outbreakData.outbreak_title)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('cdc_outbreak_alerts')
          .update(outbreakData)
          .eq('id', existing.id);
        updatedCount++;
      } else {
        await supabase.from('cdc_outbreak_alerts').insert(outbreakData);
        newCount++;
      }

      // Also insert into alerts table for dashboard display
      const alertData = {
        external_id: `CDC-OUTBREAK-${year}-${state}-${pathogen}`.replace(/\s+/g, '-'),
        source: 'CDC',
        agency: 'CDC',
        title,
        summary: `${pathogen} outbreak linked to ${food} in ${state}`,
        urgency: 'High',
        published_date: `${year}-01-01`,
        external_url: 'https://www.cdc.gov/foodsafety/outbreaks/',
        full_content: JSON.stringify(item),
      };

      const { data: existingAlert } = await supabase
        .from('alerts')
        .select('id')
        .eq('external_id', alertData.external_id)
        .eq('source', 'CDC')
        .maybeSingle();

      if (!existingAlert) {
        await supabase.from('alerts').insert(alertData);
      }
    }

    return { success: true, count: newCount + updatedCount, error: null };
  } catch (error) {
    console.error('CDC Outbreaks sync error:', error);
    throw error;
  }
}


function mapClassification(fdaClass: string): string {
  if (!fdaClass) return 'Class I';
  if (fdaClass.toLowerCase().includes('iii')) return 'Class III';
  if (fdaClass.toLowerCase().includes('ii')) return 'Class II';
  if (fdaClass.toLowerCase().includes('i')) return 'Class I';
  return 'Class I';
}

function inferProductType(description: string): string {
  const lowerDesc = description.toLowerCase();
  if (lowerDesc.match(/\b(beef|pork|chicken|meat|turkey)\b/)) return 'meat';
  if (lowerDesc.match(/\b(milk|cheese|yogurt|dairy)\b/)) return 'dairy';
  if (lowerDesc.match(/\b(lettuce|spinach|produce|vegetable|fruit)\b/)) return 'produce';
  if (lowerDesc.match(/\b(seafood|fish|shellfish)\b/)) return 'seafood';
  return 'other';
}

function inferUrgency(title: string): string {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.match(/\b(critical|urgent|emergency|severe)\b/)) return 'High';
  if (lowerTitle.match(/\b(moderate|watch|warning)\b/)) return 'Medium';
  return 'Low';
}

function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();
  const words = text.toLowerCase().split(/\s+/);
  
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
  
  words.forEach(word => {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (cleaned.length > 3 && !stopWords.includes(cleaned)) {
      keywords.add(cleaned);
    }
  });

  return Array.from(keywords).slice(0, 10);
}
