import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOIMA_LOGO_URL = "https://untvhsyorhojoviyplax.supabase.co/storage/v1/object/public/logos/soima-logo-white.webp";

function getOtpEmailHTML(code: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:#1a1a2e;padding:32px;text-align:center;">
        <img src="${SOIMA_LOGO_URL}" alt="SOIMA" height="56" style="height:56px;" />
      </td></tr>
      <tr><td style="padding:32px;">
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Código de Acesso</h2>
        <p style="color:#3f3f46;line-height:1.6;">Use o código abaixo para completar seu login:</p>
        <div style="text-align:center;margin:32px 0;">
          <div style="display:inline-block;background:#f4f4f5;padding:16px 40px;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a1a2e;">${code}</div>
        </div>
        <p style="color:#71717a;font-size:13px;">Este código expira em <strong>5 minutos</strong>. Se você não tentou fazer login, ignore este e-mail.</p>
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
    const { action, ...payload } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (action) {
      case "generate": {
        const { user_id } = payload;
        if (!user_id) {
          return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get user email
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, name")
          .eq("user_id", user_id)
          .single();

        if (!profile) {
          return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Invalidate old unused codes
        await supabase
          .from("login_otp_codes")
          .update({ used_at: new Date().toISOString() })
          .eq("user_id", user_id)
          .is("used_at", null);

        // Generate 6-digit code
        const code = String(Math.floor(100000 + Math.random() * 900000));

        // Save code
        const { error: insertError } = await supabase
          .from("login_otp_codes")
          .insert({
            user_id,
            code,
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          });

        if (insertError) {
          return new Response(JSON.stringify({ error: insertError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Send email via send-email function
        const html = getOtpEmailHTML(code);
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              to: profile.email,
              subject: "Código de acesso - Sistema SOIMA",
              html,
              _service_key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
            },
          });
        } catch (emailErr: any) {
          console.error("Error sending OTP email:", emailErr);
          return new Response(JSON.stringify({ error: "Erro ao enviar e-mail com o código" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Log
        await supabase.from("security_logs").insert({
          user_id,
          action: "otp_generated",
          ip_address: req.headers.get("x-forwarded-for") || null,
          user_agent: req.headers.get("user-agent") || null,
        });

        return new Response(JSON.stringify({ success: true, email: profile.email }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "verify": {
        const { user_id, code } = payload;
        if (!user_id || !code) {
          return new Response(JSON.stringify({ error: "user_id e code são obrigatórios" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Find valid code
        const { data: otpRecord, error: otpError } = await supabase
          .from("login_otp_codes")
          .select("*")
          .eq("user_id", user_id)
          .eq("code", code)
          .is("used_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (otpError || !otpRecord) {
          await supabase.from("security_logs").insert({
            user_id,
            action: "otp_failed",
            ip_address: req.headers.get("x-forwarded-for") || null,
            user_agent: req.headers.get("user-agent") || null,
          });

          return new Response(JSON.stringify({ error: "Código inválido" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check expiration
        if (new Date(otpRecord.expires_at) < new Date()) {
          return new Response(JSON.stringify({ error: "Código expirado. Solicite um novo." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Mark as used
        await supabase
          .from("login_otp_codes")
          .update({ used_at: new Date().toISOString() })
          .eq("id", otpRecord.id);

        // Log
        await supabase.from("security_logs").insert({
          user_id,
          action: "otp_verified",
          ip_address: req.headers.get("x-forwarded-for") || null,
          user_agent: req.headers.get("user-agent") || null,
        });

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Ação inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error: any) {
    console.error("login-otp error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
