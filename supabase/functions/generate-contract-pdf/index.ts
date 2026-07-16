import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SOIMA_LOGO_URL =
  "https://untvhsyorhojoviyplax.supabase.co/storage/v1/object/public/logos/soima-logo.webp";

function esc(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Minimal markdown → HTML (bold, italics, lists, paragraphs)
function md(input: string): string {
  const safe = esc(input);
  const lines = safe.split("\n");
  const out: string[] = [];
  let inList = false;
  for (let raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*-\s+/.test(line)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push("<li>" + line.replace(/^\s*-\s+/, "") + "</li>");
    } else {
      if (inList) { out.push("</ul>"); inList = false; }
      if (!line) out.push("");
      else out.push("<p>" + line + "</p>");
    }
  }
  if (inList) out.push("</ul>");
  let html = out.join("\n");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/_([^_\n]+)_/g, "<em>$1</em>");
  return html;
}

function buildHTML(contract: any, snapshots: any[], company: any) {
  const clausesHtml = snapshots
    .sort((a, b) => a.order_index - b.order_index)
    .map((c, idx) => {
      const num = idx === 0 ? "" : `${idx}. `;
      return `
      <section class="clause">
        <h2>${num}${esc(c.title)}</h2>
        <div class="clause-body">${md(c.body)}</div>
      </section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8"/>
<title>${esc(contract.contract_number)}</title>
<style>
  @page { size: A4; margin: 22mm 18mm 20mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; font-size: 11pt; line-height: 1.55; margin: 0; }
  header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 20px; }
  header img { height: 44px; }
  header .meta { text-align: right; font-size: 9pt; color: #555; }
  h1.doc-title { font-size: 18pt; color: #1e40af; margin: 10px 0 4px; }
  .subtitle { color: #555; font-size: 10pt; margin-bottom: 24px; }
  section.clause { margin-bottom: 18px; page-break-inside: avoid; }
  section.clause h2 { font-size: 12pt; color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin: 0 0 8px; }
  .clause-body p { margin: 4px 0; text-align: justify; }
  .clause-body ul { margin: 4px 0 4px 22px; }
  .clause-body li { margin: 2px 0; }
  footer { position: fixed; bottom: 8mm; left: 18mm; right: 18mm; text-align: center; font-size: 8pt; color: #888; border-top: 1px solid #eee; padding-top: 4px; }
  .print-btn { position: fixed; top: 12px; right: 12px; padding: 10px 16px; background: #1e40af; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
  @media print { .print-btn { display: none; } }
</style>
</head><body>
<button class="print-btn" onclick="window.print()">Imprimir / Salvar PDF</button>
<header>
  <img src="${SOIMA_LOGO_URL}" alt="SOIMA"/>
  <div class="meta">
    <div><strong>${esc(contract.contract_number)}</strong></div>
    <div>Emitido em ${new Date(contract.generated_at || contract.created_at).toLocaleDateString("pt-BR")}</div>
    <div>${esc(company?.razao_social || "")}</div>
  </div>
</header>

<h1 class="doc-title">Contrato</h1>
<div class="subtitle">Nº ${esc(contract.contract_number)}</div>

${clausesHtml}

<footer>${esc(company?.razao_social || "")} · ${esc(company?.cnpj || "")} · ${esc(company?.email || "")}</footer>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { contractId } = await req.json();
    if (!contractId) {
      return new Response(JSON.stringify({ error: "contractId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: contract, error: cErr } = await admin
      .from("contracts").select("*").eq("id", contractId).single();
    if (cErr || !contract) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: snapshots } = await admin
      .from("contract_clause_snapshots")
      .select("*")
      .eq("contract_id", contractId)
      .order("order_index");

    const { data: company } = await admin
      .from("company_settings").select("*").limit(1).single();

    const html = buildHTML(contract, snapshots || [], company);

    // Mark generated_at
    await admin.from("contracts").update({ generated_at: new Date().toISOString() }).eq("id", contractId);

    return new Response(JSON.stringify({ html, contract_number: contract.contract_number }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
