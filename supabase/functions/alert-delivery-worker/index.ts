import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface AlertDeliveryJob {
  alertId: string;
  userId?: string;
  priority?: 'Critical' | 'High' | 'Medium' | 'Low';
  forceImmediate?: boolean;
}

const logStep = (step: string, details?: any) => {
  console.log(`[ALERT-DELIVERY-WORKER] ${step}`, details || '');
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Alert delivery worker started");

    const { alertId, userId, priority = 'Medium', forceImmediate = false }: AlertDeliveryJob = await req.json();

    // Get alert details
    const { data: alert, error: alertError } = await supabaseClient
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (alertError || !alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    logStep("Alert retrieved", { alertId, title: alert.title, urgency: alert.urgency });

    // Get all users to notify (or specific user if provided)
    const userQuery = supabaseClient
      .from('user_entitlements')
      .select(`
        user_id,
        plan_id,
        profiles!inner(email, full_name)
      `)
      .eq('status', 'active');
    
    if (userId) {
      userQuery.eq('user_id', userId);
    }

    const { data: users, error: usersError } = await userQuery;

    if (usersError) {
      throw usersError;
    }

    logStep("Users to notify", { count: users?.length || 0 });

    for (const user of users || []) {
      try {
        // Check if user can receive alerts
        const canReceive = await supabaseClient
          .rpc('enforce_alert_limit', { user_uuid: user.user_id });

        if (!canReceive.data && !forceImmediate) {
          logStep("User daily limit reached", { userId: user.user_id });
          continue;
        }

        // Get user alert preferences
        const { data: prefs } = await supabaseClient
          .from('alert_preferences')
          .select('*')
          .eq('user_id', user.user_id)
          .single();

        // Check if user wants this category
        const wantsCategory = !prefs || prefs.categories.includes(alert.urgency);
        const wantsAgency = !prefs || prefs.agencies.includes(alert.agency);

        if (!wantsCategory || !wantsAgency) {
          logStep("User filtered out alert", { userId: user.user_id, category: alert.urgency, agency: alert.agency });
          continue;
        }

        // Determine delivery time based on plan and priority
        let scheduledFor = new Date();
        
        // Check if user has delay_non_critical feature enabled
        const { data: hasDelay } = await supabaseClient
          .rpc('check_feature_access', { 
            user_uuid: user.user_id, 
            feature: 'delay_non_critical' 
          });

        if (hasDelay && priority !== 'Critical' && !forceImmediate) {
          // Delay non-critical alerts by 24 hours for Alerts-Only users
          scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000);
          logStep("Non-critical alert delayed", { userId: user.user_id, scheduledFor });
        }

        // Queue the alert for delivery
        const { error: queueError } = await supabaseClient
          .from('alert_delivery_queue')
          .insert({
            alert_id: alertId,
            user_id: user.user_id,
            scheduled_for: scheduledFor.toISOString(),
            status: scheduledFor <= new Date() ? 'ready' : 'scheduled',
            delivery_method: 'email',
            metadata: {
              priority,
              plan_id: user.plan_id,
              delayed: hasDelay && priority !== 'Critical'
            }
          });

        if (queueError) {
          logStep("Error queueing alert", { userId: user.user_id, error: queueError });
          continue;
        }

        // If ready for immediate delivery, send now
        if (scheduledFor <= new Date()) {
          await deliverAlert(supabaseClient, alertId, user.user_id, alert, user.profiles);
        }

        logStep("Alert queued successfully", { 
          userId: user.user_id, 
          scheduledFor,
          immediate: scheduledFor <= new Date()
        });

      } catch (userError) {
        logStep("Error processing user", { userId: user.user_id, error: userError });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Alert ${alertId} queued for ${users?.length || 0} users` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in alert delivery worker", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function deliverAlert(
  supabaseClient: any,
  alertId: string,
  userId: string,
  alert: any,
  profile: any
) {
  try {
    logStep("Delivering alert via email", { alertId, userId, email: profile.email });

    const emailHtml = `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h1 style="color: #1f2937; margin: 0 0 10px 0; font-size: 24px;">${alert.title}</h1>
          <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <span style="background: ${getUrgencyColor(alert.urgency)}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
              ${alert.urgency}
            </span>
            <span style="background: #6b7280; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
              ${alert.agency}
            </span>
          </div>
          <p style="color: #4b5563; margin: 0; line-height: 1.5;">${alert.summary}</p>
        </div>
        
        <div style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
          <p><strong>Published:</strong> ${new Date(alert.published_date).toLocaleDateString()}</p>
          <p><strong>Source:</strong> ${alert.source}</p>
        </div>
        
        ${alert.external_url ? `
          <a href="${alert.external_url}" style="display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-bottom: 20px;">
            View Full Alert
          </a>
        ` : ''}
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 12px;">
          <p>You're receiving this because you subscribed to RegIQ alerts.</p>
          <p>Want AI-powered analysis and mobile access? <a href="${Deno.env.get('SITE_URL')}/pricing" style="color: #3b82f6;">Upgrade to Starter</a></p>
        </div>
      </div>
    `;

    const { error: emailError } = await resend.emails.send({
      from: 'RegIQ Alerts <alerts@regiq.com>',
      to: [profile.email],
      subject: `${alert.urgency}: ${alert.title}`,
      html: emailHtml,
    });

    if (emailError) {
      throw emailError;
    }

    // Mark as delivered
    const { error: updateError } = await supabaseClient
      .from('alert_delivery_queue')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString()
      })
      .match({
        alert_id: alertId,
        user_id: userId,
        status: 'ready'
      });

    if (updateError) {
      logStep("Error updating delivery status", updateError);
    }

    logStep("Alert delivered successfully", { alertId, userId });

  } catch (error) {
    logStep("Error delivering alert", { alertId, userId, error });
    
    // Mark as failed
    await supabaseClient
      .from('alert_delivery_queue')
      .update({
        status: 'failed',
        metadata: { error: error.message }
      })
      .match({
        alert_id: alertId,
        user_id: userId
      });
  }
}

function getUrgencyColor(urgency: string): string {
  switch (urgency.toLowerCase()) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#d97706';
    case 'low': return '#65a30d';
    default: return '#6b7280';
  }
}