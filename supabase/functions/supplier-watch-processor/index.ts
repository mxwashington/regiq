import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUPPLIER-WATCH-PROCESSOR] ${step}${detailsStr}`);
};

// Extract supplier names from alert content
function extractSupplierNames(content: string, title: string): string[] {
  const text = (content + ' ' + title).toLowerCase();
  const suppliers: string[] = [];
  
  // Common patterns for supplier mentions in regulatory alerts
  const patterns = [
    /(?:manufactured by|produced by|distributed by|recalled by|company[:\s]+)([A-Z][A-Za-z\s&.,]+(?:Inc|LLC|Corp|Company|Co\.|Ltd))/gi,
    /([A-Z][A-Za-z\s&.,]+(?:Inc|LLC|Corp|Company|Co\.|Ltd))(?:\s+(?:has recalled|voluntarily recalls|is recalling))/gi,
    /firm[:\s]+([A-Z][A-Za-z\s&.,]+(?:Inc|LLC|Corp|Company|Co\.|Ltd))/gi,
  ];

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const supplier = match[1].trim()
          .replace(/[.,]+$/, '') // Remove trailing punctuation
          .replace(/\s+/g, ' '); // Normalize whitespace
        
        if (supplier.length > 3 && supplier.length < 100) {
          suppliers.push(supplier);
        }
      }
    }
  }

  // Remove duplicates
  return [...new Set(suppliers)];
}

// Calculate risk score for a supplier
function calculateSupplierRiskScore(alertCount: number, recentAlerts: any[]): number {
  let score = 0;
  
  // Base scoring
  score += alertCount * 10; // 10 points per alert
  
  // Recent activity bonus (within last 30 days)
  const recentCount = recentAlerts.filter(alert => {
    const alertDate = new Date(alert.published_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return alertDate >= thirtyDaysAgo;
  }).length;
  
  score += recentCount * 20; // 20 points for recent alerts
  
  // Severity-based scoring
  for (const alert of recentAlerts) {
    if (alert.urgency_score >= 8) score += 50; // Critical alerts
    else if (alert.urgency_score >= 6) score += 20; // High urgency
    else if (alert.urgency_score >= 4) score += 10; // Medium urgency
  }
  
  return Math.min(score, 1000); // Cap at 1000
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
    logStep("Supplier Watch Processor started");

    const { processBatch } = await req.json();

    if (processBatch) {
      // Process recent alerts to find suppliers
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: recentAlerts, error: alertsError } = await supabaseClient
        .from('alerts')
        .select('id, title, content, summary, urgency_score, published_date')
        .gte('published_date', threeDaysAgo.toISOString())
        .limit(100);

      if (alertsError) throw alertsError;

      logStep("Processing alerts for supplier mentions", { alertCount: recentAlerts?.length || 0 });

      let suppliersFound = 0;
      let linksCreated = 0;

      for (const alert of recentAlerts || []) {
        try {
          const supplierNames = extractSupplierNames(
            alert.content || alert.summary || '',
            alert.title || ''
          );

          for (const supplierName of supplierNames) {
            // Create or update supplier
            const { data: existingSupplier, error: findError } = await supabaseClient
              .from('suppliers')
              .select('id, risk_score')
              .eq('name', supplierName)
              .maybeSingle();

            if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
              logStep("Error finding supplier", { supplier: supplierName, error: findError.message });
              continue;
            }

            let supplierId: string;

            if (existingSupplier) {
              supplierId = existingSupplier.id;
            } else {
              // Create new supplier
              const { data: newSupplier, error: createError } = await supabaseClient
                .from('suppliers')
                .insert({
                  name: supplierName,
                  risk_score: 0,
                  last_checked: new Date().toISOString()
                })
                .select('id')
                .single();

              if (createError) {
                logStep("Error creating supplier", { supplier: supplierName, error: createError.message });
                continue;
              }

              supplierId = newSupplier.id;
              suppliersFound++;
              logStep("Created new supplier", { supplier: supplierName, id: supplierId });
            }

            // Link supplier to alert (if not already linked)
            const { error: linkError } = await supabaseClient
              .from('supplier_alerts')
              .upsert({
                supplier_id: supplierId,
                alert_id: alert.id,
                relevance_score: Math.min(alert.urgency_score * 10, 100)
              }, {
                onConflict: 'supplier_id,alert_id'
              });

            if (linkError && linkError.code !== '23505') { // 23505 = unique violation (already exists)
              logStep("Error linking supplier to alert", { 
                supplier: supplierName, 
                alertId: alert.id, 
                error: linkError.message 
              });
            } else {
              linksCreated++;
            }
          }
        } catch (error) {
          logStep("Error processing alert for suppliers", { 
            alertId: alert.id, 
            error: error.message 
          });
        }
      }

      // Update risk scores for all suppliers
      const { data: allSuppliers, error: suppliersError } = await supabaseClient
        .from('suppliers')
        .select(`
          id, 
          name,
          supplier_alerts!inner(
            alert_id,
            alerts(urgency_score, published_date)
          )
        `);

      if (suppliersError) {
        logStep("Warning: Could not update risk scores", { error: suppliersError.message });
      } else {
        for (const supplier of allSuppliers || []) {
          const relatedAlerts = supplier.supplier_alerts?.map(sa => sa.alerts).filter(Boolean) || [];
          const riskScore = calculateSupplierRiskScore(relatedAlerts.length, relatedAlerts);

          const { error: updateError } = await supabaseClient
            .from('suppliers')
            .update({
              risk_score: riskScore,
              last_checked: new Date().toISOString()
            })
            .eq('id', supplier.id);

          if (updateError) {
            logStep("Error updating supplier risk score", { 
              supplierId: supplier.id, 
              error: updateError.message 
            });
          }
        }
      }

      return new Response(JSON.stringify({
        processed: true,
        suppliersFound,
        linksCreated,
        alertsProcessed: recentAlerts?.length || 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error('Invalid request: set processBatch=true');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      processed: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});