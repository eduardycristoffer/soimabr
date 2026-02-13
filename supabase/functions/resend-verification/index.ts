import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOIMA_LOGO_URL = "https://untvhsyorhojoviyplax.supabase.co/storage/v1/object/public/logos/soima-logo.webp";
const APP_URL = "https://soimabr.lovable.app";

function getInviteEmailHTML(userName: string, verifyUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:#1a1a2e;padding:24px;text-align:center;">
        <img src="${SOIMA_LOGO_URL}" alt="SOIMA" height="40" style="height:40px;" />
      </td></tr>
      <tr><td style="padding:32px;">
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Bem-vindo ao Sistema SOIMA</h2>
        <p style="color:#3f3f46;line-height:1.6;">Olá <strong>${userName}</strong>,</p>
        <p style="color:#3f3f46;line-height:1.6;">Sua conta foi criada no Sistema SOIMA. Para ativar seu acesso, clique no botão abaixo:</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${verifyUrl}" style="background:#2563eb;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Confirmar meu e-mail</a>
        </div>
        <p style="color:#71717a;font-size:13px;">Este link expira em 24 horas.</p>
        <p style="color:#71717a;font-size:12px;word-break:break-all;">Link direto: ${verifyUrl}</p>
      </td></tr>
      <tr><td style="background:#f4f4f5;padding:16px;text-align:center;font-size:12px;color:#71717a;">
        Sistema SOIMA &bull; Este é um e-mail automático, não responda.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate admin JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = claimsData.claims.sub;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Apenas administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: check last token created for this user
    const { data: recentToken } = await supabase
      .from("email_verification_tokens")
      .select("created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (recentToken) {
      const lastSent = new Date(recentToken.created_at);
      const now = new Date();
      if (now.getTime() - lastSent.getTime() < 60000) {
        return new Response(JSON.stringify({ error: "Aguarde 1 minuto antes de reenviar" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("user_id", user_id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new token
    const { data: newToken } = await supabase
      .from("email_verification_tokens")
      .insert({
        user_id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("token")
      .single();

    if (!newToken) {
      return new Response(JSON.stringify({ error: "Erro ao gerar token" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyUrl = `${APP_URL}/auth/verify?token=${newToken.token}`;
    const html = getInviteEmailHTML(profile.name, verifyUrl);

    // Send email via send-email function
    const { error: emailError } = await supabase.functions.invoke("send-email", {
      body: {
        to: profile.email,
        subject: "Confirme seu e-mail - Sistema SOIMA",
        html,
        _service_key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      },
    });

    if (emailError) throw emailError;

    // Log
    await supabase.from("security_logs").insert({
      user_id: callerUserId,
      action: "verification_resent",
      metadata: { target_user_id: user_id, target_email: profile.email },
      ip_address: req.headers.get("x-forwarded-for") || null,
      user_agent: req.headers.get("user-agent") || null,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("resend-verification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
