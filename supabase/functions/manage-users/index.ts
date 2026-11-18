import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://soima.tryade.com.br";

const SOIMA_LOGO_URL = "https://untvhsyorhojoviyplax.supabase.co/storage/v1/object/public/logos/soima-logo-white.webp";

function getInviteEmailHTML(userName: string, verifyUrl: string): string {
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
        <h2 style="color:#1a1a2e;margin:0 0 16px;">Bem-vindo ao Sistema SOIMA</h2>
        <p style="color:#3f3f46;line-height:1.6;">Olá <strong>${userName}</strong>,</p>
        <p style="color:#3f3f46;line-height:1.6;">Sua conta foi criada no Sistema SOIMA. Para ativar seu acesso, clique no botão abaixo:</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${verifyUrl}" style="background:#2563eb;color:#ffffff;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">Confirmar meu e-mail</a>
        </div>
        <p style="color:#71717a;font-size:13px;">Este link expira em 24 horas. Se você não solicitou esta conta, ignore este e-mail.</p>
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
    const body = await req.json();
    const { action, ...payload } = body;

    // Use service role for operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // complete_profile does NOT require admin auth (called by unauthenticated users during onboarding)
    if (action === "complete_profile") {
      const { user_id, name, password } = payload;
      if (!user_id || !name || !password) {
        return new Response(JSON.stringify({ error: "user_id, name e password são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (name.trim().length < 2) {
        return new Response(JSON.stringify({ error: "Nome deve ter pelo menos 2 caracteres" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (password.length < 6) {
        return new Response(JSON.stringify({ error: "Senha deve ter pelo menos 6 caracteres" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profileCheck } = await supabase
        .from("profiles")
        .select("must_complete_profile")
        .eq("user_id", user_id)
        .single();

      if (!profileCheck?.must_complete_profile) {
        return new Response(JSON.stringify({ error: "Perfil já foi completado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name: name.trim(), must_complete_profile: false })
        .eq("user_id", user_id);

      if (profileError) {
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: authError } = await supabase.auth.admin.updateUserById(user_id, {
        password,
        user_metadata: { name: name.trim(), must_set_password: false },
      });

      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("security_logs").insert({
        user_id,
        action: "profile_completed",
        ip_address: req.headers.get("x-forwarded-for") || null,
        user_agent: req.headers.get("user-agent") || null,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // update_own_profile requires authentication but NOT admin
    if (action === "update_own_profile") {
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

      const userId = claimsData.claims.sub;
      const { name, current_password, new_password } = payload;

      // Update name
      if (name && typeof name === "string") {
        if (name.trim().length < 2) {
          return new Response(JSON.stringify({ error: "Nome deve ter pelo menos 2 caracteres" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase
          .from("profiles")
          .update({ name: name.trim() })
          .eq("user_id", userId);

        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { name: name.trim() },
        });
      }

      // Update password
      if (current_password && new_password) {
        if (new_password.length < 6) {
          return new Response(JSON.stringify({ error: "Nova senha deve ter pelo menos 6 caracteres" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get user email for validation
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", userId)
          .single();

        if (!profile) {
          return new Response(JSON.stringify({ error: "Perfil não encontrado" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Validate current password via temporary signIn
        const tempClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!
        );
        const { error: signInError } = await tempClient.auth.signInWithPassword({
          email: profile.email,
          password: current_password,
        });

        if (signInError) {
          return new Response(JSON.stringify({ error: "Senha atual incorreta" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Sign out temporary session
        await tempClient.auth.signOut();

        // Update password via admin
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          password: new_password,
        });

        if (updateError) {
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      await supabase.from("security_logs").insert({
        user_id: userId,
        action: name ? "profile_name_updated" : "password_changed",
        ip_address: req.headers.get("x-forwarded-for") || null,
        user_agent: req.headers.get("user-agent") || null,
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require admin authentication
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

    // Verify caller is admin
    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Apenas administradores podem gerenciar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (action) {
      case "create_user": {
        const { email } = payload;
        if (!email) {
          return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Generate temporary password and use email prefix as temporary name
        const tempPassword = crypto.randomUUID();
        const tempName = email.split("@")[0];

        // Role is always operator for new users - never trust frontend
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: false, // Require email verification
          user_metadata: { name: tempName, must_set_password: true },
        });

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (newUser.user) {
          // Set profile as inactive and mark must_complete_profile
          await supabase
            .from("profiles")
            .update({ is_active: false, must_complete_profile: true })
            .eq("user_id", newUser.user.id);

          // Generate verification token
          const { data: tokenData } = await supabase
            .from("email_verification_tokens")
            .insert({
              user_id: newUser.user.id,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            })
            .select("token")
            .single();

          if (tokenData) {
            const verifyUrl = `${APP_URL}/auth/verify?token=${tokenData.token}`;
            const html = getInviteEmailHTML(tempName, verifyUrl);

            // Send invite email
            try {
              await supabase.functions.invoke("send-email", {
                body: {
                  to: email,
                  subject: "Confirme seu e-mail - Sistema SOIMA",
                  html,
                  _service_key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
                },
              });
            } catch (emailErr: any) {
              console.error("Error sending invite email:", emailErr);
            }
          }

          // Log security event
          await supabase.from("security_logs").insert({
            user_id: callerUserId,
            action: "user_created",
            metadata: { target_user_id: newUser.user.id, target_email: email },
            ip_address: req.headers.get("x-forwarded-for") || null,
            user_agent: req.headers.get("user-agent") || null,
          });
        }

        return new Response(JSON.stringify({ success: true, user_id: newUser.user?.id }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "delete_user": {
        const { user_id } = payload;
        if (!user_id) {
          return new Response(JSON.stringify({ error: "user_id é obrigatório" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check that user is inactive
        const { data: targetProfile } = await supabase
          .from("profiles")
          .select("is_active")
          .eq("user_id", user_id)
          .single();

        if (!targetProfile) {
          return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (targetProfile.is_active) {
          return new Response(JSON.stringify({ error: "Apenas usuários inativos (convite pendente) podem ser excluídos" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Remove verification tokens
        await supabase
          .from("email_verification_tokens")
          .delete()
          .eq("user_id", user_id);

        // Remove OTP codes
        await supabase
          .from("login_otp_codes")
          .delete()
          .eq("user_id", user_id);

        // Remove user_roles
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user_id);

        // Remove profile
        await supabase
          .from("profiles")
          .delete()
          .eq("user_id", user_id);

        // Delete auth user
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user_id);
        if (deleteError) {
          return new Response(JSON.stringify({ error: deleteError.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Log security event
        await supabase.from("security_logs").insert({
          user_id: callerUserId,
          action: "user_deleted",
          metadata: { target_user_id: user_id },
          ip_address: req.headers.get("x-forwarded-for") || null,
          user_agent: req.headers.get("user-agent") || null,
        });

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }



      case "update_role": {
        const { user_id, role } = payload;
        if (!user_id || !role) {
          return new Response(JSON.stringify({ error: "user_id e role são obrigatórios" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Validate role value
        if (!["admin", "operator"].includes(role)) {
          return new Response(JSON.stringify({ error: "Role inválida" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (user_id === callerUserId && role !== "admin") {
          return new Response(JSON.stringify({ error: "Você não pode remover seu próprio acesso de administrador" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("user_id", user_id);

        if (roleError) {
          return new Response(JSON.stringify({ error: roleError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Log
        await supabase.from("security_logs").insert({
          user_id: callerUserId,
          action: "role_changed",
          metadata: { target_user_id: user_id, new_role: role },
          ip_address: req.headers.get("x-forwarded-for") || null,
          user_agent: req.headers.get("user-agent") || null,
        });

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "toggle_active": {
        const { user_id, is_active } = payload;
        if (!user_id || typeof is_active !== "boolean") {
          return new Response(JSON.stringify({ error: "user_id e is_active são obrigatórios" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (user_id === callerUserId && !is_active) {
          return new Response(JSON.stringify({ error: "Você não pode desativar sua própria conta" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: profileError } = await supabase
          .from("profiles")
          .update({ is_active })
          .eq("user_id", user_id);

        if (profileError) {
          return new Response(JSON.stringify({ error: profileError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!is_active) {
          await supabase.auth.admin.updateUserById(user_id, { ban_duration: "876600h" });
        } else {
          await supabase.auth.admin.updateUserById(user_id, { ban_duration: "none" });
        }

        // Log
        await supabase.from("security_logs").insert({
          user_id: callerUserId,
          action: is_active ? "user_activated" : "user_deactivated",
          metadata: { target_user_id: user_id },
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
