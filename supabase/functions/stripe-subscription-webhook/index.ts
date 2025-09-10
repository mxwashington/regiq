import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}`, details || '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();
    
    if (!signature) {
      throw new Error("Missing stripe-signature header");
    }

    logStep("Webhook received", { signature: signature.slice(0, 20) + "..." });

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
    );

    logStep("Event verified", { type: event.type, id: event.id });

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription, supabaseClient);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object as Stripe.Subscription, supabaseClient);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.Invoice, supabaseClient, stripe);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, supabaseClient, stripe);
        break;
        
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function handleSubscriptionChange(subscription: Stripe.Subscription, supabaseClient: any) {
  try {
    logStep("Processing subscription change", { 
      subscriptionId: subscription.id,
      status: subscription.status 
    });

    const customer = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('stripe_customer_id', subscription.customer)
      .single();

    if (!customer.data) {
      throw new Error(`Customer not found: ${subscription.customer}`);
    }

    const userId = customer.data.user_id;

    // Determine plan from price
    const price = subscription.items.data[0].price;
    let planId = 'alerts_only';
    
    if (price.unit_amount >= 99900) {
      planId = 'enterprise';
    } else if (price.unit_amount >= 39900) {
      planId = 'professional';
    } else if (price.unit_amount >= 9900) {
      planId = 'starter';
    }

    logStep("Determined plan", { planId, priceAmount: price.unit_amount });

    // Update or create user entitlement
    const { error } = await supabaseClient
      .from('user_entitlements')
      .upsert({
        user_id: userId,
        plan_id: planId,
        subscription_id: subscription.id,
        status: subscription.status === 'active' ? 'active' : 'inactive',
        expires_at: subscription.cancel_at ? 
          new Date(subscription.cancel_at * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      throw error;
    }

    // Initialize alert preferences for new users
    const { error: prefsError } = await supabaseClient
      .from('alert_preferences')
      .upsert({
        user_id: userId,
        delay_non_critical: planId === 'alerts_only',
        max_daily_alerts: planId === 'alerts_only' ? 50 : 200,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (prefsError) {
      logStep("Error updating preferences", prefsError);
    }

    logStep("Subscription processed successfully", { userId, planId });

  } catch (error) {
    logStep("Error processing subscription change", error);
    throw error;
  }
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription, supabaseClient: any) {
  try {
    logStep("Processing subscription cancellation", { subscriptionId: subscription.id });

    const { error } = await supabaseClient
      .from('user_entitlements')
      .update({
        status: 'cancelled',
        expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('subscription_id', subscription.id);

    if (error) {
      throw error;
    }

    logStep("Subscription cancellation processed");

  } catch (error) {
    logStep("Error processing cancellation", error);
    throw error;
  }
}

async function handlePaymentSuccess(invoice: Stripe.Invoice, supabaseClient: any, stripe: Stripe) {
  try {
    logStep("Processing payment success", { invoiceId: invoice.id });

    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      await handleSubscriptionChange(subscription, supabaseClient);
    }

    // Log audit event
    const { error } = await supabaseClient
      .from('audit_events')
      .insert({
        event_type: 'payment_succeeded',
        event_data: {
          invoice_id: invoice.id,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          subscription_id: invoice.subscription
        }
      });

    if (error) {
      logStep("Error logging audit event", error);
    }

  } catch (error) {
    logStep("Error processing payment success", error);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice, supabaseClient: any, stripe: Stripe) {
  try {
    logStep("Processing payment failure", { invoiceId: invoice.id });

    // Log audit event
    const { error } = await supabaseClient
      .from('audit_events')
      .insert({
        event_type: 'payment_failed',
        event_data: {
          invoice_id: invoice.id,
          amount: invoice.amount_due,
          currency: invoice.currency,
          subscription_id: invoice.subscription,
          attempt_count: invoice.attempt_count
        }
      });

    if (error) {
      logStep("Error logging audit event", error);
    }

    // TODO: Send dunning email after 3 failed attempts
    if (invoice.attempt_count && invoice.attempt_count >= 3) {
      logStep("Multiple payment failures detected", { attempts: invoice.attempt_count });
      // Could trigger dunning email workflow here
    }

  } catch (error) {
    logStep("Error processing payment failure", error);
  }
}