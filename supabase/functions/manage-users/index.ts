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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate caller is admin
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

    // Use service role for admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    const { action, ...payload } = await req.json();

    switch (action) {
      case "create_user": {
        const { email, password, name, role } = payload;
        if (!email || !password || !name) {
          return new Response(JSON.stringify({ error: "Email, senha e nome são obrigatórios" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Create user via admin API (auto-confirms email)
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name },
        });

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update role if admin was selected (trigger creates 'operator' by default)
        if (role === "admin" && newUser.user) {
          await supabase
            .from("user_roles")
            .update({ role: "admin" })
            .eq("user_id", newUser.user.id);
        }

        return new Response(JSON.stringify({ success: true, user_id: newUser.user?.id }), {
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

        // Prevent admin from removing their own admin role
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

        // Prevent self-deactivation
        if (user_id === callerUserId && !is_active) {
          return new Response(JSON.stringify({ error: "Você não pode desativar sua própria conta" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Update profile
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

        // Ban/unban in auth
        if (!is_active) {
          await supabase.auth.admin.updateUserById(user_id, { ban_duration: "876600h" }); // ~100 years
        } else {
          await supabase.auth.admin.updateUserById(user_id, { ban_duration: "none" });
        }

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
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
