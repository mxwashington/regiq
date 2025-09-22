import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 Testing Regulations.gov API directly...');

    const regulationsGovKey = Deno.env.get('REGULATIONS_GOV_API_KEY');
    console.log('API Key available:', regulationsGovKey ? 'Yes' : 'No');

    if (!regulationsGovKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'REGULATIONS_GOV_API_KEY not found',
          debug: 'API key is required for Regulations.gov API'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Test endpoint with recent documents
    const testUrl = 'https://api.regulations.gov/v4/documents?filter[agencyId]=FDA,EPA,USDA&filter[lastModifiedDate][gte]=2025-09-01&sort=-lastModifiedDate&page[size]=10';
    console.log('Testing URL:', testUrl);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': regulationsGovKey,
        'User-Agent': 'RegIQ-Test/1.0',
        'Accept': 'application/json'
      }
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `API returned ${response.status}: ${response.statusText}`,
          details: errorText,
          debug: {
            url: testUrl,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: response.status }
      );
    }

    const data = await response.json();
    console.log('API Response Data Keys:', Object.keys(data));
    console.log('Total Documents:', data.meta?.totalElements || 'Unknown');
    console.log('Documents in Response:', data.data?.length || 0);

    // Sample a few documents for debugging
    const sampleDocs = data.data?.slice(0, 3).map((doc: any) => ({
      id: doc.id,
      title: doc.attributes?.title,
      agency: doc.attributes?.agencyId,
      lastModifiedDate: doc.attributes?.lastModifiedDate,
      documentType: doc.attributes?.documentType
    }));

    return new Response(
      JSON.stringify({ 
        success: true,
        totalDocuments: data.meta?.totalElements || 0,
        documentsReturned: data.data?.length || 0,
        sampleDocuments: sampleDocs,
        debug: {
          url: testUrl,
          responseKeys: Object.keys(data),
          meta: data.meta
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Test Error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        debug: 'Unexpected error during API test'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});