import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Compliance assistant request received');

    const { question, facilityType, products, currentCertifications } = await req.json();
    
    if (!question) {
      throw new Error('Question is required');
    }

    console.log('Processing compliance question:', { question, facilityType, products });

    // Create Supabase client for usage tracking
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data } = await supabaseClient.auth.getUser(token);
        userId = data.user?.id;
      } catch (error) {
        console.error('Auth error:', error);
      }
    }

    // Build context-aware system prompt
    const systemPrompt = `You are RegIQ's AI Compliance Assistant, a specialized expert in US food manufacturing regulations (FDA, USDA, FSIS, EPA). 

Your role is to provide precise, actionable compliance guidance for food manufacturing facilities. Always:

1. **Cite specific regulations** - Reference exact CFR sections, FDA guidance documents, USDA directives
2. **Provide facility-specific advice** - Tailor responses to the facility type and products
3. **Include next steps** - Give clear, actionable recommendations
4. **Flag critical compliance gaps** - Highlight urgent compliance issues
5. **Suggest documentation** - Recommend what records/procedures are needed

Current facility context:
- Facility Type: ${facilityType || 'General food manufacturing'}
- Products: ${products || 'Various food products'}  
- Current Certifications: ${currentCertifications || 'Not specified'}

Key regulatory areas to focus on:
- FDA Food Safety Modernization Act (FSMA) - 21 CFR 117
- USDA FSIS regulations for meat/poultry - 9 CFR 300-500
- HACCP requirements - 21 CFR 120, 123
- Allergen management - 21 CFR 117.135
- Nutritional labeling - 21 CFR 101
- Good Manufacturing Practices (GMPs) - 21 CFR 117 Subpart B

Format your response as:
## Direct Answer
[Clear, specific answer to their question]

## Regulatory Citations  
[Exact CFR sections and guidance documents]

## Recommended Actions
[Specific steps they should take]

## Documentation Requirements
[What records/procedures are needed]

## Risk Assessment
[Potential compliance risks if not addressed]`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_completion_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const complianceAdvice = data.choices[0].message.content;

    console.log('Generated compliance advice successfully');

    // Track usage
    if (userId) {
      try {
        await supabaseClient.from('usage_logs').insert({
          user_id: userId,
          feature_name: 'compliance_assistant',
          amount: 1,
          metadata: {
            question_length: question.length,
            facility_type: facilityType,
            products: products,
            timestamp: new Date().toISOString()
          }
        });
        console.log('Usage tracked successfully');
      } catch (error) {
        console.error('Error tracking usage:', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        advice: complianceAdvice,
        facilityContext: {
          facilityType,
          products,
          currentCertifications
        },
        timestamp: new Date().toISOString()
      }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in compliance-assistant function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});