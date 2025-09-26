import { logger } from '@/lib/logger';

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/^\/public-api/, "") || "/";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { "x-client-info": "public-api" } } }
    );

    // Validate enterprise API key from database
    const providedApiKey = req.headers.get("x-api-key") || url.searchParams.get("api_key");
    if (!providedApiKey) {
      return new Response(JSON.stringify({ error: "Unauthorized: API key required. Enterprise subscription needed for API access." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate API key against database
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_enterprise_api_key', { api_key_input: providedApiKey });

    if (validationError) {
      logger.error("API key validation error:", validationError);
      return new Response(JSON.stringify({ error: "API validation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!validationResult || validationResult.length === 0 || !validationResult[0].is_valid) {
      return new Response(JSON.stringify({ 
        error: "Unauthorized: Invalid API key or subscription not active. Enterprise subscription required." 
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validatedUser = validationResult[0];
    logger.info(`API access granted to user: ${validatedUser.user_id}`);

    // Helpers
    const cap = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

    // GET /alerts
    if (req.method === "GET" && (pathname === "/alerts" || pathname === "/")) {
      const q = url.searchParams.get("q")?.trim();
      const source = url.searchParams.get("source"); // comma-separated
      const limitParam = parseInt(url.searchParams.get("limit") || "25", 10);
      const sinceDays = parseInt(url.searchParams.get("since") || "0", 10);
      const limit = cap(isNaN(limitParam) ? 25 : limitParam, 1, 100);

      let query = supabase.from("alerts").select("*", { head: false }).order("published_date", { ascending: false }).limit(limit);

      if (q) {
        const ilike = `%${q}%`;
        query = query.or(`title.ilike.${ilike},summary.ilike.${ilike}`);
      }
      if (source) {
        const sources = source.split(",").map((s) => s.trim()).filter(Boolean);
        if (sources.length > 0) query = query.in("source", sources);
      }
      if (!isNaN(sinceDays) && sinceDays > 0) {
        const sinceIso = new Date(Date.now() - sinceDays * 86400000).toISOString();
        query = query.gte("published_date", sinceIso);
      }

      const { data, error } = await query;
      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    // GET /alerts/:id
    const idMatch = pathname.match(/^\/alerts\/([0-9a-fA-F-]{36})$/);
    if (req.method === "GET" && idMatch) {
      const id = idMatch[1];
      const { data, error } = await supabase.from("alerts").select("*").eq("id", id).single();
      if (error) return json({ error: error.message }, 404);
      return json({ data });
    }

    // GET /search?q=...
    if (req.method === "GET" && pathname === "/search") {
      const q = url.searchParams.get("q")?.trim();
      if (!q) return json({ error: "Missing 'q' query parameter" }, 400);
      const limitParam = parseInt(url.searchParams.get("limit") || "25", 10);
      const limit = cap(isNaN(limitParam) ? 25 : limitParam, 1, 100);

      const ilike = `%${q}%`;
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .or(`title.ilike.${ilike},summary.ilike.${ilike}`)
        .order("published_date", { ascending: false })
        .limit(limit);

      if (error) return json({ error: error.message }, 500);
      return json({ data });
    }

    // Help endpoint
    if (pathname === "/help") {
      return json({
        endpoints: {
          alerts: "/functions/v1/public-api/alerts?limit=25&source=FDA,USDA&since=7",
          alertById: "/functions/v1/public-api/alerts/{uuid}",
          search: "/functions/v1/public-api/search?q=recall&limit=25",
        },
      });
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
