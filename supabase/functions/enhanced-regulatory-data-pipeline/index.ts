import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface DataSource {
  id: string;
  name: string;
  agency: string;
  region: string;
  source_type: string;
  url?: string;
  base_url?: string;
  rss_feeds?: any[];
  data_gov_org?: string;
  is_active: boolean;
  last_fetched_at?: string;
  last_successful_fetch?: string;
  fetch_interval?: number;
  polling_interval_minutes?: number;
  priority?: number;
  keywords?: any[];
  metadata?: any;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

interface ProcessedAlert {
  title: string;
  source: string;
  urgency: string;
  summary: string;
  published_date: string;
  external_url?: string;
  full_content?: string;
  region: string;
  agency: string;
}

function logStep(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

async function fetchDataSources(supabase: any): Promise<DataSource[]> {
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) {
    logStep('Error fetching data sources:', error);
    return [];
  }

  return data || [];
}

async function shouldProcessSource(supabase: any, source: DataSource): Promise<boolean> {
  const { data } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', `last_run_${source.id}`)
    .maybeSingle();

  const now = Date.now();
  const lastRunTime = data?.setting_value?.timestamp || 0;
  const intervalMs = source.polling_interval_minutes * 60 * 1000;

  return (now - lastRunTime) >= intervalMs;
}

async function fetchRSSFeed(url: string, source: DataSource): Promise<any[]> {
  try {
    logStep(`Fetching RSS feed: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'RegIQ-Global-Pipeline/2.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml'
      }
    });

    if (!response.ok) {
      logStep(`Failed to fetch RSS: ${response.status} - ${response.statusText}`);
      return [];
    }

    const xmlText = await response.text();
    return parseRSSFeed(xmlText, source);
  } catch (error) {
    logStep(`Error fetching RSS feed ${url}:`, error);
    return [];
  }
}

function parseRSSFeed(xmlText: string, source: DataSource): any[] {
  const items: any[] = [];
  
  try {
    // Enhanced RSS/Atom parsing with better regex patterns
    const itemPattern = /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi;
    const titlePattern = /<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i;
    const linkPattern = /<link[^>]*(?:href="([^"]*)"[^>]*>|>([\s\S]*?)<\/link>)/i;
    const descPattern = /<(?:description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary|content)>/i;
    const pubDatePattern = /<(?:pubDate|published|updated)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/i;
    const guidPattern = /<(?:guid|id)[^>]*>([\s\S]*?)<\/(?:guid|id)>/i;
    
    let match;
    while ((match = itemPattern.exec(xmlText)) !== null) {
      const itemXml = match[1];
      
      const titleMatch = titlePattern.exec(itemXml);
      const linkMatch = linkPattern.exec(itemXml);
      const descMatch = descPattern.exec(itemXml);
      const pubDateMatch = pubDatePattern.exec(itemXml);
      const guidMatch = guidPattern.exec(itemXml);
      
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      const link = linkMatch ? (linkMatch[1] || linkMatch[2] || '').trim() : '';
      const description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : '';
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
      const guid = guidMatch ? guidMatch[1].trim() : '';
      
      // Relaxed filtering - only require title (most regulatory content has titles)
      if (title && title.trim().length > 10) {
        items.push({
          title,
          link: link || guid || `#${Date.now()}`, // Generate fallback link if missing
          description: description || title, // Use title as fallback description
          pubDate,
          source: source.name, // Use full source name for consistency
          region: source.region
        });
      }
    }
    
    logStep(`Parsed ${items.length} items from ${source.agency} RSS feed`);
  } catch (error) {
    logStep(`Error parsing RSS feed for ${source.agency}:`, error);
  }
  
  return items;
}

function detectSignalType(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase();
  
  if (text.includes('recall') || text.includes('withdrawn')) return 'Recall';
  if (text.includes('warning letter') || text.includes('warning to')) return 'Warning Letter';
  if (text.includes('guidance') || text.includes('draft guidance') || text.includes('final guidance')) return 'Guidance';
  if (text.includes('rule') || text.includes('regulation') || text.includes('cfr') || text.includes('federal register')) return 'Rule Change';
  if (text.includes('alert') || text.includes('safety communication') || text.includes('advisory')) return 'Market Signal';
  
  return 'Market Signal'; // default
}

