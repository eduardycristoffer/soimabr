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

function getItemProduct(item: any): any {
  return item?.products || item?.product || item?.product_data || {};
}

function getCommercialDescription(item: any): string {
  const product = getItemProduct(item);
  return String(product.descricao || item.descricao || item.description || "").trim();
}

function getTechnicalDescription(item: any): string {
  const product = getItemProduct(item);
  return String(
    product.descricao_tecnica ||
      item.descricao_tecnica ||
      item.technical_description ||
      "",
  ).trim();
}

function descriptionLinesForItem(item: any): string {
  const commercial = getCommercialDescription(item);
  const technical = getTechnicalDescription(item);
  return [
    commercial ? `<div class="item-commercial-desc"><strong>Descrição:</strong> ${esc(commercial)}</div>` : "",
    technical ? `<div class="item-tech-desc"><strong>Descrição técnica:</strong> ${esc(technical)}</div>` : "",
  ].filter(Boolean).join("");
}

function textDescriptionsForItem(item: any): string[] {
  const commercial = getCommercialDescription(item);
  const technical = getTechnicalDescription(item);
  return [
    commercial ? `descrição: ${commercial}` : "",
    technical ? `descrição técnica: ${technical}` : "",
  ].filter(Boolean);
}

// Minimal markdown → HTML (bold, italics, lists, paragraphs).
// Preserves raw HTML blocks wrapped in %%HTML%%...%%/HTML%% sentinels
// (used by contract placeholders like itens_inclusos_tabela).
function md(input: string): string {
  const HTML_RX = /%%HTML%%([\s\S]*?)%%\/HTML%%/g;
  const blocks: string[] = [];
  const withPlaceholders = (input || "").replace(HTML_RX, (_, html) => {
    blocks.push(html);
    return `\u0000HTMLBLOCK${blocks.length - 1}\u0000`;
  });

  const safe = esc(withPlaceholders);
  const lines = safe.split("\n");
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*-\s+/.test(line)) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push("<li>" + line.replace(/^\s*-\s+/, "") + "</li>");
    } else if (/\u0000HTMLBLOCK\d+\u0000/.test(line)) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(line);
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
  // Reinsert raw HTML blocks unescaped
  html = html.replace(/\u0000HTMLBLOCK(\d+)\u0000/g, (_, i) => blocks[Number(i)] || "");
  return html;
}

function signatureBlock(label: string, name: string, cpf?: string, rg?: string, cargo?: string) {
  const meta = [
    name ? `<strong>${esc(name)}</strong>` : "",
    cargo ? esc(cargo) : "",
    cpf ? `CPF: ${esc(cpf)}` : "",
    rg ? `RG: ${esc(rg)}` : "",
  ].filter(Boolean).join("<br/>");
  return `
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-role">${esc(label)}</div>
      <div class="sig-meta">${meta}</div>
    </div>`;
}

function witnessBlock(w: any, idx: number) {
  const meta = [
    w.name ? `<strong>${esc(w.name)}</strong>` : "",
    w.cpf ? `CPF: ${esc(w.cpf)}` : "",
    w.email ? `E-mail: ${esc(w.email)}` : "",
  ].filter(Boolean).join("<br/>");
  return `
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-role">Testemunha ${idx + 1}</div>
      <div class="sig-meta">${meta}</div>
    </div>`;
}

const CAT_LABEL: Record<string, string> = {
  grua: "Grua", configuracao: "Configuração", torre: "Torre", tramo: "Tramo",
  chassis: "Chassis", acessorio: "Acessório", servico: "Serviço",
  montagem: "Montagem", frete: "Frete", transporte: "Transporte",
  operador: "Operador", manutencao: "Manutenção",
};
const CAT_ORDER = ["grua","configuracao","torre","tramo","chassis","acessorio","servico","montagem","frete","transporte","operador","manutencao"];

