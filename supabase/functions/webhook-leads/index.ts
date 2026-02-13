import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { name, email, phone, company_name, source, metadata } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Campo 'name' é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find "Novo Lead" stage (stage_type = 'lead', order_index = 1)
    const { data: stage, error: stageErr } = await supabase
      .from("pipeline_stages")
      .select("id")
      .eq("stage_type", "lead")
      .eq("order_index", 1)
      .single();

    if (stageErr || !stage) {
      return new Response(
        JSON.stringify({ error: "Etapa 'Novo Lead' não encontrada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find first admin to assign as owner
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .single();

    const ownerId = adminRole?.user_id;
    if (!ownerId) {
      return new Response(
        JSON.stringify({ error: "Nenhum administrador encontrado para atribuir o lead" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .insert({
        title: name.trim(),
        contact_name: name.trim(),
        contact_email: email || null,
        contact_phone: phone || null,
        company_name: company_name || null,
        source: "webhook",
        lead_origin: source === "indicacao" ? "indicacao" : "marketing",
        metadata: metadata || null,
        owner_id: ownerId,
        stage_id: stage.id,
      })
      .select("id")
      .single();

    if (leadErr) {
      return new Response(
        JSON.stringify({ error: leadErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record history
    await supabase.from("lead_histories").insert({
      lead_id: lead.id,
      user_id: ownerId,
      to_stage_id: stage.id,
      action: "CREATED",
      notes: "Lead criado via webhook",
    });

    await supabase.from("pipeline_history").insert({
      lead_id: lead.id,
      to_stage_id: stage.id,
      moved_by: ownerId,
      notes: "Lead criado via webhook",
    });

    return new Response(
      JSON.stringify({ success: true, lead_id: lead.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