function calculateUrgency(item: any, source: DataSource): string {
  let urgencyScore = 0;
  
  // Base urgency from source priority
  urgencyScore += source.priority || 5;
  
  // Check for urgent keywords in title and description
  const text = (item.title + ' ' + (item.description || '')).toLowerCase();
  const urgentKeywords = ['recall', 'outbreak', 'warning', 'alert', 'urgent', 'immediate', 'critical', 'emergency'];
  const foundUrgentKeywords = urgentKeywords.filter(keyword => text.includes(keyword));
  
  urgencyScore += foundUrgentKeywords.length * 2;
  
  // GSA-specific keywords for enhanced urgency
  if (source.agency === 'GSA') {
    const gsaCriticalKeywords = ['far amendment', 'procurement regulation', 'contracting rule change', 'acquisition policy'];
    const gsaHighKeywords = ['federal acquisition', 'procurement policy', 'contracting guidance', 'acquisition regulation'];
    const gsaMediumKeywords = ['schedule update', 'gsa policy', 'administrative guidance'];
    
    gsaCriticalKeywords.forEach(keyword => {
      if (text.includes(keyword)) urgencyScore += 6;
    });
    gsaHighKeywords.forEach(keyword => {
      if (text.includes(keyword)) urgencyScore += 4;
    });
    gsaMediumKeywords.forEach(keyword => {
      if (text.includes(keyword)) urgencyScore += 2;
    });
  }
  
  // Check source-specific keywords
  if (source.keywords) {
    const foundSourceKeywords = source.keywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
    urgencyScore += foundSourceKeywords.length;
  }
  
  // Recency boost
  const publishedDate = new Date(item.pubDate || Date.now());
  const hoursOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
  
  if (hoursOld < 24) urgencyScore += 3;
  else if (hoursOld < 72) urgencyScore += 1;
  
  // Regional priority boost
  if (source.region === 'Global') urgencyScore += 2;
  if (source.region === 'US') urgencyScore += 1;
  
  // Determine urgency level
  if (urgencyScore >= 14) return 'High';
  if (urgencyScore >= 9) return 'Medium';
  return 'Low';
}

async function generateAISummary(title: string, description: string, openaiKey?: string): Promise<string> {
  if (!openaiKey) {
    return description ? description.substring(0, 300) + '...' : 'No summary available.';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert regulatory analyst. Summarize regulatory information in 1-2 sentences, focusing on key impacts, affected products/industries, and actionable insights for businesses. Be concise and professional.'
          },
          {
            role: 'user',
            content: `Summarize this regulatory update:\n\nTitle: ${title}\n\nDescription: ${description}`
          }
        ],
        max_tokens: 150,
        temperature: 0.3
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices[0]?.message?.content || description.substring(0, 300) + '...';
    }
  } catch (error) {
    logStep('Error generating AI summary:', error);
  }
  
  return description ? description.substring(0, 300) + '...' : 'No summary available.';
}

function processRSSItem(item: any, source: DataSource): ProcessedAlert {
  // Parse the RSS published date correctly
  let publishedDate: Date;
  if (item.pubDate) {
    publishedDate = new Date(item.pubDate);
    if (isNaN(publishedDate.getTime())) {
      publishedDate = new Date();
    }
  } else {
    publishedDate = new Date();
  }

  const signalType = detectSignalType(item.title || '', item.description || '');
  
  // Detect if CDC is republishing FDA recalls and correctly attribute them
  let actualAgency = source.agency;
  let actualSource = source.name; // Use full source name instead of agency
  
  if (source.agency === 'CDC') {
    const title = item.title || '';
    const description = item.description || '';
    const content = (title + ' ' + description).toLowerCase();
    
    // Check if this is an FDA-originated recall being republished by CDC
    if (content.includes('fda') || 
        content.includes('food and drug administration') ||
        (content.includes('recall') && (
          content.includes('food') || 
          content.includes('drug') || 
          content.includes('device') || 
          content.includes('allergy') ||
          content.includes('undeclared')
        ))) {
      actualAgency = 'FDA';
      // Keep using the original source name for consistency
      actualSource = source.name;
    }
  }
  
  // Handle GSA content - enhance urgency for key regulatory topics
  if (source.agency === 'GSA') {
    const title = item.title || '';
    const description = item.description || '';
    const content = (title + ' ' + description).toLowerCase();
    
    // Boost urgency for important regulatory or acquisition topics
    if (content.includes('far') || // Federal Acquisition Regulation
        content.includes('procurement') ||
        content.includes('solicitation') ||
        content.includes('regulation') ||
        content.includes('policy change') ||
        content.includes('contracting')) {
      // This will be handled in calculateUrgency function
    }
  }
  
  return {
    title: item.title || 'Untitled Regulatory Update',
    source: actualSource,
    urgency: calculateUrgency(item, source),
    summary: item.description || 'No description available.',
    published_date: publishedDate.toISOString(),
    external_url: item.link || '',
    full_content: JSON.stringify({ ...item, signal_type: signalType }),
    region: source.region,
    agency: actualAgency
  };
}