function buildScopeTable(items: any[]): string {
  if (!items || !items.length) return "";
  const groups = new Map<string, any[]>();
  for (const it of items) {
    const cat = String(it.product_category || "outros").toLowerCase();
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(it);
  }
  const cats = [...CAT_ORDER.filter(c => groups.has(c)), ...Array.from(groups.keys()).filter(c => !CAT_ORDER.includes(c))];
  let idx = 0;
  const rows: string[] = [];
  for (const cat of cats) {
    rows.push(`<tr class="cat-row"><td colspan="4">${esc(CAT_LABEL[cat] || "Outros")}</td></tr>`);
    for (const it of groups.get(cat)!) {
      idx += 1;
      const specs: string[] = [];
      if (cat === "grua") {
        if (it.grua_lanca_m != null) specs.push(`Lança: ${it.grua_lanca_m} m`);
        if (it.grua_altura_torre_m != null) specs.push(`Altura torre: ${it.grua_altura_torre_m} m`);
        if (it.grua_carga_maxima_kg != null) specs.push(`Carga máx: ${it.grua_carga_maxima_kg} kg`);
        if (it.grua_carga_ponta_kg != null) specs.push(`Carga ponta: ${it.grua_carga_ponta_kg} kg`);
      }
      const specsHtml = specs.length ? `<div class="item-specs">${esc(specs.join(" · "))}</div>` : "";
      const notes = it.notes ? `<div class="item-notes">${esc(it.notes)}</div>` : "";
      rows.push(
        `<tr><td class="c-idx">${idx}</td><td class="c-cod">${esc(it.product_code || "")}</td>` +
        `<td class="c-desc"><strong>${esc(it.product_name || "")}</strong>${descriptionLinesForItem(it)}${specsHtml}${notes}</td>` +
        `<td class="c-qtd">${it.quantity ?? 1}</td></tr>`
      );
    }
  }
  return `<table class="scope-table"><thead><tr><th class="c-idx">#</th><th class="c-cod">Código</th><th class="c-desc">Descrição</th><th class="c-qtd">Qtd</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function buildScopeExtenso(items: any[]): string {
  if (!items || !items.length) return "";
  return items.map((i) => {
    const qty = Number(i.quantity || 1);
    const qtyStr = String(qty).padStart(2, "0");
    const code = i.product_code ? ` (código ${i.product_code})` : "";
    const details = [...textDescriptionsForItem(i), i.notes ? `observações: ${i.notes}` : ""];
    const detailsText = details.length ? `, com ${details.join(", ")}` : "";
    return `${qtyStr} × ${i.product_name}${code}${detailsText}`;
  }).join("; ");
}

function buildGruaSpecsExtenso(quote: any, items: any[]): string {
  const grua = (items || []).find((i: any) => String(i.product_category || "").toLowerCase() === "grua");
  const techDesc = grua ? getTechnicalDescription(grua) : "";
  const parts: string[] = [];
  const add = (label: string, value: any, unit: string) => {
    if (value == null || value === "") return;
    parts.push(`${label} de ${value} ${unit}`);
  };
  add("lança", grua?.grua_lanca_m ?? quote?.grua_lanca_m, "metros");
  add("altura de torre", grua?.grua_altura_torre_m ?? quote?.grua_altura_torre_m, "metros");
  add("altura de trabalho", grua?.grua_altura_trabalho_m ?? quote?.grua_altura_trabalho_m, "metros");
  add("carga máxima", grua?.grua_carga_maxima_kg ?? quote?.grua_carga_maxima_kg, "quilogramas");
  add("carga na ponta", grua?.grua_carga_ponta_kg ?? quote?.grua_carga_ponta_kg, "quilogramas");
  if (techDesc) parts.push(`descrição técnica: ${techDesc}`);
  return parts.length ? parts.join(", ") : "conforme especificações técnicas anexas";
}

function buildHTML(contract: any, snapshots: any[], company: any, signatories: any[], witnesses: any[], quote: any, items: any[]) {
  const scopeTableHtml = buildScopeTable(items);
  const scopeExtenso = buildScopeExtenso(items);
  const gruaSpecsExtenso = buildGruaSpecsExtenso(quote, items);

  const replaceScopeTokens = (body: string): string => {
    if (!body) return body;
    return body
      .replace(/\{\{\s*itens_inclusos_tabela\s*\}\}/gi, scopeTableHtml ? `%%HTML%%${scopeTableHtml}%%/HTML%%` : "")
      .replace(/\{\{\s*itens_inclusos_extenso\s*\}\}/gi, scopeExtenso)
      .replace(/\{\{\s*especificacoes_grua_extenso\s*\}\}/gi, gruaSpecsExtenso);
  };

  const refreshExistingScopeTable = (body: string): string => {
    if (!body || !scopeTableHtml) return body;
    const freshBlock = `%%HTML%%${scopeTableHtml}%%/HTML%%`;
    return body
      .replace(/%%HTML%%\s*<table\b[^>]*class=["'][^"']*\bscope-table\b[^"']*["'][\s\S]*?<\/table>\s*%%\/HTML%%/gi, freshBlock)
      .replace(/<table\b[^>]*class=["'][^"']*\bscope-table\b[^"']*["'][\s\S]*?<\/table>/gi, scopeTableHtml);
  };

  const prepareClauseBody = (body: string): string => replaceScopeTokens(refreshExistingScopeTable(body));

  const sortedSnaps = [...snapshots].sort((a, b) => a.order_index - b.order_index);
  const snapshotHasScope = sortedSnaps.some(c => /scope-table|itens_inclusos_tabela|ITENS INCLUSOS|ITENS DA PROPOSTA/i.test(c.body || ""));

  const clausesHtml = sortedSnaps
    .map((c, idx) => {
      const num = idx === 0 ? "" : `${idx}. `;
      return `
      <section class="clause">
        <h2>${num}${esc(c.title)}</h2>
        <div class="clause-body">${md(prepareClauseBody(c.body))}</div>
      </section>`;
    })
    .join("\n");

  // Always inject a fresh "ESCOPO / ITENS INCLUSOS" section from live quote data
  // so old contracts (with stale snapshots) still show the complete scope.
  const liveScopeSection = scopeTableHtml
    ? `<section class="clause">
        <h2>ESCOPO — ITENS INCLUSOS</h2>
        <div class="clause-body">
          ${scopeTableHtml}
          ${scopeExtenso ? `<p><strong>Descrição:</strong> ${esc(scopeExtenso)}.</p>` : ""}
          ${gruaSpecsExtenso ? `<p><strong>Especificações técnicas da grua:</strong> ${esc(gruaSpecsExtenso)}.</p>` : ""}
        </div>
      </section>`
    : "";

  const sellers = signatories.filter((s) => s.side === "seller");
  const buyers = signatories.filter((s) => s.side === "buyer");

  // Fallback to legacy single-rep fields if no signatories rows exist
  const sellerBlocks = sellers.length
    ? sellers.map((s) => signatureBlock("Pela VENDEDORA", s.name, s.cpf, s.rg, s.cargo)).join("")
    : (contract.seller_rep_name
        ? signatureBlock("Pela VENDEDORA", contract.seller_rep_name, contract.seller_rep_cpf, contract.seller_rep_rg, contract.seller_rep_cargo)
        : "");
  const buyerBlocks = buyers.length
    ? buyers.map((s) => signatureBlock("Pela COMPRADORA", s.name, s.cpf, s.rg, s.cargo)).join("")
    : (contract.buyer_rep_name
        ? signatureBlock("Pela COMPRADORA", contract.buyer_rep_name, contract.buyer_rep_cpf, contract.buyer_rep_rg, contract.buyer_rep_cargo)
        : "");

  const witnessBlocks = witnesses.length
    ? witnesses.map((w, i) => witnessBlock(w, i)).join("")
    : "";

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
  table.scope-table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; font-size: 9.5pt; }
  table.scope-table thead th { background: #1e40af; color: #fff; text-align: left; padding: 6px 8px; font-weight: 600; }
  table.scope-table thead th.c-idx, table.scope-table td.c-idx { width: 28px; text-align: center; }
  table.scope-table thead th.c-cod, table.scope-table td.c-cod { width: 90px; }
  table.scope-table thead th.c-qtd, table.scope-table td.c-qtd { width: 44px; text-align: center; }
  table.scope-table td { border-bottom: 1px solid #e5e7eb; padding: 6px 8px; vertical-align: top; }
  table.scope-table td.c-desc { text-align: justify; }
  table.scope-table tr.cat-row td { background: #f1f5f9; font-weight: 700; color: #1e40af; text-transform: uppercase; font-size: 8.5pt; letter-spacing: 0.03em; padding: 4px 8px; }
  table.scope-table .item-specs { color: #475569; font-size: 8.5pt; margin-top: 2px; }
  table.scope-table .item-notes { color: #475569; font-size: 8.5pt; margin-top: 3px; font-style: italic; }
  table.scope-table .item-commercial-desc, table.scope-table .item-tech-desc { color: #475569; font-size: 8.5pt; margin-top: 3px; white-space: pre-wrap; }
  .sig-section { margin-top: 32px; page-break-inside: avoid; }
  .sig-section h3 { font-size: 11pt; color: #1e40af; margin: 0 0 12px; }
  .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px 28px; }
  .sig-block { margin-top: 34px; }
  .sig-line { border-top: 1px solid #333; height: 0; margin-bottom: 6px; }
  .sig-role { font-size: 9pt; font-weight: 600; color: #444; }
  .sig-meta { font-size: 9pt; color: #333; margin-top: 2px; }
  footer { text-align: center; font-size: 8pt; color: #888; border-top: 1px solid #eee; padding-top: 4px; margin-top: 30px; }
</style>
</head><body>

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

${snapshotHasScope ? "" : liveScopeSection}

<section class="sig-section">
  <h3>Assinaturas</h3>
  <div class="sig-grid">
    ${sellerBlocks}
    ${buyerBlocks}
  </div>
  ${witnessBlocks ? `<h3 style="margin-top:24px">Testemunhas</h3><div class="sig-grid">${witnessBlocks}</div>` : ""}
</section>

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

    const { data: signatories } = await admin
      .from("contract_signatories")
      .select("*")
      .eq("contract_id", contractId)
      .order("order_index");

    const { data: witnesses } = await admin
      .from("contract_witnesses")
      .select("*")
      .eq("contract_id", contractId)
      .order("order_index");

    // Company from contract.company_id when available, else fallback to first
    let company: any = null;
    if (contract.company_id) {
      const { data } = await admin.from("company_settings").select("*").eq("id", contract.company_id).maybeSingle();
      company = data;
    }
    if (!company) {
      const { data } = await admin.from("company_settings").select("*").limit(1).maybeSingle();
      company = data;
    }

    // Load linked quote + items so we can inject a live scope section
    let quote: any = null;
    let items: any[] = [];
    if (contract.quote_id) {
      const [{ data: q }, { data: qi }] = await Promise.all([
        admin.from("quotes").select("*").eq("id", contract.quote_id).maybeSingle(),
        admin.from("quote_items").select("*, products(descricao, descricao_tecnica)").eq("quote_id", contract.quote_id).order("order_index"),
      ]);
      quote = q;
      items = qi || [];
    }

    const html = buildHTML(contract, snapshots || [], company, signatories || [], witnesses || [], quote, items);

    const pdfshiftKey = Deno.env.get("PDFSHIFT_API_KEY");
    if (!pdfshiftKey) {
      return new Response(JSON.stringify({ error: "PDFSHIFT_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const footerText = `${company?.razao_social || ""} · ${company?.cnpj || ""} · Contrato ${contract.contract_number}`;
    const pdfRes = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa("api:" + pdfshiftKey),
      },
      body: JSON.stringify({
        source: html,
        format: "A4",
        margin: "22mm 18mm 22mm 18mm",
        use_print: false,
        sandbox: false,
        footer: {
          source: `<div style="width:100%;font-size:8pt;color:#888;text-align:center;font-family:Helvetica,Arial,sans-serif;padding:0 18mm;">${esc(footerText)} — Página <span class="pdfshift_page_number"></span> de <span class="pdfshift_total_pages"></span></div>`,
          spacing: "8mm",
        },
      }),
    });

    if (!pdfRes.ok) {
      const errText = await pdfRes.text();
      console.error("PDFShift error:", pdfRes.status, errText);
      return new Response(JSON.stringify({ error: "Falha na geração do PDF", details: errText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pdfBuffer = new Uint8Array(await pdfRes.arrayBuffer());

    // Upload to storage
    const path = `${contractId}/generated-v${contract.current_version || 1}-${Date.now()}.pdf`;
    const { error: upErr } = await admin.storage
      .from("contracts")
      .upload(path, pdfBuffer, { contentType: "application/pdf", upsert: true });
    if (upErr) {
      console.error("Upload error:", upErr);
    } else {
      await admin.from("contracts").update({
        pdf_url: path,
        generated_at: new Date().toISOString(),
      }).eq("id", contractId);
    }

    // Return PDF as base64 so the client can open/download without about:blank
    let binary = "";
    for (let i = 0; i < pdfBuffer.length; i++) binary += String.fromCharCode(pdfBuffer[i]);
    const base64 = btoa(binary);

    return new Response(JSON.stringify({
      pdf_base64: base64,
      contract_number: contract.contract_number,
      storage_path: path,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
