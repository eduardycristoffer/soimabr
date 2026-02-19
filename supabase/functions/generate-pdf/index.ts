import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Translation dictionary ──────────────────────────────────────────────
interface Translations {
  title: string;
  date: string;
  validity: string;
  status_finalized: string;
  status_draft: string;
  status_cancelled: string;
  client: string;
  razao_social: string;
  tipo: string;
  nacional: string;
  internacional: string;
  email: string;
  telefone: string;
  cidade_uf: string;
  pais: string;
  project: string;
  name: string;
  location: string;
  crane_specs: string;
  jib: string;
  tower_height: string;
  max_load: string;
  tip_load: string;
  working_height: string;
  items_section: string;
  code: string;
  description: string;
  qty: string;
  total: string;
  unit_intl_brl: string;
  total_brl: string;
  est_usd: string;
  no_items: string;
  subtotal: string;
  subtotal_brl: string;
  subtotal_est_usd: string;
  discount: string;
  total_brl_label: string;
  total_est_usd: string;
  conditions: string;
  currency_label: string;
  validity_label: string;
  days: string;
  delivery: string;
  payment: string;
  freight: string;
  notes: string;
  generated_on: string;
  by: string;
  usd_disclaimer: string;
  usd_rate_used: string;
  updated_on: string;
  cat_grua: string;
  cat_configuracao: string;
  cat_torre: string;
  cat_tramo: string;
  cat_chassis: string;
  cat_acessorio: string;
}