async function isDuplicate(supabase: any, alert: ProcessedAlert): Promise<boolean> {
  // Relaxed duplicate detection - use similarity instead of exact match
  const { data } = await supabase
    .from('alerts')
    .select('id, title')
    .eq('source', alert.source)
    .gte('published_date', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()) // Reduced to 3 days
    .limit(50);

  if (!data || data.length === 0) return false;

  // Check for very similar titles (80% similarity or exact substring match)
  const alertTitle = alert.title.toLowerCase().trim();
  for (const existing of data) {
    const existingTitle = existing.title.toLowerCase().trim();
    
    // Exact match
    if (alertTitle === existingTitle) return true;
    
    // Substring match for shorter titles
    if (alertTitle.length > 20 && (
      alertTitle.includes(existingTitle) || 
      existingTitle.includes(alertTitle)
    )) return true;
  }

  return false;
}

async function saveAlert(supabase: any, alert: ProcessedAlert, openaiKey?: string): Promise<boolean> {
  try {
    // Check for duplicates
    if (await isDuplicate(supabase, alert)) {
      logStep(`Duplicate alert skipped: ${alert.title}`);
      return false;
    }

    // Generate AI summary
    alert.summary = await generateAISummary(alert.title, alert.summary, openaiKey);

    // Save to database
    const { data: insertedAlert, error } = await supabase
      .from('alerts')
      .insert(alert)
      .select('id')
      .single();

    if (error) {
      logStep('Error saving alert:', error);
      return false;
    }

    logStep(`Saved new alert: ${alert.title}`);

    // Classify and tag the alert
    if (insertedAlert?.id) {
      await classifyAndTagAlert(supabase, insertedAlert.id, alert);
    }

    return true;
  } catch (error) {
    logStep('Error in saveAlert:', error);
    return false;
  }
}

async function classifyAndTagAlert(supabase: any, alertId: string, alert: ProcessedAlert): Promise<void> {
  try {
    logStep(`Starting classification for alert: ${alertId}`);
    
    const classificationPayload = {
      title: alert.title,
      content: alert.summary || alert.full_content || '',
      source: alert.source,
      alert_id: alertId,
      region: alert.region,
      agency: alert.agency
    };

    const { error: classificationError } = await supabase.functions.invoke(
      'ai-content-classifier',
      {
        body: classificationPayload
      }
    );

    if (classificationError) {
      logStep('Classification service error', classificationError);
    } else {
      logStep(`Successfully classified alert: ${alertId}`);
    }

  } catch (error) {
    logStep('Error in classifyAndTagAlert', error);
  }
}

async function fetchOpenFDAData(endpoint: string, source: DataSource): Promise<any[]> {
  try {
    logStep(`Fetching openFDA data from: ${endpoint}`);
    
    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // Format dates for FDA API (YYYYMMDD format)
    const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, '');
    const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
    
    // Build query parameters
    const searchParam = `report_date:[${startDateStr}+TO+${endDateStr}]`;
    const url = `${source.base_url}/${endpoint}?search=${encodeURIComponent(searchParam)}&limit=100`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'RegIQ-Pipeline/2.0 (regulatory.intelligence@regiq.com)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      logStep(`Failed to fetch openFDA data: ${response.status} - ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    logStep(`Error fetching openFDA data from ${endpoint}:`, error);
    return [];
  }
}

async function fetchFSISData(endpoint: string, source: DataSource): Promise<any[]> {
  try {
    logStep(`Fetching FSIS data from: ${endpoint}`);
    
    const url = `${source.base_url}/${endpoint}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'RegIQ-Pipeline/2.0 (regulatory.intelligence@regiq.com)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      logStep(`Failed to fetch FSIS data: ${response.status} - ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  } catch (error) {
    logStep(`Error fetching FSIS data from ${endpoint}:`, error);
    return [];
  }
}

