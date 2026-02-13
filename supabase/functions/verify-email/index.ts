import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token");

    // Also support POST body
    if (!token && req.method === "POST") {
      const body = await req.json();
      token = body.token;
    }

    if (!token || typeof token !== "string" || token.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find token
    const { data: tokenRecord, error: tokenError } = await supabase
      .from("email_verification_tokens")
      .select("*")
      .eq("token", token.trim())
      .is("used_at", null)
      .single();

    if (tokenError || !tokenRecord) {
      return new Response(JSON.stringify({ error: "Token inválido ou já utilizado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiration
    if (new Date(tokenRecord.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Token expirado. Solicite um novo convite ao administrador." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark token as used
    await supabase
      .from("email_verification_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRecord.id);

    // Confirm email in auth
    await supabase.auth.admin.updateUserById(tokenRecord.user_id, {
      email_confirm: true,
    });

    // Activate profile
    await supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("user_id", tokenRecord.user_id);

    // Log security event
    await supabase.from("security_logs").insert({
      user_id: tokenRecord.user_id,
      action: "email_verified",
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || null,
      user_agent: req.headers.get("user-agent") || null,
    });

    return new Response(JSON.stringify({ success: true, message: "E-mail verificado com sucesso!" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("verify-email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
