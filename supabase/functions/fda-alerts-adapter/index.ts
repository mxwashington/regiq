import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FDAEnforcementRecord {
  recall_number: string;
  product_description: string;
  reason_for_recall: string;
  status: string;
  distribution_pattern: string;
  product_type: string;
  event_id: string;
  recalling_firm: string;
  city: string;
  state: string;
  country: string;
  voluntary_mandated: string;
  initial_firm_notification: string;
  classification: string;
  report_date: string;
  recall_initiation_date: string;
  more_code_info?: string;
  code_info?: string;
}

interface OpenFDAResponse {
  meta: {
    disclaimer: string;
    terms: string;
    license: string;
    last_updated: string;
    results: {
      skip: number;
      limit: number;
      total: number;
    };
  };
  results: FDAEnforcementRecord[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🏥 FDA Alerts Adapter - Starting fetch');

    // Get FDA API key (optional - falls back to public rate limit)
    const fdaApiKey = Deno.env.get('FDA_API_KEY');
    const apiKeyParam = fdaApiKey ? `&api_key=${fdaApiKey}` : '';

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const searchDate = thirtyDaysAgo.toISOString().split('T')[0].replace(/-/g, '');

    // Build openFDA API URL
    const baseUrl = 'https://api.fda.gov/food/enforcement.json';
    const searchParams = `search=report_date:[${searchDate}+TO+${new Date().toISOString().split('T')[0].replace(/-/g, '')}]`;
    const limit = '&limit=100';
    const url = `${baseUrl}?${searchParams}${limit}${apiKeyParam}`;

    console.log('📡 Fetching from openFDA API');
    console.log(`📅 Date range: ${searchDate} to present`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RegIQ/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ FDA API error:', response.status, errorText);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `FDA API returned ${response.status}`,
          message: errorText,
          processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const data: OpenFDAResponse = await response.json();
    console.log(`✅ FDA API returned ${data.results?.length || 0} results`);

    if (!data.results || data.results.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No new FDA alerts found',
          processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform FDA data to standard alert format
    const alerts = data.results.map((record) => {
      // Determine severity based on FDA classification
      const severity = record.classification === 'Class I' ? 'High' :
                      record.classification === 'Class II' ? 'Medium' : 'Low';

      return {
        external_id: record.recall_number || record.event_id,
        source: 'FDA',
        title: record.product_description?.substring(0, 200) || 'FDA Recall',
        summary: record.reason_for_recall || 'Recall information available',
        external_url: `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`,
        published_date: record.report_date || new Date().toISOString(),
        urgency: severity,
        agency: 'FDA',
        region: 'US',
        full_content: JSON.stringify({
          recall_number: record.recall_number,
          classification: record.classification,
          status: record.status,
          recalling_firm: record.recalling_firm,
          product_type: record.product_type,
          distribution_pattern: record.distribution_pattern,
          voluntary_mandated: record.voluntary_mandated,
          recall_initiation_date: record.recall_initiation_date,
          city: record.city,
          state: record.state,
        }),
      };
    });

    console.log(`📝 Transformed ${alerts.length} alerts`);

    // Insert alerts into database
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const alert of alerts) {
      const { data: existing } = await supabase
        .from('alerts')
        .select('id')
        .eq('source', 'FDA')
        .eq('external_id', alert.external_id)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { error } = await supabase
        .from('alerts')
        .insert(alert);

      if (error) {
        console.error('❌ Insert error:', error.message);
        skipped++;
      } else {
        inserted++;
      }
    }

    console.log(`✅ FDA sync complete: ${inserted} inserted, ${skipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: alerts.length,
        inserted,
        updated,
        skipped,
        message: `Successfully processed ${alerts.length} FDA alerts`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        processed: 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
