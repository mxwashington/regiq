import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Check if user should be granted admin access
    const adminEmails = ["marcus@fsqahelp.org"];
    const shouldBeAdmin = adminEmails.includes(user.email);

    if (shouldBeAdmin) {
      // Grant admin access
      await supabaseClient
        .from("profiles")
        .upsert({
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          role: "super_admin",
          is_admin: true,
          admin_permissions: [
            "user_management",
            "feed_management", 
            "system_settings",
            "analytics",
            "billing"
          ],
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      // Log admin access grant
      await supabaseClient
        .from("admin_activities")
        .insert({
          admin_user_id: user.id,
          action: "admin_access_granted",
          target_type: "user",
          target_id: user.id,
          details: { email: user.email, granted_permissions: ["user_management", "feed_management", "system_settings", "analytics", "billing"] }
        });

      return new Response(JSON.stringify({ 
        success: true, 
        isAdmin: true,
        message: "Admin access granted" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check current admin status
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("is_admin, role, admin_permissions")
      .eq("user_id", user.id)
      .single();

    return new Response(JSON.stringify({ 
      success: true,
      isAdmin: profile?.is_admin || false,
      role: profile?.role || "user",
      permissions: profile?.admin_permissions || []
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("ERROR in check-admin-status:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});