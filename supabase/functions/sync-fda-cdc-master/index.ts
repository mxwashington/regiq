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
      cdcAdvisories: { success: false, count: 0, error: null },
    };

    // Run all syncs in parallel
    const [fdaResult, usdaResult, cdcOutbreaksResult, cdcAdvisoriesResult] = await Promise.allSettled([
      syncFDARecalls(supabase),
      syncUSDARecalls(supabase),
      syncCDCOutbreakAlerts(supabase),
      syncCDCEmergencyAdvisories(supabase),
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

    if (cdcAdvisoriesResult.status === 'fulfilled') {
      results.cdcAdvisories = cdcAdvisoriesResult.value;
    } else {
      results.cdcAdvisories.error = cdcAdvisoriesResult.reason?.message || 'Unknown error';
    }

    const totalSynced = results.fda.count + results.usda.count + results.cdcOutbreaks.count + results.cdcAdvisories.count;

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

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const searchDate = thirtyDaysAgo.toISOString().split('T')[0].replace(/-/g, '');

  for (let page = 0; page < 10; page++) {
    const skip = page * 1000;
    const url = `https://api.fda.gov/food/enforcement.json?search=recall_initiation_date:[${searchDate}+TO+20991231]&sort=recall_initiation_date:desc&limit=1000&skip=${skip}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`FDA API error: ${response.status}`);
      
      const data = await response.json();
      if (!data.results) break;

      for (const item of data.results) {
        const recallNumber = item.recall_number;
        const description = item.product_description || item.reason_for_recall || '';

        const recallData = {
          recall_number: recallNumber,
          product_name: description.substring(0, 200),
          product_description: description,
          recall_date: item.recall_initiation_date,
          publish_date: item.recall_initiation_date,
          classification: mapClassification(item.classification),
          reason: item.reason_for_recall,
          company_name: item.recalling_firm,
          distribution_pattern: item.distribution_pattern,
          product_type: inferProductType(description),
          source: 'FDA',
          agency_source: 'FDA',
          severity: mapClassification(item.classification),
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
      }
    } catch (error) {
      console.error('FDA sync error:', error);
      throw error;
    }
  }

  return { success: true, count: newCount + updatedCount, error: null };
}

async function syncUSDARecalls(supabase: any) {
  let newCount = 0;
  let updatedCount = 0;

  const url = 'https://www.fsis.usda.gov/fsis-content/api/recalls';

  async function fetchWithRetry(maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url);
        if (response.ok) return await response.json();
      } catch (error) {
        if (attempt === maxRetries) throw error;
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  try {
    const data = await fetchWithRetry();
    if (!data) return { success: false, count: 0, error: 'No data returned' };

    for (const item of data) {
      const recallNumber = item.recallNumber || `USDA-${item.id}`;

      const recallData = {
        recall_number: recallNumber,
        product_name: item.productName || 'USDA Recall',
        product_description: item.productDescription || '',
        recall_date: item.recallDate,
        publish_date: item.publishDate || item.recallDate,
        classification: item.recallClass || 'Class I',
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
    }

    return { success: true, count: newCount + updatedCount, error: null };
  } catch (error) {
    console.error('USDA sync error:', error);
    return { success: false, count: 0, error: error.message };
  }
}

async function syncCDCOutbreakAlerts(supabase: any) {
  let newCount = 0;
  let updatedCount = 0;

  const url = 'https://data.cdc.gov/resource/5xkq-dg7x.json?$limit=10000&$order=year DESC';

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

      const outbreakData = {
        outbreak_title: `${pathogen} Outbreak in ${state} (${year})`,
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
    }

    return { success: true, count: newCount + updatedCount, error: null };
  } catch (error) {
    console.error('CDC Outbreaks sync error:', error);
    throw error;
  }
}

async function syncCDCEmergencyAdvisories(supabase: any) {
  let newCount = 0;
  let updatedCount = 0;

  const url = 'https://wwwnc.cdc.gov/travel/rss/notices.xml';

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`CDC RSS error: ${response.status}`);

    const rssText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rssText, 'text/xml');
    const items = xmlDoc.querySelectorAll('item');

    for (const item of items) {
      const title = item.querySelector('title')?.textContent || 'CDC Advisory';
      const link = item.querySelector('link')?.textContent || '';
      const description = item.querySelector('description')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent;

      if (!link) continue;

      const advisoryData = {
        title,
        description,
        urgency: inferUrgency(title),
        publish_date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        source_url: link,
        keywords: extractKeywords(title + ' ' + description),
      };

      const { data: existing } = await supabase
        .from('cdc_emergency_advisories')
        .select('id')
        .eq('source_url', link)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('cdc_emergency_advisories')
          .update(advisoryData)
          .eq('id', existing.id);
        updatedCount++;
      } else {
        await supabase.from('cdc_emergency_advisories').insert(advisoryData);
        newCount++;
      }
    }

    return { success: true, count: newCount + updatedCount, error: null };
  } catch (error) {
    console.error('CDC Advisories sync error:', error);
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
