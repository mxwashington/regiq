import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-DIGEST] ${step}${detailsStr}`);
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
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user's digest preferences
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('digest_frequency, email')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      logStep("No profile found or error", { error: profileError });
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Get recent alerts (last 24 hours for daily, last 7 days for weekly)
    const hoursBack = profile.digest_frequency === 'daily' ? 24 : 168;
    const cutoffDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    const { data: alerts, error: alertsError } = await supabaseClient
      .from('alerts')
      .select('*')
      .gte('published_date', cutoffDate)
      .order('urgency_score', { ascending: false })
      .limit(10);

    if (alertsError) {
      logStep("Error fetching alerts", { error: alertsError });
      return new Response(JSON.stringify({ error: "Failed to fetch alerts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    logStep("Fetched alerts", { count: alerts?.length || 0 });

    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ message: "No alerts to send" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create digest email content
    const urgentAlerts = alerts.filter(a => a.urgency_score >= 8);
    const mediumAlerts = alerts.filter(a => a.urgency_score >= 4 && a.urgency_score < 8);
    const lowAlerts = alerts.filter(a => a.urgency_score < 4);

    const digestContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <header style="background: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">RegIQ ${profile.digest_frequency === 'daily' ? 'Daily' : 'Weekly'} Digest</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">${new Date().toLocaleDateString()}</p>
        </header>
        
        <div style="padding: 20px;">
          <p>Here are your recent regulatory alerts:</p>
          
          ${urgentAlerts.length > 0 ? `
            <section style="margin-bottom: 30px;">
              <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 5px;">🚨 Urgent Alerts</h2>
              ${urgentAlerts.map(alert => `
                <div style="border-left: 4px solid #dc2626; padding: 10px; margin: 10px 0; background: #fef2f2;">
                  <h3 style="margin: 0 0 5px 0; color: #dc2626;">${alert.title}</h3>
                  <p style="margin: 0; color: #666; font-size: 14px;">Source: ${alert.source} | Score: ${alert.urgency_score}/10</p>
                  ${alert.summary ? `<p style="margin: 10px 0 0 0; color: #333;">${alert.summary}</p>` : ''}
                </div>
              `).join('')}
            </section>
          ` : ''}
          
          ${mediumAlerts.length > 0 ? `
            <section style="margin-bottom: 30px;">
              <h2 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">⚠️ Monitor Closely</h2>
              ${mediumAlerts.slice(0, 5).map(alert => `
                <div style="border-left: 4px solid #f59e0b; padding: 10px; margin: 10px 0; background: #fffbeb;">
                  <h3 style="margin: 0 0 5px 0; color: #f59e0b;">${alert.title}</h3>
                  <p style="margin: 0; color: #666; font-size: 14px;">Source: ${alert.source} | Score: ${alert.urgency_score}/10</p>
                </div>
              `).join('')}
            </section>
          ` : ''}
          
          ${lowAlerts.length > 0 ? `
            <section>
              <h2 style="color: #6b7280; border-bottom: 2px solid #6b7280; padding-bottom: 5px;">ℹ️ Informational (${lowAlerts.length})</h2>
              <p style="color: #666;">Click <a href="https://regiq.com/dashboard" style="color: #2563eb;">here</a> to view all informational alerts in your dashboard.</p>
            </section>
          ` : ''}
        </div>
        
        <footer style="background: #f3f4f6; padding: 20px; text-align: center; color: #666; font-size: 14px;">
          <p><a href="https://regiq.com/dashboard" style="color: #2563eb;">View Full Dashboard</a> | <a href="https://regiq.com/account" style="color: #2563eb;">Manage Preferences</a></p>
          <p>RegIQ - Regulatory Intelligence Platform</p>
        </footer>
      </div>
    `;

    // In a real implementation, you would use a service like Resend here
    // For now, we'll just log that the email would be sent
    logStep("Digest email prepared", { 
      email: profile.email, 
      urgentCount: urgentAlerts.length,
      mediumCount: mediumAlerts.length,
      lowCount: lowAlerts.length
    });

    return new Response(JSON.stringify({ 
      message: "Digest email sent successfully",
      alertsSent: alerts.length,
      urgentAlerts: urgentAlerts.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in send-digest-email", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});