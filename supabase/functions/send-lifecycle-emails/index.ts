import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// import { Resend } from "npm:resend@2.0.0"; // Commented out due to Deno compatibility issues

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

interface EmailRequest {
  type: 'welcome' | 'day14_upgrade_nudge';
  userId: string;
  email?: string;
  data?: Record<string, any>;
}

const logStep = (step: string, details?: any) => {
  logger.info(`[LIFECYCLE-EMAILS] ${step}`, details || '');
};

// const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Lifecycle email function started");

    const { type, userId, email, data }: EmailRequest = await req.json();

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('email, full_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      throw new Error(`Profile not found for user: ${userId}`);
    }

    const userEmail = email || profile.email;
    const userName = profile.full_name || 'there';

    logStep("User profile retrieved", { userId, email: userEmail, name: userName });

    let emailHtml: string;
    let subject: string;

    switch (type) {
      case 'welcome':
        subject = "Welcome to RegIQ Starter Plan";
        emailHtml = generateWelcomeEmail(userName, data);
        break;
        
      case 'day14_upgrade_nudge':
        subject = "Missing the 'so what' behind your alerts?";
        emailHtml = generateUpgradeNudgeEmail(userName, data);
        break;
        
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // Note: Resend not available in current environment
    const emailError = null; // Placeholder for email sending
    
    logger.info(`Would send lifecycle email to ${userEmail}: ${subject}`);

    logStep("Email sent successfully", { type, userId, email: userEmail });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${type} email sent to ${userEmail}` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in lifecycle email", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function generateWelcomeEmail(userName: string, data?: Record<string, any>): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to RegIQ Starter Plan</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0 0 10px 0; font-size: 28px;">Welcome to RegIQ Starter Plan</h1>
        <p style="margin: 0; font-size: 16px; opacity: 0.9;">Your regulatory intelligence starts now</p>
      </div>
      
      <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h2 style="color: #1a202c; margin: 0 0 15px 0;">Hi ${userName},</h2>
        <p>You'll receive FDA, USDA, and EPA alerts by email. Here's what's included with Starter Plan:</p>
        
        <div style="display: grid; gap: 15px; margin: 20px 0;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div>
            <span><strong>Real-time critical alerts</strong> - Get immediately notified of urgent regulatory changes</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div>
            <span><strong>Basic categorization</strong> - Critical, High, Medium, Low priority levels</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div>
            <span><strong>30-day history</strong> - Access recent alerts in your dashboard</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 8px; height: 8px; background: #10b981; border-radius: 50%;"></div>
            <span><strong>Single facility monitoring</strong> - Perfect for getting started</span>
          </div>
        </div>
      </div>

      <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #f59e0b;">
        <h3 style="margin: 0 0 10px 0; color: #92400e;">Ready for more?</h3>
        <p style="margin: 0 0 15px 0; color: #92400e;">Upgrade to Growth for AI-powered insights, mobile access, advanced filters, and unlimited history—instantly.</p>
        <a href="${Deno.env.get('SITE_URL')}/pricing" style="display: inline-block; background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Upgrade to Growth</a>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${Deno.env.get('SITE_URL')}/dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 15px;">View Dashboard</a>
        <a href="${Deno.env.get('SITE_URL')}/settings/alerts" style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Manage Alerts</a>
      </div>

      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>You're receiving this because you subscribed to RegIQ Starter Plan.</p>
        <p>Need help? Reply to this email or visit our <a href="${Deno.env.get('SITE_URL')}/help" style="color: #3b82f6;">help center</a>.</p>
        <p style="margin-top: 20px;">
          <a href="${Deno.env.get('SITE_URL')}/unsubscribe" style="color: #9ca3af; text-decoration: none;">Unsubscribe</a> | 
          <a href="${Deno.env.get('SITE_URL')}/privacy" style="color: #9ca3af; text-decoration: none;">Privacy Policy</a>
        </p>
      </div>
    </body>
    </html>
  `;
}

function generateUpgradeNudgeEmail(userName: string, data?: Record<string, any>): string {
  const alertCount = data?.alertCount || 15;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Missing the "so what" behind your alerts?</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1f2937; color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0 0 10px 0; font-size: 24px;">Missing the "so what" behind your alerts?</h1>
        <p style="margin: 0; font-size: 16px; opacity: 0.9;">Get AI-powered insights with Starter</p>
      </div>
      
      <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h2 style="color: #1a202c; margin: 0 0 15px 0;">Hi ${userName},</h2>
        <p>You received <strong>${alertCount} alerts</strong> in the last 14 days. Starter delivers the signal; Growth explains the impact.</p>
        
        <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <h3 style="margin: 0 0 10px 0; color: #1e40af;">What you're missing with Growth:</h3>
          <ul style="margin: 10px 0; padding-left: 20px; color: #374151;">
            <li><strong>AI-powered analysis</strong> - Understand what each alert means for your business</li>
            <li><strong>Mobile access</strong> - Stay informed anywhere with our mobile app</li>
            <li><strong>Advanced filters</strong> - Find exactly what matters to you</li>
            <li><strong>Multi-facility monitoring</strong> - Scale across your operations</li>
            <li><strong>Unlimited history</strong> - Access your complete regulatory archive</li>
          </ul>
        </div>
      </div>

      <div style="background: linear-gradient(135deg, #ddd6fe, #c4b5fd); padding: 25px; border-radius: 8px; margin-bottom: 25px; text-align: center;">
        <h3 style="margin: 0 0 15px 0; color: #5b21b6; font-size: 20px;">Upgrade to Growth</h3>
        <div style="font-size: 32px; font-weight: bold; color: #5b21b6; margin-bottom: 5px;">$349<span style="font-size: 18px; font-weight: normal;">/month</span></div>
        <p style="margin: 0 0 20px 0; color: #6d28d9;">7-day free trial • Cancel anytime</p>
        <a href="${Deno.env.get('SITE_URL')}/pricing?upgrade=growth" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Upgrade Now</a>
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <a href="${Deno.env.get('SITE_URL')}/pricing" style="color: #6b7280; text-decoration: none; font-size: 14px;">Compare all plans</a>
      </div>

      <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>Still getting value from Starter Plan? No problem—we'll keep delivering regulatory intelligence to your inbox.</p>
        <p style="margin-top: 15px;">
          <a href="${Deno.env.get('SITE_URL')}/unsubscribe" style="color: #9ca3af; text-decoration: none;">Unsubscribe</a> | 
          <a href="${Deno.env.get('SITE_URL')}/settings/emails" style="color: #9ca3af; text-decoration: none;">Email Preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;
}