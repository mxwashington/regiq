import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    logStep("Missing STRIPE_WEBHOOK_SECRET");
    return new Response(JSON.stringify({ error: "Missing STRIPE_WEBHOOK_SECRET" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  let event: Stripe.Event;
  const payload = await req.text();
  const sig = req.headers.get("Stripe-Signature") || "";

  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    logStep("Webhook signature verification failed", { error: String(err) });
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  try {
    logStep("Event received", { id: event.id, type: event.type });

    const ensureSubscriber = async (customerId: string, email?: string | null) => {
      let resolvedEmail = email ?? null;
      if (!resolvedEmail) {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer || (customer as any).deleted) return null;
        resolvedEmail = (customer as Stripe.Customer).email ?? null;
      }
      if (!resolvedEmail) return null;

      const { data: existing } = await supabase
        .from("subscribers")
        .select("id, email, user_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();

      if (!existing) {
        await supabase.from("subscribers").upsert({
          email: resolvedEmail,
          stripe_customer_id: customerId,
          subscribed: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: "email" });
      }
      return resolvedEmail;
    };

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id!;
        await ensureSubscriber(customerId, (sub as any).customer_email);

        const subscribed = ["active", "trialing"].includes(sub.status);
        const subscriptionEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

        await supabase.from("subscribers").upsert({
          stripe_customer_id: customerId,
          subscribed,
          subscription_end: subscriptionEnd,
          subscription_tier: "Premium",
          updated_at: new Date().toISOString(),
        }, { onConflict: "email" });
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id!;
        await supabase.from("subscribers").update({
          subscribed: false,
          updated_at: new Date().toISOString(),
        }).eq("stripe_customer_id", customerId);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id!;
        // Optionally: set a grace flag or log failure
        await supabase.from("subscribers").update({
          updated_at: new Date().toISOString(),
        }).eq("stripe_customer_id", customerId);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id!;
        await supabase.from("subscribers").update({
          subscribed: true,
          updated_at: new Date().toISOString(),
        }).eq("stripe_customer_id", customerId);
        break;
      }
      default:
        logStep("Unhandled event", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    logStep("Processing error", { error: String(err) });
    return new Response(JSON.stringify({ error: "Webhook processing error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
