import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sendWithRetry(
  url: string,
  headers: Record<string, string>,
  payload: any,
  retryCount: number,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; body: any }> {
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      let body: any;
      try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
      if (res.ok) return { ok: true, status: res.status, body };
      if (attempt === retryCount) return { ok: false, status: res.status, body };
    } catch (err: any) {
      if (attempt === retryCount) return { ok: false, status: 0, body: { error: err.message } };
    }
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
  }
  return { ok: false, status: 0, body: { error: "Max retries exceeded" } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { event_type, payload } = await req.json();

    if (!event_type || !payload) {
      return new Response(JSON.stringify({ error: "event_type and payload required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch active outbound webhooks for this event
    const { data: webhooks } = await supabase
      .from("outbound_webhooks")
      .select("*")
      .eq("event_type", event_type)
      .eq("is_active", true);

    const results: any[] = [];

    for (const wh of webhooks || []) {
      const headers = (wh.headers && typeof wh.headers === "object") ? wh.headers as Record<string, string> : {};
      const result = await sendWithRetry(wh.target_url, headers, payload, wh.retry_count, wh.timeout_ms);
      
      await supabase.from("webhook_logs").insert({
        direction: "outbound",
        event_type,
        endpoint: wh.target_url,
        status: result.ok ? "success" : "failed",
        http_status: result.status || null,
        payload,
        response: result.body,
      });

      results.push({ webhook_id: wh.id, ok: result.ok });
    }

    // Google Sheets integration
    try {
      const { data: sheetsConfig } = await supabase
        .from("google_sheets_config")
        .select("*")
        .limit(1)
        .single();

      if (sheetsConfig?.is_active && sheetsConfig?.apps_script_url) {
        const shouldSend =
          (sheetsConfig.trigger_on === "created" && event_type === "lead.created") ||
          (sheetsConfig.trigger_on === "stage" && event_type === "pipeline.stage_changed" && payload.stage_id === sheetsConfig.trigger_stage_id);

        if (shouldSend) {
          const mapping = sheetsConfig.field_mapping as Record<string, string> || {};
          const mappedData: Record<string, any> = {};
          for (const [sheetCol, payloadField] of Object.entries(mapping)) {
            mappedData[sheetCol] = payload[payloadField] ?? "";
          }

          const sheetResult = await sendWithRetry(
            sheetsConfig.apps_script_url,
            {},
            { spreadsheet_id: sheetsConfig.spreadsheet_id, sheet_name: sheetsConfig.sheet_name, data: mappedData },
            2,
            10000
          );

          await supabase.from("webhook_logs").insert({
            direction: "outbound",
            event_type: `sheets.${event_type}`,
            endpoint: sheetsConfig.apps_script_url,
            status: sheetResult.ok ? "success" : "failed",
            http_status: sheetResult.status || null,
            payload: mappedData,
            response: sheetResult.body,
          });
        }
      }
    } catch (sheetsErr: any) {
      console.error("Google Sheets error:", sheetsErr);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
