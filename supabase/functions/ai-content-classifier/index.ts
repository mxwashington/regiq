import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// Simple logger for Supabase functions
const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface ClassificationRequest {
  title: string;
  content: string;
  source: string;
  alert_id?: string;
}

interface ClassificationResult {
  industry: { tag: string; confidence: number };
  signal_type: { tag: string; confidence: number };
  risk_tier: { tag: string; confidence: number };
  source_type: { tag: string; confidence: number };
  region: { tag: string; confidence: number };
  reasoning: string;
}

interface FallbackKeywords {
  [category: string]: {
    [tag: string]: string[];
  };
}

// Fallback keyword mappings for when AI classification fails
const FALLBACK_KEYWORDS: FallbackKeywords = {
  industry: {
    food: ['food', 'restaurant', 'dietary', 'nutrition', 'meat', 'produce', 'dairy', 'beverage', 'haccp', 'foodborne'],
    pharma: ['drug', 'pharmaceutical', 'medicine', 'clinical', 'fda approval', 'adverse event', 'prescription'],
    agriculture: ['farm', 'crop', 'pesticide', 'herbicide', 'agricultural', 'livestock', 'irrigation'],
    'animal-health': ['veterinary', 'animal', 'pet', 'livestock', 'vaccine', 'feed', 'veterinarian']
  },
  signal_type: {
    recall: ['recall', 'withdrawn', 'retrieved', 'remove from market', 'voluntary recall'],
    'rule-change': ['regulation', 'rule', 'law', 'policy change', 'regulatory update'],
    guidance: ['guidance', 'recommendation', 'best practice', 'advisory'],
    'warning-letter': ['warning letter', 'violation', 'enforcement action', 'compliance'],
    'market-signal': ['market', 'economic', 'trade', 'supply chain', 'shortage'],
    'labeling-violation': ['labeling', 'misbranding', 'label', 'claims'],
    'policy-change': ['policy', 'procedure', 'administrative', 'update']
  },
  risk_tier: {
    'immediate-attention': ['urgent', 'immediate', 'emergency', 'critical', 'danger'],
    deadline: ['deadline', 'due date', 'must submit', 'expires'],
    'compliance-action': ['mandatory', 'required', 'enforcement', 'violation'],
    advisory: ['recommend', 'suggest', 'advisory', 'guidance'],
    info: ['information', 'update', 'notice', 'announcement']
  },
  source_type: {
    gov: ['fda.gov', 'usda.gov', 'epa.gov', 'cdc.gov', 'government', 'federal'],
    legal: ['court', 'lawsuit', 'legal', 'judge', 'ruling'],
    'industry-media': ['trade', 'industry', 'association', 'magazine'],
    web: ['company', 'press release', 'announcement'],
    social: ['twitter', 'linkedin', 'facebook', 'social media']
  },
  region: {
    us: ['united states', 'usa', 'federal', 'state', 'fda', 'usda', 'epa'],
    canada: ['canada', 'canadian', 'health canada', 'cfia'],
    eu: ['european', 'eu', 'efsa', 'ema', 'european union'],
    global: ['international', 'worldwide', 'global', 'who', 'fao']
  }
};

