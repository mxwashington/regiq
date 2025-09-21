import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-COMPLIANCE-ASSISTANT] ${step}${detailsStr}`);
};

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
    logStep("AI Compliance Assistant started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id });

    const { question, facilityType, products, currentCertifications } = await req.json();

    if (!question?.trim()) {
      throw new Error("Question is required");
    }

    // Check rate limit (50 queries per day per user)
    const today = new Date().toISOString().split('T')[0];
    const { data: todayChats, error: countError } = await supabaseClient
      .from('compliance_assistant_chats')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', today + 'T00:00:00.000Z')
      .lt('created_at', today + 'T23:59:59.999Z');

    if (countError) throw countError;

    if ((todayChats?.length || 0) >= 50) {
      throw new Error("Daily query limit reached (50 queries/day). Please try again tomorrow.");
    }

    // Get recent alerts for context (last 30 days, limit 10)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentAlerts, error: alertsError } = await supabaseClient
      .from('alerts')
      .select('title, ai_summary, category, urgency_score, published_date')
      .gte('published_date', thirtyDaysAgo.toISOString())
      .order('urgency_score', { ascending: false })
      .limit(10);

    if (alertsError) {
      logStep("Warning: Could not fetch recent alerts", { error: alertsError.message });
    }

    // Build context for AI
    const alertsContext = recentAlerts?.map(alert => 
      `- ${alert.title} (Urgency: ${alert.urgency_score}/10) - ${alert.ai_summary || 'No summary available'}`
    ).join('\n') || 'No recent alerts available';

    const facilityContext = [
      facilityType && `Facility Type: ${facilityType}`,
      products && `Products: ${products}`,
      currentCertifications && `Certifications: ${currentCertifications}`
    ].filter(Boolean).join('\n') || 'No facility context provided';

    const systemPrompt = `You are a food safety compliance expert with deep knowledge of FDA, USDA, and EPA regulations. 

Your expertise covers:
- Food Safety Modernization Act (FSMA)
- HACCP requirements
- FDA labeling regulations
- USDA food safety standards
- EPA regulations for food facilities
- Good Manufacturing Practices (GMPs)
- Supplier verification requirements
- Recall procedures

User's Facility Context:
${facilityContext}

Recent Regulatory Alerts (for reference):
${alertsContext}

Instructions:
1. Provide specific, actionable compliance advice
2. Reference relevant regulations when applicable
3. Suggest concrete next steps
4. If you're unsure about something, say so clearly
5. Keep responses focused and professional
6. Consider the user's facility context in your answer

User Question: ${question}`;

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY not configured');
    }

    logStep("Sending query to Perplexity", { 
      questionPreview: question.substring(0, 50) + '...',
      alertsCount: recentAlerts?.length || 0
    });

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a food safety compliance expert. Provide specific, actionable advice based on current FDA, USDA, and EPA regulations.'
          },
          {
            role: 'user',
            content: systemPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        return_images: false,
        return_related_questions: false,
        search_domain_filter: ['fda.gov', 'usda.gov', 'epa.gov', 'federalregister.gov'],
        search_recency_filter: 'month',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiAnswer = data.choices[0]?.message?.content || 'I was unable to generate a response. Please try rephrasing your question.';

    logStep("AI response generated", { 
      responseLength: aiAnswer.length,
      questionPreview: question.substring(0, 50) + '...'
    });

    // Save chat to database
    const { error: saveError } = await supabaseClient
      .from('compliance_assistant_chats')
      .insert({
        user_id: user.id,
        question: question.trim(),
        answer: aiAnswer,
        context_alerts: recentAlerts || []
      });

    if (saveError) {
      logStep("Warning: Could not save chat history", { error: saveError.message });
    }

    return new Response(JSON.stringify({
      answer: aiAnswer,
      facilityContext: {
        facilityType: facilityType || null,
        products: products || null,
        currentCertifications: currentCertifications || null
      },
      contextAlertsCount: recentAlerts?.length || 0,
      queriesUsedToday: (todayChats?.length || 0) + 1,
      dailyLimit: 50
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      answer: null
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});