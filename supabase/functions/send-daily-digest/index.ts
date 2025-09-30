import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// import { Resend } from "npm:resend@4.0.0"; // Commented out due to Deno compatibility issues
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Simple logger for edge functions
const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  logger.info(`[DAILY-DIGEST] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    logStep("Missing RESEND_API_KEY");
    return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

    // const resend = new Resend(resendKey); // Commented out due to build issues
    // For now, return early until Resend integration is properly set up
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const url = new URL(req.url);
    let dryRun = url.searchParams.get("dryRun") === "1";
    // Also accept JSON body for invoke() calls
    try {
      const body = await req.json();
      if (typeof body?.dryRun === 'boolean') dryRun = body.dryRun;
    } catch (_e) {/* no body */}

    // Determine yesterday in UTC (approx; adjust for ET if needed)
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59));

    // Get users with digest preferences enabled
    const { data: users, error: usersError } = await supabase
      .from('digest_preferences')
      .select(`
        user_id,
        enabled,
        time,
        frequency,
        profiles!inner(email, full_name)
      `)
      .eq('enabled', true);
    if (usersError) throw usersError;

    // Fetch critical alerts from yesterday with AI summaries
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('title, agency, urgency_score, external_url, published_date, ai_summary')
      .gte('urgency_score', 7)
      .gte('published_date', start.toISOString())
      .lte('published_date', end.toISOString())
      .order('urgency_score', { ascending: false })
      .limit(10);
    if (alertsError) throw alertsError;

    const htmlFor = (items: any[], userName?: string) => {
      const greeting = userName ? `Hello ${userName},` : 'Hello,';
      
      if (!items?.length) {
        return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">${greeting}</h2>
            <p>No critical alerts in the last 24 hours. You are all clear! ✅</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              <a href="https://regiq.org/account" style="color: #2563eb;">Manage preferences</a> | 
              <a href="https://regiq.org/unsubscribe" style="color: #6b7280;">Unsubscribe</a>
            </p>
          </div>
        `;
      }
      
      const rows = items.map(a => `
        <div style="border-left: 4px solid ${a.urgency_score >= 9 ? '#dc2626' : a.urgency_score >= 7 ? '#ea580c' : '#6b7280'}; 
                    padding: 12px; margin: 12px 0; background: #f9fafb;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="background: ${a.urgency_score >= 9 ? '#dc2626' : a.urgency_score >= 7 ? '#ea580c' : '#6b7280'}; 
                        color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-right: 8px;">
              ${a.urgency_score}/10
            </span>
            <strong style="color: #374151;">[${a.agency}]</strong>
          </div>
          <h3 style="margin: 8px 0; color: #111827;">${a.title}</h3>
          ${a.ai_summary ? `<p style="color: #4b5563; margin: 8px 0;">${a.ai_summary}</p>` : ''}
          ${a.external_url ? `<a href="${a.external_url}" style="color: #2563eb; text-decoration: none;">Read Full Alert →</a>` : ''}
        </div>
      `).join('');
      
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">${greeting}</h2>
          <h3 style="color: #374151;">Top ${items.length} Critical Alerts (Last 24 Hours)</h3>
          ${rows}
          <div style="border-top: 1px solid #e5e7eb; padding: 16px 0; margin-top: 24px;">
            <p style="color: #6b7280; font-size: 14px;">
              <a href="https://regiq.org/account" style="color: #2563eb;">Manage preferences</a> | 
              <a href="https://regiq.org/unsubscribe" style="color: #6b7280;">Unsubscribe</a>
            </p>
          </div>
        </div>
      `;
    };

    if (dryRun) {
      return new Response(JSON.stringify({ 
        recipients: users?.length || 0, 
        sampleHtml: htmlFor(alerts || [], "John Doe") 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let sent = 0;
    for (const user of users || []) {
      if (!user.profiles?.[0]?.email) continue;
      
      try {
        const subject = alerts?.length 
          ? `RegIQ Alert: ${alerts.length} Critical ${alerts.length === 1 ? 'Update' : 'Updates'}`
          : 'RegIQ Daily Digest — All Clear';
          
        // TODO: Replace with proper email sending implementation
        // await resend.emails.send({
        //   from: "RegIQ <alerts@regiq.org>",
        //   to: [user.profiles.email],
        //   subject,
        //   html: htmlFor(alerts || [], user.profiles.full_name),
        // });
        logger.info(`Would send email to ${user.profiles[0].email}: ${subject}`);
        sent++;
      } catch (e) {
        logStep("Error sending to recipient", { 
          email: user.profiles[0]?.email, 
          error: String(e) 
        });
      }
    }

    logStep("Digest complete", { recipients: users?.length || 0, sent, alertsFound: alerts?.length || 0 });
    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR in daily digest", { message: (error as Error).message });
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
