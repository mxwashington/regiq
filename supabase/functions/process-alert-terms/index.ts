import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// import { Resend } from "npm:resend@4.0.0"; // Commented out due to Deno compatibility issues

// Simple logger for edge functions
const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

interface AlertRule {
  id: string;
  user_id: string;
  term: string;
  frequency: string;
  email_enabled: boolean;
  last_triggered_at: string | null;
  trigger_count?: number;
}

interface Alert {
  id: string;
  title: string;
  summary: string;
  source: string;
  urgency: string;
  published_date: string;
  external_url: string | null;
}

const logStep = (step: string, details?: any) => {
  logger.info(`[PROCESS-ALERT-TERMS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

const matchTermInText = (term: string, text: string): boolean => {
  const normalizedTerm = term.toLowerCase().trim();
  const normalizedText = text.toLowerCase();
  
  // Simple term matching - could be enhanced with fuzzy matching
  return normalizedText.includes(normalizedTerm);
};

const findMatchingAlerts = (alerts: Alert[], rules: AlertRule[]): Array<{rule: AlertRule, matchedAlerts: Alert[]}> => {
  const matches: Array<{rule: AlertRule, matchedAlerts: Alert[]}> = [];
  
  for (const rule of rules) {
    const matchedAlerts = alerts.filter(alert => {
      return matchTermInText(rule.term, alert.title) || 
             matchTermInText(rule.term, alert.summary);
    });
    
    if (matchedAlerts.length > 0) {
      matches.push({ rule, matchedAlerts });
    }
  }
  
  return matches;
};

const sendAlertEmail = async (userEmail: string, rule: AlertRule, matchedAlerts: Alert[]) => {
  const alertsHtml = matchedAlerts.map(alert => `
    <div style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 16px; margin: 12px 0;">
      <h3 style="margin: 0 0 8px 0; color: #1a1a1a;">${alert.title}</h3>
      <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">
        <strong>Source:</strong> ${alert.source} | <strong>Urgency:</strong> ${alert.urgency}
      </p>
      <p style="margin: 0 0 12px 0; color: #333; line-height: 1.4;">${alert.summary}</p>
      ${alert.external_url ? `<a href="${alert.external_url}" style="color: #2563eb; text-decoration: none;">View Details →</a>` : ''}
    </div>
  `).join('');

  const html = `
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
          <h1 style="margin: 0; color: #1e293b; font-size: 24px;">RegIQ Alert: "${rule.term}"</h1>
          <p style="margin: 8px 0 0 0; color: #64748b;">You have ${matchedAlerts.length} new alert${matchedAlerts.length === 1 ? '' : 's'} matching your term.</p>
        </div>
        
        <div>
          ${alertsHtml}
        </div>
        
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e1e5e9; text-align: center; color: #64748b; font-size: 12px;">
          <p>You're receiving this because you set up an alert for "${rule.term}" in RegIQ.</p>
          <p>To manage your alert preferences, visit your <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/dashboard" style="color: #2563eb;">RegIQ Dashboard</a>.</p>
        </div>
      </body>
    </html>
  `;

  try {
    const { error } = await resend.emails.send({
      from: 'RegIQ Alerts <alerts@regiq.org>',
      to: [userEmail],
      subject: `RegIQ Alert: ${matchedAlerts.length} new match${matchedAlerts.length === 1 ? '' : 'es'} for "${rule.term}"`,
      html: html,
    });

    if (error) {
      logStep('Email send error', error);
      return false;
    }

    logStep('Email sent successfully', { userEmail, term: rule.term, alertCount: matchedAlerts.length });
    return true;
  } catch (error) {
    logStep('Email send exception', error);
    return false;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    // Get recent alerts (last 24 hours)
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('id, title, summary, source, urgency, published_date, external_url')
      .gte('published_date', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('published_date', { ascending: false });

    if (alertsError) {
      throw new Error(`Failed to fetch alerts: ${alertsError.message}`);
    }

    logStep('Fetched alerts', { count: alerts?.length || 0 });

    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No recent alerts to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get active alert rules
    const { data: alertRules, error: rulesError } = await supabase
      .from('alert_rules')
      .select('id, user_id, term, frequency, email_enabled, last_triggered_at, trigger_count')
      .eq('is_active', true)
      .eq('email_enabled', true);

    if (rulesError) {
      throw new Error(`Failed to fetch alert rules: ${rulesError.message}`);
    }

    logStep('Fetched alert rules', { count: alertRules?.length || 0 });

    if (!alertRules || alertRules.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No active alert rules to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find matches
    const matches = findMatchingAlerts(alerts, alertRules);
    logStep('Found matches', { matchCount: matches.length });

    let processedCount = 0;
    let notificationsSent = 0;

    // Process matches and send notifications
    for (const { rule, matchedAlerts } of matches) {
      // Get user profile for email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', rule.user_id)
        .single();

      if (profileError || !profile?.email) {
        logStep('Profile not found', { userId: rule.user_id });
        continue;
      }

      // Record matches in database
      const matchRecords = matchedAlerts.map(alert => ({
        alert_rule_id: rule.id,
        alert_id: alert.id,
        notification_status: 'pending'
      }));

      const { error: matchError } = await supabase
        .from('alert_rule_matches')
        .upsert(matchRecords, { onConflict: 'alert_rule_id,alert_id' });

      if (matchError) {
        logStep('Failed to record matches', { error: matchError.message });
        continue;
      }

      // Send email notification
      const emailSent = await sendAlertEmail(profile.email, rule, matchedAlerts);

      if (emailSent) {
        // Update notification status and rule trigger info
        await supabase
          .from('alert_rule_matches')
          .update({ 
            notification_status: 'sent',
            notified_at: new Date().toISOString()
          })
          .eq('alert_rule_id', rule.id)
          .in('alert_id', matchedAlerts.map(a => a.id));

        await supabase
          .from('alert_rules')
          .update({ 
            last_triggered_at: new Date().toISOString(),
            trigger_count: (rule.trigger_count || 0) + 1
          })
          .eq('id', rule.id);

        notificationsSent++;
      } else {
        // Mark as failed
        await supabase
          .from('alert_rule_matches')
          .update({ notification_status: 'failed' })
          .eq('alert_rule_id', rule.id)
          .in('alert_id', matchedAlerts.map(a => a.id));
      }

      processedCount++;
    }

    logStep('Processing complete', { processedCount, notificationsSent });

    return new Response(JSON.stringify({
      success: true,
      processed: processedCount,
      notificationsSent: notificationsSent,
      alertsChecked: alerts.length,
      rulesProcessed: alertRules.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep('Function error', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});