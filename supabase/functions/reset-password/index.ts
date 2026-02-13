import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://soima.tryade.com.br";

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
      case "request": {
        const { email } = payload;
        if (!email || typeof email !== "string") {
          return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Find user by email in profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, is_active, name")
          .eq("email", email.trim().toLowerCase())
          .single();

        // Always return success to avoid email enumeration
        if (!profile || !profile.is_active) {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Rate limit: 1 request per minute
        const { data: recentToken } = await supabase
          .from("password_reset_tokens")
          .select("created_at")
          .eq("user_id", profile.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentToken) {
          const lastSent = new Date(recentToken.created_at);
          if (Date.now() - lastSent.getTime() < 60000) {
            return new Response(JSON.stringify({ success: true }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        // Invalidate old tokens
        await supabase
          .from("password_reset_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("user_id", profile.user_id)
          .is("used_at", null);

        // Create new token
        const { data: tokenData } = await supabase
          .from("password_reset_tokens")
          .insert({
            user_id: profile.user_id,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
          })
          .select("token")
          .single();

        if (!tokenData) {
          return new Response(JSON.stringify({ error: "Erro ao gerar token" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const resetUrl = `${APP_URL}/auth/reset-password?token=${tokenData.token}`;

        // Use send-email function with getPasswordResetEmailHTML template
        // We inline the template here to avoid cross-function imports
        const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr><td style="background:#1a1a2e;padding:32px;text-align:center;">
        <img src="https://untvhsyorhojoviyplax.supabase.co/storage/v1/object/public/logos/soima-logo-white.webp" alt="SOIMA" height="56" style="height:56px;" />
      </td></tr>
      <tr><td style="padding:32px;">
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Redefinição de Senha</h2>
        <p style="color:#3f3f46;line-height:1.6;">Olá <strong>${profile.name}</strong>,</p>
        <p style="color:#3f3f46;line-height:1.6;">Você solicitou a redefinição de sua senha. Clique no botão abaixo:</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${resetUrl}" style="background:#2563eb;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Redefinir Senha</a>
        </div>
        <p style="color:#71717a;font-size:13px;">Este link expira em 1 hora. Se você não solicitou, ignore este e-mail.</p>
        <p style="color:#71717a;font-size:12px;word-break:break-all;">Link direto: ${resetUrl}</p>
      </td></tr>
      <tr><td style="background:#f4f4f5;padding:16px;text-align:center;font-size:12px;color:#71717a;">
        Sistema SOIMA &bull; Este é um e-mail automático, não responda.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

        try {
          await supabase.functions.invoke("send-email", {
            body: {
              to: email.trim(),
              subject: "Redefinição de Senha - Sistema SOIMA",
              html,
              _service_key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
            },
          });
        } catch (emailErr: any) {
          console.error("Error sending reset email:", emailErr);
        }

        // Log
        await supabase.from("security_logs").insert({
          user_id: profile.user_id,
          action: "password_reset_requested",
          ip_address: req.headers.get("x-forwarded-for") || null,
          user_agent: req.headers.get("user-agent") || null,
        });

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reset": {
        const { token, new_password } = payload;
        if (!token || !new_password) {
          return new Response(JSON.stringify({ error: "Token e nova senha são obrigatórios" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (new_password.length < 6) {
          return new Response(JSON.stringify({ error: "Senha deve ter pelo menos 6 caracteres" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Find token
        const { data: tokenRecord, error: tokenError } = await supabase
          .from("password_reset_tokens")
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
          return new Response(JSON.stringify({ error: "Token expirado. Solicite uma nova redefinição." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Mark token as used
        await supabase
          .from("password_reset_tokens")
          .update({ used_at: new Date().toISOString() })
          .eq("id", tokenRecord.id);

        // Update password
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          tokenRecord.user_id,
          { password: new_password }
        );

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Log
        await supabase.from("security_logs").insert({
          user_id: tokenRecord.user_id,
          action: "password_reset_completed",
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
    console.error("reset-password error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