async function fetchFDADataDashboard(endpoint: string, source: DataSource): Promise<any[]> {
  try {
    logStep(`Fetching FDA Data Dashboard from: ${endpoint}`);
    
    const ddapiKey = Deno.env.get('FDA_DDAPI_KEY');
    if (!ddapiKey) {
      logStep('FDA DDAPI key not found, skipping authenticated request');
      return [];
    }
    
    // Calculate date range (last 90 days for compliance data)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (90 * 24 * 60 * 60 * 1000));
    
    // Format dates for FDA DDAPI (ISO format)
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Build URL with authentication and filters
    let url = endpoint;
    
    // Add date filters if the endpoint supports them
    if (endpoint.includes('complianceactions')) {
      url += `?posted_date_from=${startDateStr}&posted_date_to=${endDateStr}&limit=50`;
    } else if (endpoint.includes('inspectionscitations')) {
      url += `?inspection_end_date_from=${startDateStr}&inspection_end_date_to=${endDateStr}&limit=50`;
    } else {
      url += `?limit=50`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ddapiKey}`,
        'User-Agent': 'RegIQ-Pipeline/2.0 (regulatory.intelligence@regiq.com)',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      logStep(`Failed to fetch FDA DDAPI data: ${response.status} - ${response.statusText}`);
      // Log response text for debugging
      const errorText = await response.text();
      logStep('FDA DDAPI Error Response:', errorText);
      return [];
    }

    const data = await response.json();
    
    // FDA DDAPI returns different structures, normalize to array
    if (data.results) {
      return data.results;
    } else if (Array.isArray(data)) {
      return data;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else {
      return [data];
    }
  } catch (error) {
    logStep(`Error fetching FDA Data Dashboard from ${endpoint}:`, error);
    return [];
  }
}

function processOpenFDAItem(item: any, source: DataSource, endpoint: string): ProcessedAlert {
  let title = '';
  let description = '';
  let publishedDate = new Date();
  let externalUrl = '';

  // Process different types of openFDA data
  if (endpoint.includes('enforcement')) {
    // Enforcement/Recall data
    title = `${item.product_description || 'Product'} Recall - ${item.classification || 'Class Unknown'}`;
    description = `${item.reason_for_recall || 'Recall reason not specified'}. Status: ${item.status || 'Unknown'}. Recall Number: ${item.recall_number || 'N/A'}`;
    publishedDate = new Date(item.report_date || item.recall_initiation_date || Date.now());
    externalUrl = `https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts`;
  } else if (endpoint.includes('event')) {
    // Adverse Event data
    title = `Adverse Event Report - ${item.patient?.drug?.[0]?.medicinalproduct || item.primarysource?.qualification || 'Unknown Product'}`;
    description = `Serious: ${item.serious || 'Unknown'}. ${item.patient?.reaction?.[0]?.reactionmeddrapt || 'Adverse reaction reported'}`;
    publishedDate = new Date(item.receiptdate || item.transmissiondate || Date.now());
    externalUrl = `https://www.fda.gov/drugs/surveillance/questions-and-answers-fdas-adverse-event-reporting-system-faers`;
  } else if (endpoint.includes('drugsfda')) {
    // Drug approval data
    title = `Drug Approval: ${item.openfda?.brand_name?.[0] || item.openfda?.generic_name?.[0] || 'Unknown Drug'}`;
    description = `Application Number: ${item.application_number}. Marketing Status: ${item.products?.[0]?.marketing_status || 'Unknown'}`;
    publishedDate = new Date(item.submissions?.[0]?.submission_status_date || Date.now());
    externalUrl = item.openfda?.route?.[0] ? `https://www.accessdata.fda.gov/scripts/cder/daf/` : '';
  } else if (endpoint.includes('label')) {
    // Drug label data
    title = `Drug Label Update: ${item.openfda?.brand_name?.[0] || item.openfda?.generic_name?.[0] || 'Unknown Drug'}`;
    description = `${item.indications_and_usage?.[0]?.substring(0, 200) || 'Drug labeling information updated'}...`;
    publishedDate = new Date(item.effective_time || Date.now());
    externalUrl = `https://dailymed.nlm.nih.gov/dailymed/`;
  }

  return {
    title: title || 'FDA Regulatory Update',
    source: source.name, // Use full source name
    urgency: calculateUrgency({ title, description }, source),
    summary: description || 'No description available.',
    published_date: publishedDate.toISOString(),
    external_url: externalUrl,
    full_content: JSON.stringify({ ...item, endpoint, source_type: 'openFDA' }),
    region: source.region,
    agency: source.agency
  };
}