function logStep(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  logger.info(`[${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

async function classifyWithAI(content: ClassificationRequest, openaiKey: string): Promise<ClassificationResult | null> {
  const classificationPrompt = `
Analyze this regulatory content and assign appropriate tags from the following categories:

CONTENT TITLE: ${content.title}
CONTENT: ${content.content}
SOURCE: ${content.source}

Classify using these exact categories and tags:

Industry: [Food|Pharma|Agriculture|Animal Health]
Signal Type: [Recall|Rule Change|Guidance|Warning Letter|Market Signal|Labeling Violation|Policy Change]
Risk Tier: [Info|Advisory|Compliance Action|Deadline|Immediate Attention]
Source Type: [Gov|Legal|Industry Media|Web|Social]
Region: [U.S.|Canada|EU|Global]

Return ONLY a JSON object with this exact format:
{
  "industry": {"tag": "Food", "confidence": 0.85},
  "signal_type": {"tag": "Recall", "confidence": 0.92},
  "risk_tier": {"tag": "Immediate Attention", "confidence": 0.88},
  "source_type": {"tag": "Gov", "confidence": 0.95},
  "region": {"tag": "U.S.", "confidence": 0.90},
  "reasoning": "Brief explanation of classification decisions"
}

Confidence scores should be between 0.0 and 1.0. Be conservative with confidence scores.
`;

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
            content: 'You are an expert regulatory analyst. Classify regulatory content accurately using the provided taxonomy. Return only valid JSON.'
          },
          {
            role: 'user',
            content: classificationPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      logStep('OpenAI API error', { status: response.status, statusText: response.statusText });
      return null;
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      logStep('No response from OpenAI');
      return null;
    }

    // Parse JSON response
    try {
      const classification = JSON.parse(aiResponse);
      logStep('AI classification successful', classification);
      return classification;
    } catch (parseError) {
      logStep('Failed to parse AI response as JSON', { response: aiResponse, error: parseError });
      return null;
    }

  } catch (error) {
    logStep('Error calling OpenAI API', error);
    return null;
  }
}

function classifyWithKeywords(content: ClassificationRequest): Partial<ClassificationResult> {
  const text = (content.title + ' ' + content.content + ' ' + content.source).toLowerCase();
  const classification: any = {};

  // Check each category
  for (const [category, tags] of Object.entries(FALLBACK_KEYWORDS)) {
    let bestMatch = { tag: '', confidence: 0 };
    
    for (const [tag, keywords] of Object.entries(tags)) {
      let matches = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          matches++;
        }
      }
      
      const confidence = Math.min(matches / keywords.length, 0.8); // Cap fallback confidence at 80%
      if (confidence > bestMatch.confidence) {
        bestMatch = { tag, confidence };
      }
    }
    
    if (bestMatch.confidence > 0.2) { // Minimum threshold
      classification[category] = bestMatch;
    }
  }

  return classification;
}

function getSourceBasedTags(source: string): Partial<ClassificationResult> {
  const classification: any = {};
  const sourceLower = source.toLowerCase();

  // Determine source type based on domain/source
  if (sourceLower.includes('fda.gov') || sourceLower.includes('usda.gov') || 
      sourceLower.includes('epa.gov') || sourceLower.includes('cdc.gov')) {
    classification.source_type = { tag: 'Gov', confidence: 0.9 };
    classification.region = { tag: 'U.S.', confidence: 0.9 };
  } else if (sourceLower.includes('canada') || sourceLower.includes('cfia') || 
             sourceLower.includes('health canada')) {
    classification.source_type = { tag: 'Gov', confidence: 0.9 };
    classification.region = { tag: 'Canada', confidence: 0.9 };
  } else if (sourceLower.includes('efsa') || sourceLower.includes('ema') || 
             sourceLower.includes('europa.eu')) {
    classification.source_type = { tag: 'Gov', confidence: 0.9 };
    classification.region = { tag: 'EU', confidence: 0.9 };
  }

  return classification;
}

async function saveClassificationTags(
  supabase: any, 
  alertId: string, 
  classification: ClassificationResult,
  method: string,
  aiModel?: string
): Promise<void> {
  try {
    // Get taxonomy tags
    const { data: taxonomyData } = await supabase
      .from('taxonomy_tags')
      .select(`
        id,
        slug,
        name,
        taxonomy_categories!inner(name)
      `);

    if (!taxonomyData) {
      logStep('Failed to fetch taxonomy data');
      return;
    }

    // Create lookup map
    const tagLookup: { [key: string]: { [key: string]: string } } = {};
    taxonomyData.forEach((tag: any) => {
      const categoryName = tag.taxonomy_categories.name.toLowerCase().replace(' ', '_');
      if (!tagLookup[categoryName]) {
        tagLookup[categoryName] = {};
      }
      tagLookup[categoryName][tag.slug] = tag.id;
    });

    // Prepare alert tags for insertion
    const alertTags = [];
    const categoryMapping: { [key: string]: string } = {
      'industry': 'industry',
      'signal_type': 'signal_type',
      'risk_tier': 'risk_tier',
      'source_type': 'source_type',
      'region': 'region'
    };

    for (const [classKey, dbKey] of Object.entries(categoryMapping)) {
      const classificationData = (classification as any)[classKey];
      if (classificationData && classificationData.confidence >= 0.6) {
        const tagSlug = classificationData.tag.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const tagId = tagLookup[dbKey]?.[tagSlug];
        
        if (tagId) {
          alertTags.push({
            alert_id: alertId,
            tag_id: tagId,
            confidence_score: classificationData.confidence,
            is_primary: true
          });
        }
      }
    }

    // Insert alert tags
    if (alertTags.length > 0) {
      const { error: insertError } = await supabase
        .from('alert_tags')
        .insert(alertTags);

      if (insertError) {
        logStep('Error inserting alert tags', insertError);
      } else {
        logStep(`Inserted ${alertTags.length} tags for alert ${alertId}`);
      }
    }

    // Save classification history
    const { error: historyError } = await supabase
      .from('tag_classifications')
      .insert({
        alert_id: alertId,
        classification_method: method,
        ai_model: aiModel,
        classification_data: classification,
        confidence_scores: {
          industry: classification.industry?.confidence || 0,
          signal_type: classification.signal_type?.confidence || 0,
          risk_tier: classification.risk_tier?.confidence || 0,
          source_type: classification.source_type?.confidence || 0,
          region: classification.region?.confidence || 0
        }
      });

    if (historyError) {
      logStep('Error saving classification history', historyError);
    }

  } catch (error) {
    logStep('Error in saveClassificationTags', error);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('AI content classifier started');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { title, content, source, alert_id } = await req.json() as ClassificationRequest;

    if (!title || !content || !source) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: title, content, source' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const classificationRequest = { title, content, source, alert_id };
    let finalClassification: ClassificationResult | null = null;
    let classificationMethod = '';

    // Try AI classification first
    logStep('Attempting AI classification');
    const aiClassification = await classifyWithAI(classificationRequest, openaiApiKey);
    
    if (aiClassification) {
      finalClassification = aiClassification;
      classificationMethod = 'ai';
      logStep('Using AI classification');
    } else {
      // Fallback to keyword + source-based classification
      logStep('AI classification failed, using fallback methods');
      const keywordClassification = classifyWithKeywords(classificationRequest);
      const sourceClassification = getSourceBasedTags(source);
      
      // Merge classifications with source taking priority for source_type and region
      finalClassification = {
        industry: keywordClassification.industry || { tag: 'Food', confidence: 0.3 },
        signal_type: keywordClassification.signal_type || { tag: 'Guidance', confidence: 0.3 },
        risk_tier: keywordClassification.risk_tier || { tag: 'Info', confidence: 0.3 },
        source_type: sourceClassification.source_type || keywordClassification.source_type || { tag: 'Web', confidence: 0.3 },
        region: sourceClassification.region || keywordClassification.region || { tag: 'U.S.', confidence: 0.3 },
        reasoning: 'Classification based on keyword matching and source analysis (AI unavailable)'
      };
      classificationMethod = 'keyword+source';
    }

    // Save tags to database if alert_id provided
    if (alert_id && finalClassification) {
      await saveClassificationTags(
        supabase, 
        alert_id, 
        finalClassification, 
        classificationMethod,
        classificationMethod === 'ai' ? 'gpt-4o-mini' : undefined
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        classification: finalClassification,
        method: classificationMethod,
        message: 'Content classified successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    logStep('Unexpected error in ai-content-classifier', { error: error.message });
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});