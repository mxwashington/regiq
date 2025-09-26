import { logger } from '@/lib/logger';

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface EntitlementCheck {
  feature: string;
  userId?: string;
}

interface EntitlementResponse {
  hasAccess: boolean;
  planId: string;
  featureValue: any;
  message?: string;
}

const logStep = (step: string, details?: any) => {
  logger.info(`[ENTITLEMENT-MIDDLEWARE] ${step}`, details || '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabaseClient.auth.getUser(token);
    const user = userData.user;
    
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    logStep("User authenticated", { userId: user.id });

    const { feature, userId }: EntitlementCheck = await req.json();
    const targetUserId = userId || user.id;

    // Get user entitlements
    const { data: entitlements, error } = await supabaseClient
      .rpc('get_user_entitlements', { user_uuid: targetUserId });

    if (error) {
      logStep("Error getting entitlements", error);
      throw error;
    }

    logStep("Retrieved entitlements", { count: entitlements?.length || 0 });

    // Find the specific feature
    const featureEntitlement = entitlements?.find(e => e.feature_key === feature);
    
    if (!featureEntitlement) {
      // Default to basic access if no plan found
      const response: EntitlementResponse = {
        hasAccess: false,
        planId: 'none',
        featureValue: false,
        message: 'Feature not available in current plan'
      };
      
      logStep("Feature not found", response);
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Parse feature value
    let featureValue = featureEntitlement.feature_value;
    if (typeof featureValue === 'string') {
      try {
        featureValue = JSON.parse(featureValue);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    const hasAccess = featureValue === true || featureValue === 'true' || 
                     (typeof featureValue === 'number' && featureValue > 0);

    const response: EntitlementResponse = {
      hasAccess,
      planId: featureEntitlement.plan_id,
      featureValue,
      message: hasAccess ? undefined : `${feature} requires plan upgrade`
    };

    logStep("Entitlement check complete", response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in entitlement check", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      hasAccess: false,
      planId: 'error',
      featureValue: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