function processFSISItem(item: any, source: DataSource): ProcessedAlert {
  const title = `FSIS Recall: ${item.product_name || item.productName || 'Meat/Poultry Product'}`;
  const description = `${item.problem || item.reason || 'Food safety concern'}. Establishment: ${item.establishment_name || item.establishmentName || 'Unknown'}`;
  const publishedDate = new Date(item.recall_date || item.recallDate || item.date_recalled || Date.now());
  
  return {
    title,
    source: source.name, // Use full source name
    urgency: calculateUrgency({ title, description }, source),
    summary: description,
    published_date: publishedDate.toISOString(),
    external_url: item.press_release_url || item.pressReleaseUrl || 'https://www.fsis.usda.gov/recalls',
    full_content: JSON.stringify({ ...item, source_type: 'FSIS' }),
    region: source.region,
    agency: source.agency
  };
}

function processFDADataDashboardItem(item: any, source: DataSource, endpoint: string): ProcessedAlert {
  let title = '';
  let description = '';
  let publishedDate = new Date();
  let externalUrl = '';
  let urgency = 'Medium';

  // Process different types of FDA Data Dashboard data
  if (endpoint.includes('complianceactions') || item.action_type || item.letter_type) {
    // Warning Letters and Compliance Actions
    const actionType = item.action_type || item.letter_type || 'Compliance Action';
    const companyName = item.legal_name || item.company_name || item.firm_name || 'Unknown Company';
    
    title = `FDA ${actionType}: ${companyName}`;
    description = `${item.subject || item.violations || item.citation || 'Compliance violations noted'}. ${item.state ? `State: ${item.state}` : ''}`;
    
    // Warning letters are typically high urgency
    if (actionType.toLowerCase().includes('warning') || item.letter_type?.toLowerCase().includes('warning')) {
      urgency = 'High';
    } else if (actionType.toLowerCase().includes('consent decree')) {
      urgency = 'Critical';
    }
    
    publishedDate = new Date(item.posted_date || item.issued_date || item.letter_issued_date || Date.now());
    externalUrl = item.letter_url || item.document_url || `https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities`;
    
  } else if (endpoint.includes('inspectionscitations') || item.citation || item.cfr_citation) {
    // Form 483s and Inspection Observations
    const establishmentName = item.legal_name || item.firm_name || item.establishment_name || 'Unknown Facility';
    const citationCount = item.citation_count || (Array.isArray(item.citations) ? item.citations.length : 1);
    
    title = `FDA Form 483: ${establishmentName} (${citationCount} observation${citationCount !== 1 ? 's' : ''})`;
    description = `${item.citation || item.program_area || 'Inspection observations noted'}. ${item.product_type ? `Product: ${item.product_type}` : ''} ${item.state ? `State: ${item.state}` : ''}`;
    
    // Multiple citations or critical observations indicate higher urgency
    if (citationCount >= 5) {
      urgency = 'High';
    } else if (citationCount >= 3) {
      urgency = 'Medium';
    } else {
      urgency = 'Low';
    }
    
    publishedDate = new Date(item.inspection_end_date || item.date_issued || item.posted_date || Date.now());
    externalUrl = item.report_url || item.document_url || `https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/inspection-references/inspection-observation-database`;
  }

  return {
    title: title || `FDA Compliance Data: ${item.legal_name || 'Unknown Entity'}`,
    source: source.name,
    urgency,
    summary: description || 'FDA compliance action or inspection observation.',
    published_date: publishedDate.toISOString(),
    external_url: externalUrl,
    full_content: JSON.stringify({ ...item, endpoint, source_type: 'FDA_DDAPI' }),
    region: source.region,
    agency: source.agency
  };
}

