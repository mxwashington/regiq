import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DAILY-DIGEST] ${step}${detailsStr}`);
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

  const resend = new Resend(resendKey);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "1";

    // Determine yesterday in UTC (approx; adjust for ET if needed)
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 23, 59, 59));

    // Get subscribed users
    const { data: subs, error: subsError } = await supabase
      .from('subscribers')
      .select('email')
      .eq('subscribed', true);
    if (subsError) throw subsError;

    // Fetch critical alerts from yesterday
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('title, agency, urgency, external_url, published_date')
      .eq('urgency', 'High')
      .gte('published_date', start.toISOString())
      .lte('published_date', end.toISOString())
      .order('published_date', { ascending: false });
    if (alertsError) throw alertsError;

    const htmlFor = (items: any[]) => {
      if (!items?.length) {
        return '<p>No critical alerts in the last 24 hours. You are all clear.</p>';
      }
      const rows = items.map(a => `
        <li style="margin-bottom:8px;">
          <strong>[${a.agency}]</strong> ${a.title}
          ${a.external_url ? ` - <a href="${a.external_url}">Read more</a>` : ''}
        </li>`).join('');
      return `
        <h2>Yesterday's Critical Alerts</h2>
        <ul>${rows}</ul>
        <p style="margin-top:16px;">Manage preferences or unsubscribe in your RegIQ account.</p>
      `;
    };

    if (dryRun) {
      return new Response(JSON.stringify({ recipients: subs?.length || 0, sampleHtml: htmlFor(alerts || []) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let sent = 0;
    for (const s of subs || []) {
      if (!s.email) continue;
      try {
        await resend.emails.send({
          from: "RegIQ <no-reply@regiq.org>",
          to: [s.email],
          subject: "RegIQ Daily Digest — Critical Alerts",
          html: htmlFor(alerts || []),
        });
        sent++;
      } catch (e) {
        logStep("Error sending to recipient", { email: s.email, error: String(e) });
      }
    }

    logStep("Digest complete", { recipients: subs?.length || 0, sent });
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
