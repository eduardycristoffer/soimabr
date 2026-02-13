import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOIMA_LOGO_URL = "https://untvhsyorhojoviyplax.supabase.co/storage/v1/object/public/logos/soima-logo.webp";

function emailTemplate(title: string, body: string): string {
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
        <h2 style="color:#1a1a2e;margin:0 0 16px;">${title}</h2>
        ${body}
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

export function getInviteEmailHTML(userName: string, verifyUrl: string): string {
  return emailTemplate("Bem-vindo ao Sistema SOIMA", `
    <p style="color:#3f3f46;line-height:1.6;">Olá <strong>${userName}</strong>,</p>
    <p style="color:#3f3f46;line-height:1.6;">Sua conta foi criada no Sistema SOIMA. Para ativar seu acesso, clique no botão abaixo:</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}" style="background:#2563eb;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Confirmar meu e-mail</a>
    </div>
    <p style="color:#71717a;font-size:13px;">Este link expira em 24 horas. Se você não solicitou esta conta, ignore este e-mail.</p>
    <p style="color:#71717a;font-size:12px;word-break:break-all;">Link direto: ${verifyUrl}</p>
  `);
}

export function getPasswordResetEmailHTML(resetUrl: string): string {
  return emailTemplate("Redefinição de Senha", `
    <p style="color:#3f3f46;line-height:1.6;">Você solicitou a redefinição de sua senha. Clique no botão abaixo:</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}" style="background:#2563eb;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Redefinir Senha</a>
    </div>
    <p style="color:#71717a;font-size:13px;">Se você não solicitou, ignore este e-mail.</p>
  `);
}

async function sendEmail(to: string, subject: string, html: string) {
  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_HOST")!,
      port: Number(Deno.env.get("SMTP_PORT") || "465"),
      tls: true,
      auth: {
        username: Deno.env.get("SMTP_USER")!,
        password: Deno.env.get("SMTP_PASSWORD")!,
      },
    },
  });

  try {
    await client.send({
      from: `${Deno.env.get("SMTP_FROM_NAME") || "Sistema Soima"} <${Deno.env.get("SMTP_FROM_EMAIL") || "noreply@tryade.com.br"}>`,
      to,
      subject,
      content: "auto",
      html,
    });
  } finally {
    await client.close();
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html, _service_key } = await req.json();

    // This function should only be called internally by other edge functions using service role
    // or by authenticated admin users
    if (_service_key) {
      if (_service_key !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Validate JWT - must be admin
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
    }

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "to, subject e html são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await sendEmail(to, subject, html);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
