import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DataSourceConfig {
  id: string;
  name: string;
  source_type: 'api' | 'rss' | 'email' | 'webhook' | 'scraper';
  configuration: any;
  auth_config?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      throw new Error('Invalid user');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await listDataSources(supabase, user.id);
      case 'create':
        const createData = await req.json();
        return await createDataSource(supabase, user.id, createData);
      case 'update':
        const updateData = await req.json();
        const updateId = url.searchParams.get('id');
        return await updateDataSource(supabase, user.id, updateId, updateData);
      case 'delete':
        const deleteId = url.searchParams.get('id');
        return await deleteDataSource(supabase, user.id, deleteId);
      case 'sync':
        const syncId = url.searchParams.get('id');
        return await syncDataSource(supabase, user.id, syncId);
      case 'test':
        const testData = await req.json();
        return await testDataSource(testData);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Error in custom-data-sources function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function listDataSources(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('custom_data_sources')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return new Response(
    JSON.stringify({ data_sources: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createDataSource(supabase: any, userId: string, data: any) {
  const { name, description, source_type, configuration, auth_config } = data;

  // Validate configuration based on source type
  const validatedConfig = await validateSourceConfig(source_type, configuration);

  const { data: newSource, error } = await supabase
    .from('custom_data_sources')
    .insert({
      user_id: userId,
      name,
      description,
      source_type,
      configuration: validatedConfig,
      auth_config,
      status: 'active'
    })
    .select()
    .single();

  if (error) throw error;

  // Start initial sync
  if (newSource) {
    await scheduleSync(supabase, newSource.id);
  }

  return new Response(
    JSON.stringify({ data_source: newSource, message: 'Data source created successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateDataSource(supabase: any, userId: string, id: string, data: any) {
  if (!id) throw new Error('Data source ID required');

  const { data: updated, error } = await supabase
    .from('custom_data_sources')
    .update(data)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ data_source: updated, message: 'Data source updated successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteDataSource(supabase: any, userId: string, id: string) {
  if (!id) throw new Error('Data source ID required');

  const { error } = await supabase
    .from('custom_data_sources')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ message: 'Data source deleted successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function syncDataSource(supabase: any, userId: string, id: string) {
  if (!id) throw new Error('Data source ID required');

  // Get data source configuration
  const { data: source, error: sourceError } = await supabase
    .from('custom_data_sources')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (sourceError) throw sourceError;

  if (!source || !source.is_active) {
    throw new Error('Data source not found or inactive');
  }

  // Start ingestion log
  const { data: ingestionLog, error: logError } = await supabase
    .from('custom_data_ingestion_logs')
    .insert({
      data_source_id: id,
      status: 'running'
    })
    .select()
    .single();

  if (logError) throw logError;

  let processedRecords = 0;
  let importedRecords = 0;
  let skippedRecords = 0;
  let errorsCount = 0;

  try {
    const startTime = Date.now();

    // Process based on source type
    const results = await processDataSource(source);
    processedRecords = results.processed || 0;
    importedRecords = results.imported || 0;
    skippedRecords = results.skipped || 0;
    errorsCount = results.errors || 0;

    const processingTime = Date.now() - startTime;

    // Update ingestion log
    await supabase
      .from('custom_data_ingestion_logs')
      .update({
        status: errorsCount > 0 ? 'partial' : 'completed',
        records_processed: processedRecords,
        records_imported: importedRecords,
        records_skipped: skippedRecords,
        errors_count: errorsCount,
        processing_time_ms: processingTime,
        completed_at: new Date().toISOString()
      })
      .eq('id', ingestionLog.id);

    // Update data source last synced
    await supabase
      .from('custom_data_sources')
      .update({
        last_synced_at: new Date().toISOString(),
        status: errorsCount > 0 ? 'error' : 'active'
      })
      .eq('id', id);

    return new Response(
      JSON.stringify({
        message: 'Sync completed',
        results: {
          processed: processedRecords,
          imported: importedRecords,
          skipped: skippedRecords,
          errors: errorsCount,
          processing_time_ms: processingTime
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Update ingestion log with error
    await supabase
      .from('custom_data_ingestion_logs')
      .update({
        status: 'failed',
        error_details: { error: error.message },
        completed_at: new Date().toISOString()
      })
      .eq('id', ingestionLog.id);

    throw error;
  }
}

async function testDataSource(config: DataSourceConfig) {
  try {
    const testResult = await processDataSource(config, true);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Data source connection test successful',
        sample_data: testResult.sample || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Data source connection test failed',
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function validateSourceConfig(sourceType: string, config: any) {
  switch (sourceType) {
    case 'api':
      if (!config.endpoint_url) throw new Error('API endpoint URL required');
      if (!config.method) config.method = 'GET';
      break;
    case 'rss':
      if (!config.feed_url) throw new Error('RSS feed URL required');
      break;
    case 'webhook':
      if (!config.webhook_url) throw new Error('Webhook URL required');
      break;
    case 'scraper':
      if (!config.target_url) throw new Error('Target URL required');
      if (!config.selectors) throw new Error('CSS selectors required');
      break;
  }
  return config;
}

async function processDataSource(source: any, testMode = false) {
  const { source_type, configuration, auth_config } = source;

  switch (source_type) {
    case 'api':
      return await processApiSource(configuration, auth_config, testMode);
    case 'rss':
      return await processRssSource(configuration, testMode);
    case 'webhook':
      return await processWebhookSource(configuration, testMode);
    case 'scraper':
      return await processScraperSource(configuration, testMode);
    default:
      throw new Error(`Unsupported source type: ${source_type}`);
  }
}

async function processApiSource(config: any, authConfig: any, testMode: boolean) {
  const headers: any = { 'Content-Type': 'application/json' };
  
  // Add authentication headers
  if (authConfig?.api_key) {
    headers['Authorization'] = `Bearer ${authConfig.api_key}`;
  }
  if (authConfig?.custom_headers) {
    Object.assign(headers, authConfig.custom_headers);
  }

  const response = await fetch(config.endpoint_url, {
    method: config.method || 'GET',
    headers,
    body: config.method !== 'GET' ? JSON.stringify(config.body || {}) : undefined
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (testMode) {
    return { sample: Array.isArray(data) ? data.slice(0, 3) : data };
  }

  // Process and import data (simplified for demo)
  const processed = Array.isArray(data) ? data.length : 1;
  return { processed, imported: processed, skipped: 0, errors: 0 };
}

async function processRssSource(config: any, testMode: boolean) {
  // Simple RSS parsing (in production, use a proper RSS parser)
  const response = await fetch(config.feed_url);
  const rssText = await response.text();
  
  if (testMode) {
    return { sample: { rss_preview: rssText.substring(0, 500) + '...' } };
  }

  // Count items (simplified)
  const itemCount = (rssText.match(/<item>/g) || []).length;
  return { processed: itemCount, imported: itemCount, skipped: 0, errors: 0 };
}

async function processWebhookSource(config: any, testMode: boolean) {
  if (testMode) {
    return { sample: { webhook_url: config.webhook_url, status: 'configured' } };
  }
  
  // Webhook sources don't actively sync, they receive data
  return { processed: 0, imported: 0, skipped: 0, errors: 0 };
}

async function processScraperSource(config: any, testMode: boolean) {
  // Simple scraping (in production, use a proper HTML parser)
  const response = await fetch(config.target_url);
  const html = await response.text();
  
  if (testMode) {
    return { sample: { html_preview: html.substring(0, 500) + '...' } };
  }

  // Count scraped elements (simplified)
  const elements = Object.keys(config.selectors || {}).length;
  return { processed: elements, imported: elements, skipped: 0, errors: 0 };
}

async function scheduleSync(supabase: any, sourceId: string) {
  // In a real implementation, this would schedule a background job
  console.log(`Sync scheduled for data source: ${sourceId}`);
}