import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-ALERT-PROCESSOR] ${step}${detailsStr}`);
};

// Generate AI summary using Perplexity
async function generateAlertSummary(alertContent: string, alertTitle: string): Promise<{ summary: string; urgencyScore: number }> {
  const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const prompt = `
    You are a food safety regulatory expert. Analyze this FDA/USDA/EPA alert and provide:
    1. A 2-3 sentence summary focusing on: what changed, who's affected, compliance deadline
    2. An urgency score from 1-10 based on: recalls (high), enforcement actions (high), immediate compliance deadlines (high), routine updates (low)

    Title: ${alertTitle}
    Content: ${alertContent.substring(0, 2000)}

    Respond in this exact JSON format:
    {
      "summary": "2-3 sentence summary here",
      "urgencyScore": 7
    }
  `;

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // Try to parse JSON response
    try {
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || 'AI summary unavailable',
        urgencyScore: Math.min(Math.max(parseInt(parsed.urgencyScore) || 5, 1), 10)
      };
    } catch {
      // Fallback: extract information manually
      const urgencyMatch = content.match(/urgency.*?(\d+)/i);
      const urgencyScore = urgencyMatch ? Math.min(Math.max(parseInt(urgencyMatch[1]), 1), 10) : 5;
      
      return {
        summary: content.substring(0, 200) + '...',
        urgencyScore
      };
    }
  } catch (error) {
    logStep('Perplexity API error', { error: error.message });
    // Fallback urgency scoring
    return {
      summary: 'AI processing unavailable - please review alert manually',
      urgencyScore: calculateFallbackUrgency(alertContent, alertTitle)
    };
  }
}

// Fallback urgency calculation when AI fails
function calculateFallbackUrgency(content: string, title: string): number {
  const text = (content + ' ' + title).toLowerCase();
  let score = 5; // baseline

  // High urgency indicators
  if (text.includes('recall') || text.includes('recalled')) score += 3;
  if (text.includes('immediate') || text.includes('urgent')) score += 2;
  if (text.includes('enforcement') || text.includes('violation')) score += 2;
  if (text.includes('warning letter') || text.includes('fda warning')) score += 2;
  if (text.includes('outbreak') || text.includes('contamination')) score += 3;
  if (text.includes('death') || text.includes('injury')) score += 4;
  
  // Medium urgency indicators
  if (text.includes('guidance') || text.includes('draft')) score += 1;
  if (text.includes('comment period') || text.includes('public meeting')) score += 1;
  
  // Check for deadlines
  if (text.includes('deadline') || text.includes('due date')) score += 1;
  if (text.includes('30 days') || text.includes('within 30')) score += 1;
  if (text.includes('15 days') || text.includes('within 15')) score += 2;

  return Math.min(Math.max(score, 1), 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("AI Alert Processor started");

    const { alertId, batchProcess } = await req.json();

    if (batchProcess) {
      // Process unprocessed alerts (limit to 20 per batch to control costs)
      logStep("Starting batch processing");
      
      const { data: alerts, error } = await supabaseClient
        .from('alerts')
        .select('id, title, content, summary')
        .eq('perplexity_processed', false)
        .limit(20);

      if (error) throw error;

      logStep("Found alerts to process", { count: alerts?.length || 0 });

      let processed = 0;
      let errors = 0;

      for (const alert of alerts || []) {
        try {
          const { summary, urgencyScore } = await generateAlertSummary(
            alert.content || alert.summary || '',
            alert.title || ''
          );

          const { error: updateError } = await supabaseClient
            .from('alerts')
            .update({
              ai_summary: summary,
              urgency_score: urgencyScore,
              perplexity_processed: true
            })
            .eq('id', alert.id);

          if (updateError) {
            logStep("Error updating alert", { alertId: alert.id, error: updateError.message });
            errors++;
          } else {
            processed++;
            logStep("Processed alert", { alertId: alert.id, urgencyScore, summary: summary.substring(0, 50) + '...' });
          }

          // Add delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          logStep("Error processing individual alert", { alertId: alert.id, error: error.message });
          errors++;
        }
      }

      return new Response(JSON.stringify({ 
        processed, 
        errors, 
        total: alerts?.length || 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (alertId) {
      // Process single alert
      logStep("Processing single alert", { alertId });

      const { data: alert, error } = await supabaseClient
        .from('alerts')
        .select('id, title, content, summary')
        .eq('id', alertId)
        .single();

      if (error) throw error;
      if (!alert) throw new Error('Alert not found');

      const { summary, urgencyScore } = await generateAlertSummary(
        alert.content || alert.summary || '',
        alert.title || ''
      );

      const { error: updateError } = await supabaseClient
        .from('alerts')
        .update({
          ai_summary: summary,
          urgency_score: urgencyScore,
          perplexity_processed: true
        })
        .eq('id', alertId);

      if (updateError) throw updateError;

      logStep("Successfully processed alert", { alertId, urgencyScore });

      return new Response(JSON.stringify({
        success: true,
        alertId,
        summary,
        urgencyScore
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error('Invalid request: provide alertId or set batchProcess=true');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});