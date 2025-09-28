// Simple logger for edge functions
const logger = {
  debug: (msg: string, data?: any) => console.debug(`[DEBUG] ${msg}`, data || ''),
  info: (msg: string, data?: any) => console.info(`[INFO] ${msg}`, data || ''),
  warn: (msg: string, data?: any) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || '')
};

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      throw new Error('Invalid user');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';

    switch (action) {
      case 'list':
        return await listWebhookEndpoints(supabase, user.id);
      case 'create':
        const createData = await req.json();
        return await createWebhookEndpoint(supabase, user.id, createData);
      case 'update':
        const updateData = await req.json();
        const updateId = url.searchParams.get('id');
        if (!updateId) {
          return new Response(JSON.stringify({ error: 'Missing update ID' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await updateWebhookEndpoint(supabase, user.id, updateId, updateData);
      case 'delete':
        const deleteId = url.searchParams.get('id');
        if (!deleteId) {
          return new Response(JSON.stringify({ error: 'Missing delete ID' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await deleteWebhookEndpoint(supabase, user.id, deleteId);
      case 'test':
        const testId = url.searchParams.get('id');
        if (!testId) {
          return new Response(JSON.stringify({ error: 'Missing test ID' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return await testWebhook(supabase, user.id, testId);
      case 'deliveries':
        const webhookId = url.searchParams.get('webhook_id');
        return await getWebhookDeliveries(supabase, user.id, webhookId || undefined);
      case 'send':
        const sendData = await req.json();
        return await sendWebhook(supabase, sendData);
      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    logger.error('Error in webhook-manager function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function listWebhookEndpoints(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('webhook_endpoints')
    .select(`
      *,
      webhook_deliveries(
        id,
        status,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Add delivery stats
  const webhooksWithStats = data.map((webhook: any) => ({
    ...webhook,
    delivery_stats: {
      total: webhook.webhook_deliveries.length,
      delivered: webhook.webhook_deliveries.filter((d: any) => d.status === 'delivered').length,
      failed: webhook.webhook_deliveries.filter((d: any) => d.status === 'failed').length,
      pending: webhook.webhook_deliveries.filter((d: any) => d.status === 'pending').length
    }
  }));

  return new Response(
    JSON.stringify({ webhook_endpoints: webhooksWithStats }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createWebhookEndpoint(supabase: any, userId: string, data: any) {
  const { name, description, endpoint_url, events, headers } = data;

  // Generate secret token
  const secretToken = await generateSecretToken();

  // Validate webhook URL
  if (!isValidUrl(endpoint_url)) {
    throw new Error('Invalid webhook URL');
  }

  const { data: newWebhook, error } = await supabase
    .from('webhook_endpoints')
    .insert({
      user_id: userId,
      name,
      description,
      endpoint_url,
      secret_token: secretToken,
      events: events || [],
      headers: headers || {},
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      webhook_endpoint: newWebhook, 
      message: 'Webhook endpoint created successfully',
      secret_token: secretToken
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateWebhookEndpoint(supabase: any, userId: string, id: string, data: any) {
  if (!id) throw new Error('Webhook endpoint ID required');

  // Don't allow updating secret token through this endpoint
  const { secret_token, ...updateData } = data;

  const { data: updated, error } = await supabase
    .from('webhook_endpoints')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  return new Response(
    JSON.stringify({ webhook_endpoint: updated, message: 'Webhook endpoint updated successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteWebhookEndpoint(supabase: any, userId: string, id: string) {
  if (!id) throw new Error('Webhook endpoint ID required');

  const { error } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ message: 'Webhook endpoint deleted successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function testWebhook(supabase: any, userId: string, id: string) {
  if (!id) throw new Error('Webhook endpoint ID required');

  const { data: webhook, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  if (!webhook) {
    throw new Error('Webhook endpoint not found');
  }

  // Send test payload
  const testPayload = {
    event_type: 'webhook.test',
    data: {
      message: 'This is a test webhook from RegIQ',
      timestamp: new Date().toISOString(),
      webhook_id: id
    },
    test: true
  };

  const deliveryResult = await deliverWebhook(webhook, testPayload);

  // Log the test delivery
  await supabase
    .from('webhook_deliveries')
    .insert({
      webhook_endpoint_id: id,
      event_type: 'webhook.test',
      payload: testPayload,
      response_status: deliveryResult.status,
      response_body: deliveryResult.response,
      status: deliveryResult.success ? 'delivered' : 'failed',
      delivered_at: deliveryResult.success ? new Date().toISOString() : null
    });

  return new Response(
    JSON.stringify({
      success: deliveryResult.success,
      message: deliveryResult.success ? 'Test webhook delivered successfully' : 'Test webhook failed',
      response_status: deliveryResult.status,
      response_body: deliveryResult.response
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getWebhookDeliveries(supabase: any, userId: string, webhookId?: string) {
  let query = supabase
    .from('webhook_deliveries')
    .select(`
      *,
      webhook_endpoints!inner(user_id, name)
    `)
    .eq('webhook_endpoints.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (webhookId) {
    query = query.eq('webhook_endpoint_id', webhookId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return new Response(
    JSON.stringify({ deliveries: data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendWebhook(supabase: any, data: any) {
  const { webhook_id, event_type, payload } = data;

  if (!webhook_id || !event_type || !payload) {
    throw new Error('webhook_id, event_type, and payload are required');
  }

  // Get webhook endpoint
  const { data: webhook, error } = await supabase
    .from('webhook_endpoints')
    .select('*')
    .eq('id', webhook_id)
    .eq('is_active', true)
    .single();

  if (error) throw error;

  if (!webhook) {
    throw new Error('Active webhook endpoint not found');
  }

  // Check if webhook is configured for this event type
  if (webhook.events.length > 0 && !webhook.events.includes(event_type)) {
    return new Response(
      JSON.stringify({ message: 'Webhook not configured for this event type' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create delivery record
  const { data: delivery, error: deliveryError } = await supabase
    .from('webhook_deliveries')
    .insert({
      webhook_endpoint_id: webhook_id,
      event_type,
      payload,
      status: 'pending'
    })
    .select()
    .single();

  if (deliveryError) throw deliveryError;

  // Deliver webhook in background
  deliverWebhookWithRetry(supabase, webhook, payload, delivery.id);

  return new Response(
    JSON.stringify({ message: 'Webhook delivery initiated', delivery_id: delivery.id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deliverWebhook(webhook: any, payload: any) {
  try {
    const headers: any = {
      'Content-Type': 'application/json',
      'User-Agent': 'RegIQ-Webhooks/1.0',
      'X-RegIQ-Delivery': crypto.randomUUID(),
      'X-RegIQ-Event': payload.event_type
    };

    // Add signature for security
    const signature = await generateWebhookSignature(JSON.stringify(payload), webhook.secret_token);
    headers['X-RegIQ-Signature'] = signature;

    // Add custom headers
    if (webhook.headers) {
      Object.assign(headers, webhook.headers);
    }

    const response = await fetch(webhook.endpoint_url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    return {
      success: response.ok,
      status: response.status,
      response: responseText
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      response: error instanceof Error ? error.message : String(error)
    };
  }
}

async function deliverWebhookWithRetry(supabase: any, webhook: any, payload: any, deliveryId: string) {
  const maxRetries = webhook.retry_config?.max_retries || 3;
  const retryDelay = webhook.retry_config?.retry_delay || 300; // seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await deliverWebhook(webhook, payload);

    await supabase
      .from('webhook_deliveries')
      .update({
        response_status: result.status,
        response_body: result.response,
        delivery_attempts: attempt,
        status: result.success ? 'delivered' : (attempt < maxRetries ? 'retrying' : 'failed'),
        delivered_at: result.success ? new Date().toISOString() : null
      })
      .eq('id', deliveryId);

    if (result.success) {
      logger.info(`Webhook delivered successfully on attempt ${attempt}`);
      return;
    }

    if (attempt < maxRetries) {
      logger.info(`Webhook delivery failed, retrying in ${retryDelay} seconds (attempt ${attempt}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
    } else {
      logger.info(`Webhook delivery failed after ${maxRetries} attempts`);
    }
  }
}

async function generateSecretToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function generateWebhookSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return `sha256=${hashHex}`;
}

function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}