async function processDataSource(supabase: any, source: DataSource, openaiKey?: string): Promise<number> {
  try {
    logStep(`Processing data source: ${source.name} (${source.region})`);
    
    if (!(await shouldProcessSource(supabase, source))) {
      logStep(`Skipping ${source.name} - not yet time for next poll`);
      return 0;
    }

    let allItems: any[] = [];

    // Process based on source type
    if (source.source_type === 'api') {
      // Handle API data sources
      const endpoints = source.rss_feeds || (source.url ? [source.url] : []);
      
      for (const endpoint of endpoints) {
        let apiItems: any[] = [];
        
        if (source.agency === 'FDA' && (source.base_url?.includes('api.fda.gov') || source.url?.includes('api.fda.gov'))) {
          // openFDA API
          apiItems = await fetchOpenFDAData(endpoint, source);
          // Convert API items to alert format
          for (const item of apiItems) {
            const alert = processOpenFDAItem(item, source, endpoint);
            allItems.push(alert);
          }
        } else if (source.agency === 'FDA' && (source.metadata?.api_type === 'fda_dashboard' || source.url?.includes('datadashboard.fda.gov'))) {
          // FDA Data Dashboard API (Warning Letters, 483s, etc.)
          apiItems = await fetchFDADataDashboard(endpoint, source);
          // Convert API items to alert format
          for (const item of apiItems) {
            const alert = processFDADataDashboardItem(item, source, endpoint);
            allItems.push(alert);
          }
        } else if (source.agency === 'FSIS') {
          // FSIS API
          apiItems = await fetchFSISData(endpoint, source);
          // Convert API items to alert format
          for (const item of apiItems) {
            const alert = processFSISItem(item, source);
            allItems.push(alert);
          }
        }
        
        // Small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      // Process RSS feeds (existing functionality)
      const feedUrls = source.rss_feeds || (source.url ? [source.url] : []);
      
      for (const feedUrl of feedUrls) {
        const items = await fetchRSSFeed(feedUrl, source);
        // Convert RSS items to alert format
        for (const item of items) {
          const alert = processRSSItem(item, source);
          allItems.push(alert);
        }
        
        // Small delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    logStep(`Fetched ${allItems.length} items for ${source.name}`);

    let savedCount = 0;
    for (const item of allItems) {
      // For API sources, items are already ProcessedAlert objects
      if (source.source_type === 'api') {
        if (await saveAlert(supabase, item as ProcessedAlert, openaiKey)) {
          savedCount++;
        }
      } else {
        // For RSS sources, convert to ProcessedAlert first
        const alert = processRSSItem(item, source);
        if (await saveAlert(supabase, alert, openaiKey)) {
          savedCount++;
        }
      }
    }

    // Update last run timestamp
    await supabase.rpc('upsert_system_setting', {
      key_param: `last_run_${source.id}`,
      value_param: { timestamp: Date.now() },
      description_param: `Last data pipeline run for ${source.name}`
    });

    // Update source status
    await supabase
      .from('data_sources')
      .update({
        last_successful_fetch: new Date().toISOString(),
        last_error: null
      })
      .eq('id', source.id);

    logStep(`Processed ${source.name}: ${savedCount} new alerts saved`);
    return savedCount;

  } catch (error) {
    logStep(`Error processing data source ${source.name}:`, error);
    
    // Update source with error status
    await supabase
      .from('data_sources')
      .update({
        last_error: error.message || 'Unknown error'
      })
      .eq('id', source.id);
    
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Enhanced regulatory data pipeline started');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get API keys
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    // Get request parameters
    const { region, agency, force_refresh } = await req.json().catch(() => ({}));

    // Fetch data sources
    const dataSources = await fetchDataSources(supabase);
    logStep(`Found ${dataSources.length} active data sources`);

    // Filter sources if region or agency specified
    let filteredSources = dataSources;
    if (region) {
      filteredSources = filteredSources.filter(s => s.region.toLowerCase() === region.toLowerCase());
    }
    if (agency) {
      filteredSources = filteredSources.filter(s => s.agency.toLowerCase() === agency.toLowerCase());
    }

    logStep(`Processing ${filteredSources.length} filtered data sources`);

    const results: { [key: string]: number } = {};
    let totalAlertsProcessed = 0;

    // Process each data source
    for (const source of filteredSources) {
      if (force_refresh) {
        // Reset last run time for forced refresh
        await supabase.rpc('upsert_system_setting', {
          key_param: `last_run_${source.id}`,
          value_param: { timestamp: 0 },
          description_param: `Reset for forced refresh`
        });
      }
      
      const processed = await processDataSource(supabase, source, openaiKey);
      results[`${source.agency}_${source.region}`] = processed;
      totalAlertsProcessed += processed;
      
      // Small delay between sources
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Update data freshness tracking
    await supabase
      .from('data_freshness')
      .upsert({
        source_name: 'Enhanced_Regulatory_Pipeline',
        last_successful_fetch: new Date().toISOString(),
        last_attempt: new Date().toISOString(),
        records_fetched: totalAlertsProcessed,
        fetch_status: 'success'
      }, { onConflict: 'source_name' });

    logStep('Enhanced data pipeline completed', {
      totalAlertsProcessed,
      results
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalAlertsProcessed,
        results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    logStep('Pipeline error:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});