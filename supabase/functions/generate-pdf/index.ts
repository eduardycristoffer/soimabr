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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate user
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { quoteId } = await req.json();
    if (!quoteId) {
      return new Response(JSON.stringify({ error: "quoteId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch quote with relations
    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("*, clients(*)")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      return new Response(JSON.stringify({ error: "Proposta não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch items
    const { data: items } = await supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("order_index");

    // Fetch creator profile
    const { data: creator } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("user_id", quote.created_by)
      .single();

    // Fetch company settings
    const { data: company } = await supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .single();

    // Fetch products for tech descriptions
    const productIds = (items || []).map((i: any) => i.product_id).filter(Boolean);
    let productsMap: Record<string, any> = {};
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, descricao_tecnica, show_tech_desc_pdf")
        .in("id", productIds);
      if (products) {
        for (const p of products) {
          productsMap[p.id] = p;
        }
      }
    }

    // Generate HTML for the PDF
    const html = generateQuoteHTML(quote, items || [], creator, company, productsMap);

    return new Response(JSON.stringify({ html, quote_number: quote.quote_number }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Logo URLs from storage
const SOIMA_LOGO_URL = "https://untvhsyorhojoviyplax.supabase.co/storage/v1/object/public/logos/soima-logo.webp";
const YELUM_LOGO_URL = "https://untvhsyorhojoviyplax.supabase.co/storage/v1/object/public/logos/yelum-logo.png";
const CREA_LOGO_URL = "https://untvhsyorhojoviyplax.supabase.co/storage/v1/object/public/logos/crea-go-logo.webp";

function generateQuoteHTML(quote: any, items: any[], creator: any, company: any, productsMap: Record<string, any>) {
  const formatCurrency = (value: number) => {
    const symbols: Record<string, string> = { BRL: "R$", USD: "US$", EUR: "€" };
    const sym = symbols[quote.currency] || quote.currency;
    return `${sym} ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  };

  const client = quote.clients;
  const co = company || {};

  const categoryLabels: Record<string, string> = {
    grua: "Grua",
    configuracao: "Configuração",
    torre: "Torre",
    tramo: "Tramo",
    chassis: "Chassis",
    acessorio: "Acessório",
  };

  // Group items by category
  const grouped: Record<string, any[]> = {};
  for (const item of items) {
    const cat = item.product_category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  const categoryOrder = ["grua", "configuracao", "torre", "tramo", "chassis", "acessorio"];
  const sortedCategories = categoryOrder.filter((c) => grouped[c]);

  // Get grua item name for the tech block
  const gruaItem = (grouped["grua"] || [])[0];

  let itemsHTML = "";
  let idx = 1;
  for (const cat of sortedCategories) {
    itemsHTML += `<tr class="cat-header"><td colspan="5">${categoryLabels[cat] || cat}</td></tr>`;
    for (const item of grouped[cat]) {
      const product = productsMap[item.product_id];
      const showTechDesc = product?.show_tech_desc_pdf && product?.descricao_tecnica;
      itemsHTML += `
        <tr>
          <td class="center">${idx++}</td>
          <td>${item.product_code}</td>
          <td>${item.product_name}${item.notes ? `<br><small>${item.notes}</small>` : ""}${showTechDesc ? `<br><small class="tech-desc">${product.descricao_tecnica}</small>` : ""}</td>
          <td class="center">${item.quantity}</td>
          <td class="right">${formatCurrency(item.total_price)}</td>
        </tr>`;
    }
  }

  const validityDate = new Date(quote.created_at);
  validityDate.setDate(validityDate.getDate() + (quote.validity_days || 30));

  // Grua specs block
  const hasGruaSpecs = quote.grua_lanca_m || quote.grua_altura_torre_m || quote.grua_carga_maxima_kg || quote.grua_carga_ponta_kg || quote.grua_altura_trabalho_m;
  const gruaSpecsHTML = hasGruaSpecs ? `
  <div class="section">
    <div class="section-title">Partes Consideradas para a Cotação</div>
    <div class="specs-box">
      ${gruaItem ? `<div class="specs-product">${gruaItem.product_name}</div>` : ""}
      <div class="specs-grid">
        ${quote.grua_lanca_m ? `<div><span class="label">Lança:</span> <span class="value">${quote.grua_lanca_m} m</span></div>` : ""}
        ${quote.grua_altura_torre_m ? `<div><span class="label">Altura da torre:</span> <span class="value">${quote.grua_altura_torre_m} m</span></div>` : ""}
        ${quote.grua_carga_maxima_kg ? `<div><span class="label">Carga Máxima:</span> <span class="value">${Number(quote.grua_carga_maxima_kg).toLocaleString("pt-BR")} kg</span></div>` : ""}
        ${quote.grua_carga_ponta_kg ? `<div><span class="label">Carga na ponta:</span> <span class="value">${Number(quote.grua_carga_ponta_kg).toLocaleString("pt-BR")} kg</span></div>` : ""}
        ${quote.grua_altura_trabalho_m ? `<div><span class="label">Altura de Trabalho:</span> <span class="value">${quote.grua_altura_trabalho_m} m</span></div>` : ""}
      </div>
    </div>
  </div>` : "";

  // Company header info
  const companyName = co.company_name || "SOIMA Brasil";
  const companySubtitle = co.razao_social || "Equipamentos para Construção Civil";
  const companyPhone = co.phone || "";
  const companyEmail = co.email || "";
  const companyWebsite = co.website || "";
  const companyCrea = co.crea_registration || "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Proposta Comercial ${quote.quote_number}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.5; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0047AB; padding-bottom: 12px; margin-bottom: 16px; }
  .header-left { display: flex; align-items: flex-start; gap: 12px; }
  .header-logo { height: 50px; width: auto; }
  .company { font-size: 20px; font-weight: 700; color: #0047AB; letter-spacing: 1px; }
  .company small { display: block; font-size: 10px; color: #666; font-weight: 400; letter-spacing: 0; }
  .company-contact { font-size: 9px; color: #666; margin-top: 4px; line-height: 1.6; }
  .quote-info { text-align: right; }
  .quote-number { font-size: 16px; font-weight: 700; color: #0047AB; }
  .quote-meta { font-size: 10px; color: #666; margin-top: 4px; }

  .section { margin-bottom: 14px; }
  .section-title { font-size: 11px; font-weight: 700; color: #0047AB; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 6px; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 10px; }
  .info-grid .label { color: #666; }
  .info-grid .value { font-weight: 500; }

  .specs-box { background: #f0f4fa; border: 1px solid #c8d6e8; border-radius: 4px; padding: 10px 14px; }
  .specs-product { font-weight: 700; font-size: 12px; color: #0047AB; margin-bottom: 6px; }
  .specs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 11px; }
  .specs-grid .label { color: #555; }
  .specs-grid .value { font-weight: 600; }

  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  table th { background: #0047AB; color: white; padding: 6px 8px; text-align: left; font-weight: 600; }
  table td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  table tr:nth-child(even) { background: #f8f9fa; }
  .cat-header td { background: #e8eef7; font-weight: 700; color: #0047AB; font-size: 10px; padding: 4px 8px; }
  .center { text-align: center; }
  .right { text-align: right; }
  .tech-desc { color: #555; font-style: italic; display: block; margin-top: 2px; }

  .totals { margin-top: 12px; display: flex; justify-content: flex-end; }
  .totals-box { width: 250px; font-size: 11px; }
  .totals-row { display: flex; justify-content: space-between; padding: 3px 0; }
  .totals-row.total { border-top: 2px solid #0047AB; font-size: 14px; font-weight: 700; color: #0047AB; padding-top: 6px; margin-top: 4px; }
  .totals-row.discount { color: #c0392b; }

  .conditions { font-size: 10px; }
  .conditions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }

  .footer { margin-top: 24px; border-top: 2px solid #0047AB; padding-top: 8px; font-size: 9px; color: #555; text-align: center; line-height: 1.6; }
  .footer-logos { display: flex; justify-content: center; align-items: center; gap: 24px; margin-top: 10px; }
  .footer-logos img { height: 40px; width: auto; }
  .footer .company-legal { font-weight: 600; color: #333; }
  .signature { margin-top: 40px; display: flex; justify-content: space-around; }
  .sig-line { width: 200px; text-align: center; border-top: 1px solid #333; padding-top: 4px; font-size: 10px; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${SOIMA_LOGO_URL}" alt="SOIMA" class="header-logo" />
      <div>
        <div class="company">${companyName.toUpperCase()}<small>${companySubtitle}</small></div>
        <div class="company-contact">
          ${companyPhone ? `Tel: ${companyPhone}<br>` : ""}
          ${companyEmail ? `${companyEmail}<br>` : ""}
          ${companyWebsite ? `${companyWebsite}<br>` : ""}
          ${companyCrea ? `${companyCrea}` : ""}
        </div>
      </div>
    </div>
    <div class="quote-info">
      <div class="quote-number">${quote.quote_number}</div>
      <div class="quote-meta">
        Data: ${formatDate(quote.created_at)}<br>
        Validade: ${formatDate(validityDate.toISOString())}<br>
        Status: ${quote.status === "finalized" ? "Finalizado" : quote.status === "draft" ? "Rascunho" : "Cancelado"}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Cliente</div>
    <div class="info-grid">
      <div><span class="label">Razão Social:</span> <span class="value">${client?.razao_social || "-"}</span></div>
      <div><span class="label">Tipo:</span> <span class="value">${client?.client_type === "nacional" ? "Nacional" : "Internacional"}</span></div>
      ${client?.cnpj ? `<div><span class="label">CNPJ:</span> <span class="value">${client.cnpj}</span></div>` : ""}
      ${client?.cpf ? `<div><span class="label">CPF:</span> <span class="value">${client.cpf}</span></div>` : ""}
      ${client?.tax_id ? `<div><span class="label">Tax ID:</span> <span class="value">${client.tax_id}</span></div>` : ""}
      ${client?.email ? `<div><span class="label">Email:</span> <span class="value">${client.email}</span></div>` : ""}
      ${client?.telefone ? `<div><span class="label">Telefone:</span> <span class="value">${client.telefone}</span></div>` : ""}
      ${client?.cidade && client?.estado ? `<div><span class="label">Cidade/UF:</span> <span class="value">${client.cidade}/${client.estado}</span></div>` : ""}
      ${client?.pais && client?.pais !== "Brasil" ? `<div><span class="label">País:</span> <span class="value">${client.pais}</span></div>` : ""}
    </div>
  </div>

  ${quote.project_name ? `
  <div class="section">
    <div class="section-title">Projeto</div>
    <div class="info-grid">
      <div><span class="label">Nome:</span> <span class="value">${quote.project_name}</span></div>
      ${quote.project_location ? `<div><span class="label">Local:</span> <span class="value">${quote.project_location}</span></div>` : ""}
    </div>
  </div>
  ` : ""}

  ${gruaSpecsHTML}

  <div class="section">
    <div class="section-title">Itens da Proposta</div>
    <table>
      <thead>
        <tr>
          <th class="center" style="width:40px">#</th>
          <th style="width:100px">Código</th>
          <th>Descrição</th>
          <th class="center" style="width:50px">Qtd</th>
          <th class="right" style="width:110px">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML || '<tr><td colspan="5" class="center">Nenhum item</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>${formatCurrency(quote.subtotal)}</span>
        </div>
        ${quote.discount_percent > 0 ? `
        <div class="totals-row discount">
          <span>Desconto (${Number(quote.discount_percent).toFixed(1)}%)</span>
          <span>-${formatCurrency(quote.discount_value)}</span>
        </div>
        ` : ""}
        <div class="totals-row total">
          <span>Total</span>
          <span>${formatCurrency(quote.total)}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="section conditions">
    <div class="section-title">Condições Comerciais</div>
    <div class="conditions-grid">
      <div><span class="label">Moeda:</span> <span class="value">${quote.currency}</span></div>
      <div><span class="label">Validade:</span> <span class="value">${quote.validity_days} dias</span></div>
      ${quote.delivery_time ? `<div><span class="label">Prazo de Entrega:</span> <span class="value">${quote.delivery_time}</span></div>` : ""}
      ${quote.payment_terms ? `<div><span class="label">Pagamento:</span> <span class="value">${quote.payment_terms}</span></div>` : ""}
      ${quote.freight_terms ? `<div><span class="label">Frete:</span> <span class="value">${quote.freight_terms}</span></div>` : ""}
    </div>
    ${quote.notes ? `<div style="margin-top:6px"><span class="label">Observações:</span> <span class="value">${quote.notes}</span></div>` : ""}
  </div>

  <div class="signature">
    <div class="sig-line">${companyName}</div>
    <div class="sig-line">${client?.razao_social || "Cliente"}</div>
  </div>

  <div class="footer">
    <span class="company-legal">${co.razao_social || companyName}</span>
    ${co.cnpj ? ` · CNPJ: ${co.cnpj}` : ""}
    ${co.address ? `<br>${co.address}` : ""}
    <br>Documento gerado em ${formatDate(new Date().toISOString())} por ${creator?.name || "Sistema"} (${creator?.email || ""})
    <div class="footer-logos">
      <img src="${YELUM_LOGO_URL}" alt="Yelum Seguradora" />
      <img src="${CREA_LOGO_URL}" alt="CREA-GO" />
    </div>
  </div>
</body>
</html>`;
}