const translations: Record<string, Translations> = {
  "pt-BR": {
    title: "Proposta Comercial",
    date: "Data",
    validity: "Validade",
    status_finalized: "Finalizado",
    status_draft: "Rascunho",
    status_cancelled: "Cancelado",
    client: "Cliente",
    razao_social: "Razão Social",
    tipo: "Tipo",
    nacional: "Nacional",
    internacional: "Internacional",
    email: "Email",
    telefone: "Telefone",
    cidade_uf: "Cidade/UF",
    pais: "País",
    project: "Projeto",
    name: "Nome",
    location: "Local",
    crane_specs: "Partes Consideradas para a Cotação",
    jib: "Lança",
    tower_height: "Altura da torre",
    max_load: "Carga Máxima",
    tip_load: "Carga na ponta",
    working_height: "Altura de Trabalho",
    items_section: "Itens da Proposta",
    code: "Código",
    description: "Descrição",
    qty: "Qtd",
    total: "Total",
    unit_intl_brl: "Unit. Intl. (BRL)",
    total_brl: "Total (BRL)",
    est_usd: "Est. (USD)",
    no_items: "Nenhum item",
    subtotal: "Subtotal",
    subtotal_brl: "Subtotal (BRL)",
    subtotal_est_usd: "Subtotal estimado (USD)",
    discount: "Desconto",
    total_brl_label: "Total (BRL)",
    total_est_usd: "Total estimado (USD)",
    conditions: "Condições Comerciais",
    currency_label: "Moeda",
    validity_label: "Validade",
    days: "dias",
    delivery: "Prazo de Entrega",
    payment: "Pagamento",
    freight: "Frete",
    notes: "Observações",
    generated_on: "Documento gerado em",
    by: "por",
    usd_disclaimer: "Valores em USD são estimados com base na cotação do dia e podem variar no momento do pagamento.",
    usd_rate_used: "Cotação USD/BRL utilizada",
    updated_on: "atualizada em",
    cat_grua: "Grua",
    cat_configuracao: "Configuração",
    cat_torre: "Torre",
    cat_tramo: "Tramo",
    cat_chassis: "Chassis",
    cat_acessorio: "Acessório",
  },
  en: {
    title: "Commercial Proposal",
    date: "Date",
    validity: "Validity",
    status_finalized: "Finalized",
    status_draft: "Draft",
    status_cancelled: "Cancelled",
    client: "Client",
    razao_social: "Company Name",
    tipo: "Type",
    nacional: "National",
    internacional: "International",
    email: "Email",
    telefone: "Phone",
    cidade_uf: "City/State",
    pais: "Country",
    project: "Project",
    name: "Name",
    location: "Location",
    crane_specs: "Parts Considered for Quotation",
    jib: "Jib",
    tower_height: "Tower Height",
    max_load: "Max Load",
    tip_load: "Tip Load",
    working_height: "Working Height",
    items_section: "Proposal Items",
    code: "Code",
    description: "Description",
    qty: "Qty",
    total: "Total",
    unit_intl_brl: "Unit Intl. (BRL)",
    total_brl: "Total (BRL)",
    est_usd: "Est. (USD)",
    no_items: "No items",
    subtotal: "Subtotal",
    subtotal_brl: "Subtotal (BRL)",
    subtotal_est_usd: "Estimated Subtotal (USD)",
    discount: "Discount",
    total_brl_label: "Total (BRL)",
    total_est_usd: "Estimated Total (USD)",
    conditions: "Commercial Conditions",
    currency_label: "Currency",
    validity_label: "Validity",
    days: "days",
    delivery: "Delivery Time",
    payment: "Payment",
    freight: "Freight",
    notes: "Notes",
    generated_on: "Document generated on",
    by: "by",
    usd_disclaimer: "USD values are estimated based on the exchange rate of the day and may vary at the time of payment.",
    usd_rate_used: "USD/BRL exchange rate used",
    updated_on: "updated on",
    cat_grua: "Crane",
    cat_configuracao: "Configuration",
    cat_torre: "Tower",
    cat_tramo: "Tower Section",
    cat_chassis: "Chassis",
    cat_acessorio: "Accessory",
  },
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

    // Resolve language
    const lang = quote.language || "pt-BR";
    const t = translations[lang] || translations["pt-BR"];

    // Generate HTML for the PDF
    const html = generateQuoteHTML(quote, items || [], creator, company, productsMap, t, lang);

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

// Cover & backcover images (served from Supabase storage)
const PDF_COVER_URL = "https://untvhsyorhojoviyplax.supabase.co/storage/v1/object/public/logos/pdf-cover.jpg";
const PDF_BACKCOVER_URL = "https://untvhsyorhojoviyplax.supabase.co/storage/v1/object/public/logos/pdf-backcover.jpg";

function generateQuoteHTML(quote: any, items: any[], creator: any, company: any, productsMap: Record<string, any>, t: Translations, lang: string) {
  const isInternationalUsd = quote.clients?.client_type === "internacional" && quote.currency === "USD" && quote.usd_brl_rate_used;
  const usdRate = quote.usd_brl_rate_used ? Number(quote.usd_brl_rate_used) : null;

  const formatBrl = (value: number) => {
    return `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatUsd = (value: number) => {
    return `US$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCurrency = (value: number) => {
    const symbols: Record<string, string> = { BRL: "R$", USD: "US$", EUR: "€" };
    const sym = symbols[quote.currency] || quote.currency;
    return `${sym} ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    if (lang === "en") {
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  };

  const formatDateTime = (d: string) => {
    const date = new Date(d);
    return `${formatDate(d)} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  const client = quote.clients;
  const co = company || {};

  const categoryLabels: Record<string, string> = {
    grua: t.cat_grua,
    configuracao: t.cat_configuracao,
    torre: t.cat_torre,
    tramo: t.cat_tramo,
    chassis: t.cat_chassis,
    acessorio: t.cat_acessorio,
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

  // Build items table
  let itemsHTML = "";
  let idx = 1;

  if (isInternationalUsd && usdRate) {
    for (const cat of sortedCategories) {
      itemsHTML += `<tr class="cat-header"><td colspan="7">${categoryLabels[cat] || cat}</td></tr>`;
      for (const item of grouped[cat]) {
        const product = productsMap[item.product_id];
        const showTechDesc = product?.show_tech_desc_pdf && product?.descricao_tecnica;
        const intlBrl = item.international_unit_price_brl || item.unit_price;
        const totalBrl = intlBrl * item.quantity;
        const totalUsd = totalBrl / usdRate;
        itemsHTML += `
          <tr>
            <td class="center">${idx++}</td>
            <td>${item.product_code}</td>
            <td>${item.product_name}${item.notes ? `<br><small>${item.notes}</small>` : ""}${showTechDesc ? `<br><small class="tech-desc">${product.descricao_tecnica}</small>` : ""}</td>
            <td class="center">${item.quantity}</td>
            <td class="right">${formatBrl(intlBrl)}</td>
            <td class="right">${formatBrl(totalBrl)}</td>
            <td class="right">${formatUsd(totalUsd)}</td>
          </tr>`;
      }
    }
  } else {
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
  }

  const validityDate = new Date(quote.created_at);
  validityDate.setDate(validityDate.getDate() + (quote.validity_days || 30));

  // Grua specs block
  const gruaItems = (grouped["grua"] || []).filter((i: any) => i.grua_lanca_m || i.grua_altura_torre_m || i.grua_carga_maxima_kg || i.grua_carga_ponta_kg || i.grua_altura_trabalho_m);
  const gruaSpecsHTML = gruaItems.length > 0 ? `
  <div class="section">
    <div class="section-title">${t.crane_specs}</div>
    ${gruaItems.map((gi: any) => `
    <div class="specs-box" style="margin-bottom: 8px;">
      <div class="specs-product">${gi.product_name}</div>
      <div class="specs-grid">
        ${gi.grua_lanca_m ? `<div><span class="label">${t.jib}:</span> <span class="value">${gi.grua_lanca_m} m</span></div>` : ""}
        ${gi.grua_altura_torre_m ? `<div><span class="label">${t.tower_height}:</span> <span class="value">${gi.grua_altura_torre_m} m</span></div>` : ""}
        ${gi.grua_carga_maxima_kg ? `<div><span class="label">${t.max_load}:</span> <span class="value">${Number(gi.grua_carga_maxima_kg).toLocaleString("pt-BR")} kg</span></div>` : ""}
        ${gi.grua_carga_ponta_kg ? `<div><span class="label">${t.tip_load}:</span> <span class="value">${Number(gi.grua_carga_ponta_kg).toLocaleString("pt-BR")} kg</span></div>` : ""}
        ${gi.grua_altura_trabalho_m ? `<div><span class="label">${t.working_height}:</span> <span class="value">${gi.grua_altura_trabalho_m} m</span></div>` : ""}
      </div>
    </div>`).join("")}
  </div>` : "";

  // Totals section
  let totalsHTML = "";
  if (isInternationalUsd && usdRate) {
    const subtotalUsd = quote.subtotal / usdRate;
    const discountUsd = quote.discount_value / usdRate;
    const totalUsd = quote.total / usdRate;
    totalsHTML = `
    <div class="totals">
      <div class="totals-box" style="width: 350px;">
        <div class="totals-row">
          <span>${t.subtotal_brl}</span>
          <span>${formatBrl(quote.subtotal)}</span>
        </div>
        <div class="totals-row">
          <span>${t.subtotal_est_usd}</span>
          <span>${formatUsd(subtotalUsd)}</span>
        </div>
        ${quote.discount_percent > 0 ? `
        <div class="totals-row discount">
          <span>${t.discount} (${Number(quote.discount_percent).toFixed(1)}%)</span>
          <span>-${formatBrl(quote.discount_value)} / -${formatUsd(discountUsd)}</span>
        </div>
        ` : ""}
        <div class="totals-row total">
          <span>${t.total_brl_label}</span>
          <span>${formatBrl(quote.total)}</span>
        </div>
        <div class="totals-row total" style="border-top: none; margin-top: 0;">
          <span>${t.total_est_usd}</span>
          <span>${formatUsd(totalUsd)}</span>
        </div>
      </div>
    </div>
    <div style="text-align: right; font-size: 9px; color: #666; margin-top: 4px;">
      ${t.usd_rate_used}: ${usdRate.toFixed(4)}${quote.usd_brl_rate_updated_at ? ` (${t.updated_on} ${formatDateTime(quote.usd_brl_rate_updated_at)})` : ""}
    </div>`;
  } else {
    totalsHTML = `
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span>${t.subtotal}</span>
          <span>${formatCurrency(quote.subtotal)}</span>
        </div>
        ${quote.discount_percent > 0 ? `
        <div class="totals-row discount">
          <span>${t.discount} (${Number(quote.discount_percent).toFixed(1)}%)</span>
          <span>-${formatCurrency(quote.discount_value)}</span>
        </div>
        ` : ""}
        <div class="totals-row total">
          <span>${t.total}</span>
          <span>${formatCurrency(quote.total)}</span>
        </div>
      </div>
    </div>`;
  }

  // Items table header
  const tableHeaderHTML = isInternationalUsd && usdRate ? `
    <tr>
      <th class="center" style="width:35px">#</th>
      <th style="width:90px">${t.code}</th>
      <th>${t.description}</th>
      <th class="center" style="width:40px">${t.qty}</th>
      <th class="right" style="width:100px">${t.unit_intl_brl}</th>
      <th class="right" style="width:100px">${t.total_brl}</th>
      <th class="right" style="width:100px">${t.est_usd}</th>
    </tr>` : `
    <tr>
      <th class="center" style="width:40px">#</th>
      <th style="width:100px">${t.code}</th>
      <th>${t.description}</th>
      <th class="center" style="width:50px">${t.qty}</th>
      <th class="right" style="width:110px">${t.total}</th>
    </tr>`;

  // Company header info
  const companyName = co.company_name || "SOIMA Brasil";
  const companySubtitle = co.razao_social || "Equipamentos para Construção Civil";
  const companyPhone = co.phone || "";
  const companyEmail = co.email || "";
  const companyWebsite = co.website || "";
  const companyCrea = co.crea_registration || "";

  // Status translation
  const statusLabel = quote.status === "finalized" ? t.status_finalized : quote.status === "draft" ? t.status_draft : t.status_cancelled;

  // International disclaimer
  const disclaimerHTML = isInternationalUsd ? `
  <div style="margin-top: 10px; padding: 8px; border: 1px solid #e0c36a; background: #fef9e7; border-radius: 4px; font-size: 9px; color: #7d6608;">
    <strong>${lang === "en" ? "Note:" : "Nota:"}</strong> ${t.usd_disclaimer}
  </div>` : "";

  const htmlLang = lang === "en" ? "en" : "pt-BR";

  // Cover overlay data
  const clientName = client?.nome_fantasia || client?.razao_social || "-";
  const clientCityUf = client?.cidade && client?.estado ? `${client.cidade} \u2022 ${client.estado}` : (client?.cidade || client?.estado || "");
  const coverDate = formatDate(quote.created_at);

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
<meta charset="UTF-8">
<title>${t.title} ${quote.quote_number}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.5; }

  /* Cover & backcover full-bleed pages */
  .cover-page, .backcover-page {
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 0;
    position: relative;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    page-break-after: always;
    overflow: hidden;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  @media print {
    .cover-page, .backcover-page {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      margin: -15mm;
      width: calc(210mm + 30mm);
      height: calc(297mm + 30mm);
    }
  }
  .cover-overlay {
    position: absolute;
    top: 40px;
    left: 40px;
    color: white;
    font-size: 11px;
    opacity: 1;
    line-height: 1.8;
    font-family: 'Segoe UI', Arial, sans-serif;
    letter-spacing: 0.3px;
  }
  .cover-overlay .cover-label {
    font-size: 10px;
    opacity: 0.7;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

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
  <!-- CAPA -->
  <div class="cover-page" style="background-image: url('${PDF_COVER_URL}');">
    <div class="cover-overlay">
      ${lang === "en" ? "Proposal" : "Proposta"} nº ${quote.quote_number}<br>
      ${clientName}<br>
      ${clientCityUf ? `${clientCityUf}<br>` : ""}
      ${lang === "en" ? "Issued on" : "Emitida em"}: ${coverDate}
    </div>
  </div>

  <!-- CONTEÚDO INTERNO -->
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
        ${t.date}: ${formatDate(quote.created_at)}<br>
        ${t.validity}: ${formatDate(validityDate.toISOString())}<br>
        Status: ${statusLabel}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${t.client}</div>
    <div class="info-grid">
      <div><span class="label">${t.razao_social}:</span> <span class="value">${client?.razao_social || "-"}</span></div>
      <div><span class="label">${t.tipo}:</span> <span class="value">${client?.client_type === "nacional" ? t.nacional : t.internacional}</span></div>
      ${client?.cnpj ? `<div><span class="label">CNPJ:</span> <span class="value">${client.cnpj}</span></div>` : ""}
      ${client?.cpf ? `<div><span class="label">CPF:</span> <span class="value">${client.cpf}</span></div>` : ""}
      ${client?.tax_id ? `<div><span class="label">Tax ID:</span> <span class="value">${client.tax_id}</span></div>` : ""}
      ${client?.email ? `<div><span class="label">${t.email}:</span> <span class="value">${client.email}</span></div>` : ""}
      ${client?.telefone ? `<div><span class="label">${t.telefone}:</span> <span class="value">${client.telefone}</span></div>` : ""}
      ${client?.cidade && client?.estado ? `<div><span class="label">${t.cidade_uf}:</span> <span class="value">${client.cidade}/${client.estado}</span></div>` : ""}
      ${client?.pais && client?.pais !== "Brasil" ? `<div><span class="label">${t.pais}:</span> <span class="value">${client.pais}</span></div>` : ""}
    </div>
  </div>

  ${quote.project_name ? `
  <div class="section">
    <div class="section-title">${t.project}</div>
    <div class="info-grid">
      <div><span class="label">${t.name}:</span> <span class="value">${quote.project_name}</span></div>
      ${quote.project_location ? `<div><span class="label">${t.location}:</span> <span class="value">${quote.project_location}</span></div>` : ""}
    </div>
  </div>
  ` : ""}

  ${gruaSpecsHTML}

  <div class="section">
    <div class="section-title">${t.items_section}</div>
    <table>
      <thead>
        ${tableHeaderHTML}
      </thead>
      <tbody>
        ${itemsHTML || `<tr><td colspan="${isInternationalUsd ? 7 : 5}" class="center">${t.no_items}</td></tr>`}
      </tbody>
    </table>

    ${totalsHTML}
    ${disclaimerHTML}
  </div>

  <div class="section conditions">
    <div class="section-title">${t.conditions}</div>
    <div class="conditions-grid">
      <div><span class="label">${t.currency_label}:</span> <span class="value">${quote.currency}</span></div>
      <div><span class="label">${t.validity_label}:</span> <span class="value">${quote.validity_days} ${t.days}</span></div>
      ${quote.delivery_time ? `<div><span class="label">${t.delivery}:</span> <span class="value">${quote.delivery_time}</span></div>` : ""}
      ${quote.payment_terms ? `<div><span class="label">${t.payment}:</span> <span class="value">${quote.payment_terms}</span></div>` : ""}
      ${quote.freight_terms ? `<div><span class="label">${t.freight}:</span> <span class="value">${quote.freight_terms}</span></div>` : ""}
    </div>
    ${quote.notes ? `<div style="margin-top:6px"><span class="label">${t.notes}:</span> <span class="value">${quote.notes}</span></div>` : ""}
  </div>

  <div class="signature">
    <div class="sig-line">${companyName}</div>
    <div class="sig-line">${client?.razao_social || (lang === "en" ? "Client" : "Cliente")}</div>
  </div>

  <div class="footer">
    <span class="company-legal">${co.razao_social || companyName}</span>
    ${co.cnpj ? ` · CNPJ: ${co.cnpj}` : ""}
    ${co.address ? `<br>${co.address}` : ""}
    <br>${t.generated_on} ${formatDate(new Date().toISOString())} ${t.by} ${creator?.name || "Sistema"} (${creator?.email || ""})
    ${isInternationalUsd ? `<br><em style="color: #7d6608;">${t.usd_disclaimer}</em>` : ""}
    <div class="footer-logos">
      <img src="${YELUM_LOGO_URL}" alt="Yelum Seguradora" />
      <img src="${CREA_LOGO_URL}" alt="CREA-GO" />
    </div>
  </div>

  <!-- CONTRACAPA -->
  <div class="backcover-page" style="background-image: url('${PDF_BACKCOVER_URL}'); page-break-before: always;"></div>
</body>
</html>`;
}
