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
  scope_title: string;
  scope_type: string;
  scope_jib_length: string;
  scope_tower_height: string;
  scope_working_height: string;
  scope_tip_load: string;
  scope_max_load: string;
  scope_vel_elevation: string;
  scope_vel_rotation: string;
  scope_vel_translation: string;
  panel_title: string;
  panel_voltage_label: string;
  panel_motor_item: string;
  panel_motor_spec: string;
  panel_motor_elevation: string;
  panel_motor_translation: string;
  panel_motor_rotation: string;
  warranty_title: string;
  warranty_intro: string;
  warranty_certificate: string;
  warranty_delivery: string;
  warranty_maintenance: string;
  warranty_norms: string;
  warranty_years_text: string;
  warranty_not_included: string;
  warranty_year_singular: string;
  warranty_year_plural: string;
  warranty_structural: string;
  warranty_components: string;
  // Rental-specific
  rental_title: string;
  rental_work_site: string;
  rental_work_type_label: string;
  rental_height_needed: string;
  rental_jib_needed: string;
  rental_max_weight_label: string;
  rental_duration: string;
  rental_start_date: string;
  rental_terrain: string;
  rental_foundation: string;
  rental_yes: string;
  rental_no: string;
  rental_selected_crane: string;
  rental_cost_breakdown: string;
  rental_monthly_value: string;
  rental_months: string;
  rental_monthly_subtotal: string;
  rental_mobilization: string;
  rental_demobilization: string;
  rental_freight_cost: string;
  rental_assembly: string;
  rental_disassembly: string;
  rental_additional_costs: string;
  rental_subtotal_general: string;
  rental_tax: string;
  rental_total: string;
  rental_included_services: string;
  rental_operator: string;
  rental_maintenance: string;
  rental_insurance: string;
  rental_tech_assistance: string;
  rental_work_residential: string;
  rental_work_commercial: string;
  rental_work_industrial: string;
  rental_terrain_flat: string;
  rental_terrain_sloped: string;
  rental_terrain_difficult: string;
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
    scope_title: "ESCOPO DO FORNECIMENTO",
    scope_type: "Tipo",
    scope_jib_length: "Comprimento da lança",
    scope_tower_height: "Altura da torre da grua total",
    scope_working_height: "Altura de elevação / altura de trabalho",
    scope_tip_load: "Carga à ponta",
    scope_max_load: "Carga máxima absoluta",
    scope_vel_elevation: "Velocidade de distribuição",
    scope_vel_rotation: "Velocidade de rotação",
    scope_vel_translation: "Velocidade de translação",
    panel_title: "ITENS INTEGRANTES DA GRUA",
    panel_voltage_label: "Tensão de alimentação",
    panel_motor_item: "Item",
    panel_motor_spec: "Especificação",
    panel_motor_elevation: "Elevação",
    panel_motor_translation: "Distribuição",
    panel_motor_rotation: "Rotação",
    warranty_title: "GARANTIA",
    warranty_intro: "A SOIMA Brasil Equipamentos garante os equipamentos fornecidos conforme as condições abaixo, a partir da data de entrega técnica:",
    warranty_certificate: "Certificado de garantia com os seguintes prazos:",
    warranty_delivery: "Entrega técnica com testes e laudo técnico de conformidade",
    warranty_maintenance: "Plano de manutenção preventiva recomendado",
    warranty_norms: "Normas aplicadas: F.E.M. 1.001-A3 - NR 12 – NR 18 – NBR 8400-1:2019 - NBR 8800:2008 - NBR 16147:2021 - NBR 10084:2020 - NBR 8681 – NBE ISO 13.849-2 – 02/2019",
    warranty_years_text: "anos",
    warranty_not_included: "Garantia não inclusa nesta proposta",
    warranty_year_singular: "ano",
    warranty_year_plural: "anos",
    warranty_structural: "no estrutural",
    warranty_components: "nos componentes elétricos, motores e mecânicos",
    rental_title: "Proposta de Locação",
    rental_work_site: "DADOS DA OBRA",
    rental_work_type_label: "Tipo de obra",
    rental_height_needed: "Altura necessária",
    rental_jib_needed: "Lança necessária",
    rental_max_weight_label: "Peso máximo a içar",
    rental_duration: "Duração da locação",
    rental_start_date: "Início previsto",
    rental_terrain: "Condição do terreno",
    rental_foundation: "Fundação especial",
    rental_yes: "Sim",
    rental_no: "Não",
    rental_selected_crane: "EQUIPAMENTO SELECIONADO",
    rental_cost_breakdown: "DETALHAMENTO DE CUSTOS",
    rental_monthly_value: "Valor mensal",
    rental_months: "meses",
    rental_monthly_subtotal: "Subtotal locação",
    rental_mobilization: "Mobilização",
    rental_demobilization: "Desmobilização",
    rental_freight_cost: "Frete",
    rental_assembly: "Montagem",
    rental_disassembly: "Desmontagem",
    rental_additional_costs: "Custos adicionais",
    rental_subtotal_general: "Subtotal geral",
    rental_tax: "Impostos",
    rental_total: "TOTAL",
    rental_included_services: "SERVIÇOS INCLUSOS",
    rental_operator: "Operador incluso",
    rental_maintenance: "Manutenção inclusa",
    rental_insurance: "Seguro incluso",
    rental_tech_assistance: "Assistência técnica",
    rental_work_residential: "Residencial",
    rental_work_commercial: "Comercial",
    rental_work_industrial: "Industrial",
    rental_terrain_flat: "Plano",
    rental_terrain_sloped: "Inclinado",
    rental_terrain_difficult: "Difícil acesso",
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
    scope_title: "SUPPLY SCOPE",
    scope_type: "Type",
    scope_jib_length: "Jib length",
    scope_tower_height: "Total tower height",
    scope_working_height: "Working height",
    scope_tip_load: "Tip load",
    scope_max_load: "Maximum absolute load",
    scope_vel_elevation: "Distribution speed",
    scope_vel_rotation: "Slewing speed",
    scope_vel_translation: "Trolley speed",
    panel_title: "CRANE COMPONENTS",
    panel_voltage_label: "Supply voltage",
    panel_motor_item: "Item",
    panel_motor_spec: "Specification",
    panel_motor_elevation: "Hoisting",
    panel_motor_translation: "Trolley travel",
    panel_motor_rotation: "Slewing",
    warranty_title: "WARRANTY",
    warranty_intro: "SOIMA Brasil Equipamentos warrants the supplied equipment under the conditions below, from the date of technical delivery:",
    warranty_certificate: "Warranty certificate with the following terms:",
    warranty_delivery: "Technical delivery with tests and compliance report",
    warranty_maintenance: "Recommended preventive maintenance plan",
    warranty_norms: "Applied standards: F.E.M. 1.001-A3 - NR 12 – NR 18 – NBR 8400-1:2019 - NBR 8800:2008 - NBR 16147:2021 - NBR 10084:2020 - NBR 8681 – NBE ISO 13.849-2 – 02/2019",
    warranty_years_text: "years",
    warranty_not_included: "Warranty not included in this proposal",
    warranty_year_singular: "year",
    warranty_year_plural: "years",
    warranty_structural: "on structural",
    warranty_components: "on electrical components, motors and mechanical parts",
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

    // Fetch products for tech descriptions (full data for defaults)
    const productIds = (items || []).map((i: any) => i.product_id).filter(Boolean);
    let productsMap: Record<string, any> = {};
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds);
      if (products) {
        for (const p of products) {
          productsMap[p.id] = p;
        }
      }
    }

    // Fetch quote panel items
    const { data: quotePanelItems } = await supabase
      .from("quote_panel_items")
      .select("*")
      .eq("quote_id", quoteId)
      .order("order_index");

    // If no panel items on quote, try loading defaults from the grua product
    const gruaItem = (items || []).find((i: any) => i.product_category === "grua");
    let defaultPanelItems: any[] = [];
    if ((!quotePanelItems || quotePanelItems.length === 0) && gruaItem?.product_id) {
      const { data: dpi } = await supabase
        .from("default_panel_items")
        .select("*")
        .eq("product_id", gruaItem.product_id)
        .order("order_index");
      defaultPanelItems = dpi || [];
    }

    // Resolve language
    const lang = quote.language || "pt-BR";
    const t = translations[lang] || translations["pt-BR"];

    // Generate HTML for the PDF
    const html = generateQuoteHTML(quote, items || [], creator, company, productsMap, t, lang, quotePanelItems || [], defaultPanelItems);

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

function generateQuoteHTML(quote: any, items: any[], creator: any, company: any, productsMap: Record<string, any>, t: Translations, lang: string, quotePanelItems: any[], defaultPanelItems: any[]) {
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
  const hideUnitPrices = !!quote.hide_unit_prices;

  if (isInternationalUsd && usdRate) {
    for (const cat of sortedCategories) {
      itemsHTML += `<tr class="cat-header"><td colspan="${hideUnitPrices ? 4 : 7}">${categoryLabels[cat] || cat}</td></tr>`;
      for (const item of grouped[cat]) {
        const product = productsMap[item.product_id];
        const techDesc = (lang === "en" && product?.descricao_tecnica_en) ? product.descricao_tecnica_en : product?.descricao_tecnica;
        const showTechDesc = product?.show_tech_desc_pdf && techDesc;
        const displayName = (lang === "en" && product?.nome_en) ? product.nome_en : item.product_name;
        const intlBrl = item.international_unit_price_brl || item.unit_price;
        const totalBrl = intlBrl * item.quantity;
        const totalUsd = totalBrl / usdRate;
        itemsHTML += `
          <tr>
            <td class="center">${idx++}</td>
            <td>${item.product_code}</td>
            <td>${displayName}${item.notes ? `<br><small>${item.notes}</small>` : ""}${showTechDesc ? `<br><small class="tech-desc">${techDesc}</small>` : ""}</td>
            <td class="center">${item.quantity}</td>
            ${hideUnitPrices ? "" : `<td class="right">${formatBrl(intlBrl)}</td>
            <td class="right">${formatBrl(totalBrl)}</td>
            <td class="right">${formatUsd(totalUsd)}</td>`}
          </tr>`;
      }
    }
  } else {
    for (const cat of sortedCategories) {
      itemsHTML += `<tr class="cat-header"><td colspan="${hideUnitPrices ? 4 : 5}">${categoryLabels[cat] || cat}</td></tr>`;
      for (const item of grouped[cat]) {
        const product = productsMap[item.product_id];
        const techDesc = (lang === "en" && product?.descricao_tecnica_en) ? product.descricao_tecnica_en : product?.descricao_tecnica;
        const showTechDesc = product?.show_tech_desc_pdf && techDesc;
        const displayName = (lang === "en" && product?.nome_en) ? product.nome_en : item.product_name;
        itemsHTML += `
          <tr>
            <td class="center">${idx++}</td>
            <td>${item.product_code}</td>
            <td>${displayName}${item.notes ? `<br><small>${item.notes}</small>` : ""}${showTechDesc ? `<br><small class="tech-desc">${techDesc}</small>` : ""}</td>
            <td class="center">${item.quantity}</td>
            ${hideUnitPrices ? "" : `<td class="right">${formatCurrency(item.total_price)}</td>`}
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
        ${quote.discount_percent > 0 ? (quote.hide_discount_value ? `
        <div class="totals-row discount">
          <span>${lang === "en" ? "Discount applied" : "Desconto aplicado"}</span>
          <span></span>
        </div>` : `
        <div class="totals-row discount">
          <span>${t.discount} (${Number(quote.discount_percent).toFixed(1)}%)</span>
          <span>-${formatBrl(quote.discount_value)} / -${formatUsd(discountUsd)}</span>
        </div>`) : ""}
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
        ${quote.discount_percent > 0 ? (quote.hide_discount_value ? `
        <div class="totals-row discount">
          <span>${lang === "en" ? "Discount applied" : "Desconto aplicado"}</span>
          <span></span>
        </div>` : `
        <div class="totals-row discount">
          <span>${t.discount} (${Number(quote.discount_percent).toFixed(1)}%)</span>
          <span>-${formatCurrency(quote.discount_value)}</span>
        </div>`) : ""}
        <div class="totals-row total">
          <span>${t.total}</span>
          <span>${formatCurrency(quote.total)}</span>
        </div>
      </div>
    </div>`;
  }

  // Items table header
  const tableHeaderHTML = isInternationalUsd && usdRate ? (hideUnitPrices ? `
    <tr>
      <th class="center" style="width:35px">#</th>
      <th style="width:90px">${t.code}</th>
      <th>${t.description}</th>
      <th class="center" style="width:40px">${t.qty}</th>
    </tr>` : `
    <tr>
      <th class="center" style="width:35px">#</th>
      <th style="width:90px">${t.code}</th>
      <th>${t.description}</th>
      <th class="center" style="width:40px">${t.qty}</th>
      <th class="right" style="width:100px">${t.unit_intl_brl}</th>
      <th class="right" style="width:100px">${t.total_brl}</th>
      <th class="right" style="width:100px">${t.est_usd}</th>
    </tr>`) : (hideUnitPrices ? `
    <tr>
      <th class="center" style="width:40px">#</th>
      <th style="width:100px">${t.code}</th>
      <th>${t.description}</th>
      <th class="center" style="width:50px">${t.qty}</th>
    </tr>` : `
    <tr>
      <th class="center" style="width:40px">#</th>
      <th style="width:100px">${t.code}</th>
      <th>${t.description}</th>
      <th class="center" style="width:50px">${t.qty}</th>
      <th class="right" style="width:110px">${t.total}</th>
    </tr>`);

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
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; line-height: 1.5; }

  /* Print toolbar - hidden during print */
  .print-toolbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    background: #0047AB; color: white; padding: 12px 24px;
    display: flex; align-items: center; justify-content: center; gap: 16px;
    font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }
  .print-toolbar button {
    background: white; color: #0047AB; border: none; padding: 8px 24px;
    border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer;
  }
  .print-toolbar button:hover { background: #e8eef7; }
  .print-toolbar p { margin: 0; opacity: 0.85; font-size: 12px; }

   @media print {
    .print-toolbar { display: none !important; }
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
  }

  /* Fixed header on all content pages (hidden behind covers via z-index) */
  .page-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 6px 15mm;
    font-size: 7px;
    color: #999;
    text-align: right;
    z-index: 10;
    background: white;
  }

  /* Content pages get padding to simulate margins */
  .content-page {
    padding: 20mm 15mm 20mm 15mm;
    width: 100%;
    box-sizing: border-box;
    page-break-after: always;
  }

  /* Fixed footer removed — now inline only on final page */

   /* Footer is hidden on cover/backcover via z-index: cover images (z-index:20) sit above footer (z-index:10) */

  /* Cover & backcover full-bleed pages */
  .cover-page, .backcover-page {
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 0;
    position: relative;
    page-break-after: always;
    overflow: hidden;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
   .cover-bg-img {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    object-fit: cover;
    display: block;
    z-index: 20;
  }
  .cover-overlay {
    position: absolute;
    top: 40px;
    right: 40px;
    text-align: right;
    color: #1a365d;
    font-size: 11px;
    opacity: 1;
    line-height: 1.8;
    font-family: 'Segoe UI', Arial, sans-serif;
    letter-spacing: 0.3px;
     z-index: 21;
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

  /* Scope table */
  .scope-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .scope-table th { background: #0047AB; color: white; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; }
  .scope-table td { padding: 6px 12px; border-bottom: 1px solid #e0e0e0; font-size: 10px; }
  .scope-table tr:nth-child(even) { background: #f0f4fa; }
  .scope-table .label-cell { font-weight: 600; color: #333; width: 45%; }

  /* Panel list */
  .panel-list { list-style: none; padding: 0; margin: 8px 0; }
  .panel-list li { padding: 4px 0 4px 20px; position: relative; font-size: 10px; line-height: 1.5; }
  .panel-list li::before { content: "\\2713"; position: absolute; left: 0; color: #0047AB; font-weight: bold; }

  .motor-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .motor-table th { background: #0047AB; color: white; padding: 6px 10px; text-align: left; font-size: 10px; }
  .motor-table td { padding: 5px 10px; border-bottom: 1px solid #e0e0e0; font-size: 10px; }
  .motor-table tr:nth-child(even) { background: #f0f4fa; }

  /* Summary box */
  .summary-box { background: #f7f8fa; border: 1px solid #d0d5dd; border-radius: 4px; padding: 10px 14px; margin-bottom: 14px; }
  .summary-box .summary-title { font-size: 11px; font-weight: 700; color: #0047AB; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #ddd; padding-bottom: 3px; margin-bottom: 6px; }
  .summary-box .summary-items { list-style: none; padding: 0; margin: 0 0 6px 0; }
  .summary-box .summary-items li { font-size: 9.5px; padding: 1px 0 1px 14px; position: relative; color: #333; }
  .summary-box .summary-items li::before { content: "•"; position: absolute; left: 2px; color: #0047AB; font-weight: bold; }
  .summary-box .summary-totals { font-size: 10px; border-top: 1px solid #ddd; padding-top: 4px; margin-top: 2px; }
  .summary-box .summary-totals .summary-total-row { display: flex; justify-content: space-between; padding: 1px 0; }
  .summary-box .summary-totals .summary-total-row.grand { font-weight: 700; color: #0047AB; font-size: 11px; }
  .summary-box .summary-totals .summary-total-row.discount { color: #c0392b; }

  /* Warranty */
  .warranty-section { page-break-inside: avoid; }
  .warranty-intro { font-size: 10px; line-height: 1.6; margin-bottom: 8px; color: #333; }
  .warranty-list { list-style: none; padding: 0; margin: 8px 0; }
  .warranty-list li { padding: 4px 0 4px 20px; position: relative; font-size: 10px; line-height: 1.5; }
  .warranty-list li::before { content: "\\2022"; position: absolute; left: 6px; color: #0047AB; font-weight: bold; }
  .warranty-terms { font-size: 10px; font-weight: 600; color: #0047AB; margin-top: 8px; line-height: 1.6; }

  .final-page {
    display: flex;
    flex-direction: column;
    min-height: calc(297mm - 40mm);
  }
</style>
</head>
<body>
  <!-- PRINT TOOLBAR -->
  <div class="print-toolbar">
    <button onclick="window.print()">📄 Salvar como PDF</button>
    <p>Clique no botão acima e selecione "Salvar como PDF" no destino da impressora</p>
  </div>

  <!-- CAPA -->
  <div class="cover-page">
    <img src="${PDF_COVER_URL}" class="cover-bg-img" alt="Capa" />
    <div class="cover-overlay">
      ${lang === "en" ? "Proposal" : "Proposta"} nº ${quote.quote_number}<br>
      ${clientName}<br>
      ${clientCityUf ? `${clientCityUf}<br>` : ""}
      ${lang === "en" ? "Issued on" : "Emitida em"}: ${coverDate}
    </div>
  </div>

  <!-- FIXED HEADER (repeats on all printed pages, hidden behind covers) -->
  <div class="page-header">
    ${t.generated_on} ${formatDate(new Date().toISOString())} ${t.by} ${creator?.name || "Sistema"} (${creator?.email || ""})
  </div>

  <!-- Footer removed from here — now inline only on final page -->

  <!-- CONTEÚDO - PÁGINA 1: Cliente / Projeto / Itens / Totais -->
  <div class="content-page">
  ${buildPageHeader(quote, companyName, companySubtitle, companyPhone, companyEmail, companyWebsite, companyCrea, statusLabel, validityDate, t)}

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
        ${itemsHTML || `<tr><td colspan="${hideUnitPrices ? 4 : (isInternationalUsd ? 7 : 5)}" class="center">${t.no_items}</td></tr>`}
      </tbody>
    </table>

    ${totalsHTML}
    ${disclaimerHTML}
  </div>

  </div><!-- end content-page 1 -->

  ${buildContentPage2HTML(quote, items, productsMap, quotePanelItems, defaultPanelItems, t, lang, companyName, companySubtitle, companyPhone, companyEmail, companyWebsite, companyCrea, statusLabel, validityDate)}

  ${buildFinalPageHTML(quote, items, productsMap, client, companyName, companySubtitle, companyPhone, companyEmail, companyWebsite, companyCrea, statusLabel, validityDate, t, lang, isInternationalUsd, co)}

  <!-- CONTRACAPA -->
  <div class="backcover-page" style="page-break-before: always;">
    <img src="${PDF_BACKCOVER_URL}" class="cover-bg-img" alt="Contracapa" />
  </div>
</body>
</html>`;
}

// ── Page Header (repeated on every content page) ──
function buildPageHeader(quote: any, companyName: string, companySubtitle: string, companyPhone: string, companyEmail: string, companyWebsite: string, companyCrea: string, statusLabel: string, validityDate: Date, t: Translations): string {
  const formatDateSimple = (d: string) => {
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  };
  return `
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
        ${t.date}: ${formatDateSimple(quote.created_at)}<br>
        ${t.validity}: ${formatDateSimple(validityDate.toISOString())}<br>
        Status: ${statusLabel}
      </div>
    </div>
  </div>`;
}

// ── Content Page 2 (optional: Scope + Panel) ──
function buildContentPage2HTML(quote: any, items: any[], productsMap: Record<string, any>, quotePanelItems: any[], defaultPanelItems: any[], t: Translations, lang: string, companyName: string, companySubtitle: string, companyPhone: string, companyEmail: string, companyWebsite: string, companyCrea: string, statusLabel: string, validityDate: Date): string {
  const scopeHTML = buildScopeHTML(quote, items, productsMap, t, lang);
  const panelHTML = buildPanelHTML(quote, quotePanelItems, defaultPanelItems, productsMap, items, t, lang);
  if (!scopeHTML && !panelHTML) return "";
  return `
  <div class="content-page">
    ${scopeHTML}
    ${panelHTML}
  </div>`;
}

// ── Final Page (always: Conditions + Warranty + Validity + Signatures) ──
function buildFinalPageHTML(quote: any, items: any[], productsMap: Record<string, any>, client: any, companyName: string, companySubtitle: string, companyPhone: string, companyEmail: string, companyWebsite: string, companyCrea: string, statusLabel: string, validityDate: Date, t: Translations, lang: string, isInternationalUsd: boolean, co: any): string {
  // Truncate notes if too long
  let notesText = quote.notes || "";
  if (notesText.length > 1500) {
    notesText = notesText.substring(0, 1500) + " (...)";
  }

  const formatDateSimple = (d: string) => {
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  };

  const warrantyHTML = buildWarrantyHTML(quote, items, productsMap, t, lang);

  // Build summary box
  const categoryLabels: Record<string, string> = {
    grua: t.cat_grua, configuracao: t.cat_configuracao, torre: t.cat_torre,
    tramo: t.cat_tramo, chassis: t.cat_chassis, acessorio: t.cat_acessorio,
  };
  const formatCurrency = (value: number) => {
    const symbols: Record<string, string> = { BRL: "R$", USD: "US$", EUR: "€" };
    const sym = symbols[quote.currency] || quote.currency;
    return `${sym} ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const summaryItems = (items || []).map((item: any) => {
    const catLabel = categoryLabels[item.product_category] || item.product_category;
    return `<li>${catLabel} - ${item.product_name} (x${item.quantity})</li>`;
  }).join("");

  let summaryTotals = `<div class="summary-total-row"><span>${lang === "en" ? "Subtotal" : "Subtotal"}:</span><span>${formatCurrency(quote.subtotal)}</span></div>`;
  if (quote.discount_percent > 0) {
    if (quote.hide_discount_value) {
      summaryTotals += `<div class="summary-total-row discount"><span>${lang === "en" ? "Discount applied" : "Desconto aplicado"}</span><span></span></div>`;
    } else {
      summaryTotals += `<div class="summary-total-row discount"><span>${lang === "en" ? "Discount" : "Desconto"} (${quote.discount_percent}%):</span><span>-${formatCurrency(quote.discount_value)}</span></div>`;
    }
  }
  summaryTotals += `<div class="summary-total-row grand"><span>Total:</span><span>${formatCurrency(quote.total)}</span></div>`;

  if (isInternationalUsd && quote.usd_brl_rate_used) {
    const usdRate = Number(quote.usd_brl_rate_used);
    const totalUsd = quote.total / usdRate;
    summaryTotals += `<div class="summary-total-row" style="font-size:9px;color:#666;"><span>${lang === "en" ? "Estimated (USD):" : "Estimado (USD):"}</span><span>US$ ${totalUsd.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>`;
  }

  const summaryBoxHTML = `
  <div class="summary-box">
    <div class="summary-title">${lang === "en" ? "PROPOSAL SUMMARY" : "RESUMO DA PROPOSTA"}</div>
    <ul class="summary-items">${summaryItems}</ul>
    <div class="summary-totals">${summaryTotals}</div>
  </div>`;

  return `
  <div class="content-page final-page">
    <div>
    ${summaryBoxHTML}

    <div class="section conditions">
      <div class="section-title">${t.conditions}</div>
      <div class="conditions-grid">
        <div><span class="label">${t.currency_label}:</span> <span class="value">${quote.currency}</span></div>
        <div><span class="label">${t.validity_label}:</span> <span class="value">${quote.validity_days} ${t.days}</span></div>
        ${quote.delivery_time ? `<div><span class="label">${t.delivery}:</span> <span class="value">${quote.delivery_time}</span></div>` : ""}
        ${quote.payment_terms ? `<div><span class="label">${t.payment}:</span> <span class="value">${quote.payment_terms}</span></div>` : ""}
        ${quote.freight_terms ? `<div><span class="label">${t.freight}:</span> <span class="value">${quote.freight_terms}</span></div>` : ""}
      </div>
      ${buildPaymentTopicsHTML(quote, lang)}
      ${notesText ? `<div style="margin-top:6px"><span class="label">${t.notes}:</span> <span class="value">${notesText}</span></div>` : ""}
    </div>

    ${warrantyHTML}

    <div class="section">
      <div class="section-title">${lang === "en" ? "PROPOSAL VALIDITY" : "VALIDADE DA PROPOSTA"}</div>
      <p style="font-size: 10px; line-height: 1.6;">
        ${lang === "en"
          ? `This proposal is valid for <strong>${quote.validity_days} days</strong> from the date of issue (${formatDateSimple(quote.created_at)}), expiring on <strong>${formatDateSimple(validityDate.toISOString())}</strong>.`
          : `Esta proposta é válida por <strong>${quote.validity_days} dias</strong> a contar da data de emissão (${formatDateSimple(quote.created_at)}), expirando em <strong>${formatDateSimple(validityDate.toISOString())}</strong>.`
        }
      </p>
    </div>

    <div class="signature" style="margin-top: 30px;">
      <div style="text-align: center; width: 220px;">
        <div style="border-top: 1px solid #333; padding-top: 6px; font-size: 10px; font-weight: 600;">${companyName}</div>
        <div style="font-size: 9px; color: #666; margin-top: 2px;">${lang === "en" ? "Supplier" : "Fornecedor"}</div>
      </div>
      <div style="text-align: center; width: 220px;">
        <div style="border-top: 1px solid #333; padding-top: 6px; font-size: 10px; font-weight: 600;">${client?.razao_social || (lang === "en" ? "Client" : "Cliente")}</div>
        <div style="font-size: 9px; color: #666; margin-top: 2px;">${lang === "en" ? "Client" : "Cliente"}</div>
      </div>
    </div>

    <div style="text-align: center; margin-top: 20px; font-size: 9px; color: #555; font-style: italic;">
      ${lang === "en"
        ? "In agreement with the proposal presented above, we give our acceptance on the date ___/___/______."
        : "Em acordo com a proposta acima apresentada, damos nosso aceite na data ___/___/______."}
    </div>

    ${isInternationalUsd ? `<div style="margin-top: 16px; font-size: 9px; color: #7d6608; text-align: center; font-style: italic;">${t.usd_disclaimer}</div>` : ""}
    </div>

    <div class="footer" style="margin-top: auto;">
      <div class="company-legal">${co.razao_social || companyName}</div>
      ${co.cnpj ? `CNPJ: ${co.cnpj}` : ""}${co.address ? ` · ${co.address}` : ""}
      <div class="footer-logos">
        <img src="${YELUM_LOGO_URL}" alt="Yelum Seguradora" />
        <img src="${CREA_LOGO_URL}" alt="CREA-GO" />
      </div>
    </div>
  </div>`;
}

// ── Payment Topics ──
function buildPaymentTopicsHTML(quote: any, lang: string): string {
  const items = quote.payment_terms_items;
  if (!items || !Array.isArray(items) || items.length === 0) return "";
  const filtered = items.filter((i: any) => i.text && i.text.trim());
  if (filtered.length === 0) return "";
  const title = lang === "en" ? "Payment Terms" : "Condições de Pagamento";
  return `
  <div style="margin-top: 6px;">
    <span class="label">${title}:</span>
    <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 10px; line-height: 1.6;">
      ${filtered.map((i: any) => `<li>${i.text}</li>`).join("")}
    </ul>
  </div>`;
}


function formatKg(val: number | null | undefined): string {
  if (val == null) return "";
  return `${Number(val).toLocaleString("pt-BR")} kg`;
}

// ── ESCOPO DO FORNECIMENTO ──
function buildScopeHTML(quote: any, items: any[], productsMap: Record<string, any>, t: Translations, lang: string): string {
  const gruaItem = items.find((i: any) => i.product_category === "grua");
  if (!gruaItem) return "";
  const product = productsMap[gruaItem.product_id] || {};
  const modelName = gruaItem.product_name || "";
  const resolve = (qf: string, pf: string) => {
    if (quote.spec_override_enabled && quote[qf]) return quote[qf];
    if (product[pf]) return product[pf];
    return null;
  };
  const rows: [string, string | null][] = [
    [t.scope_type, resolve("spec_tipo", "spec_tipo")],
    [t.scope_jib_length, gruaItem.grua_lanca_m ? `${gruaItem.grua_lanca_m} m` : (quote.grua_lanca_m ? `${quote.grua_lanca_m} m` : null)],
    [t.scope_tower_height, gruaItem.grua_altura_torre_m ? `${gruaItem.grua_altura_torre_m} m` : (quote.grua_altura_torre_m ? `${quote.grua_altura_torre_m} m` : null)],
    [t.scope_working_height, gruaItem.grua_altura_trabalho_m ? `${gruaItem.grua_altura_trabalho_m} m` : (quote.grua_altura_trabalho_m ? `${quote.grua_altura_trabalho_m} m` : null)],
    [t.scope_tip_load, gruaItem.grua_carga_ponta_kg ? formatKg(gruaItem.grua_carga_ponta_kg) : (quote.grua_carga_ponta_kg ? formatKg(quote.grua_carga_ponta_kg) : null)],
    [t.scope_max_load, gruaItem.grua_carga_maxima_kg ? formatKg(gruaItem.grua_carga_maxima_kg) : (quote.grua_carga_maxima_kg ? formatKg(quote.grua_carga_maxima_kg) : null)],
    [t.scope_vel_elevation, resolve("spec_vel_elevacao", "spec_vel_elevacao")],
    [t.scope_vel_rotation, resolve("spec_vel_rotacao", "spec_vel_rotacao")],
    [t.scope_vel_translation, resolve("spec_vel_translacao", "spec_vel_translacao")],
  ];
  const filledRows = rows.filter(([_, v]) => v != null && v !== "");
  if (filledRows.length === 0) return "";
  const rowsHTML = filledRows.map(([label, value]) => `<tr><td class="label-cell">${label}</td><td>${value}</td></tr>`).join("");
  return `
  <div class="section" style="page-break-inside: avoid;">
    <div class="section-title">${t.scope_title}: ${modelName}</div>
    <table class="scope-table">
      <thead><tr><th colspan="2">${lang === "en" ? "DESCRIPTION" : "DESCRIÇÃO"}</th></tr></thead>
      <tbody>${rowsHTML}</tbody>
    </table>
  </div>`;
}

// ── ITENS INTEGRANTES DO PAINEL ──
function buildPanelHTML(quote: any, quotePanelItems: any[], defaultPanelItems: any[], productsMap: Record<string, any>, items: any[], t: Translations, lang: string): string {
  const panelItems = quotePanelItems.length > 0 ? quotePanelItems : defaultPanelItems;
  const hasVoltage = quote.panel_voltage && quote.panel_voltage !== "";
  const hasMotors = quote.panel_include_motors;
  const hasPotenciaTotal = quote.panel_potencia_total != null;
  if (panelItems.length === 0 && !hasVoltage && !hasMotors && !hasPotenciaTotal) return "";
  let listHTML = panelItems.map((pi: any) => `<li>${pi.item_text}</li>`).join("");
  
  // Voltage + Potência total on same line
  if (hasVoltage || hasPotenciaTotal) {
    let voltPotLine = "";
    if (hasVoltage) voltPotLine += `${t.panel_voltage_label}: ${quote.panel_voltage}V`;
    if (hasVoltage && hasPotenciaTotal) voltPotLine += " — ";
    if (hasPotenciaTotal) voltPotLine += `${lang === "en" ? "Total power" : "Potência total"}: ${quote.panel_potencia_total} kW`;
    listHTML += `<li>${voltPotLine}</li>`;
  }

  let motorHTML = "";
  if (hasMotors) {
    const gruaItem = items.find((i: any) => i.product_category === "grua");
    const product = productsMap[gruaItem?.product_id] || {};
    const resolveMotor = (qKw: string, qHp: string, qVel: string, pKw: string, pHp: string, pVel: string) => {
      const kw = quote[qKw] ?? product[pKw] ?? null;
      const hp = quote[qHp] ?? product[pHp] ?? null;
      const vel = quote[qVel] || product[pVel] || "";
      if (!kw && !hp && !vel) return null;
      const parts: string[] = [];
      if (kw) parts.push(`${kw} daN.m`);
      if (hp) parts.push(`${hp} HP`);
      const spec = parts.join(" / ");
      return vel ? `${spec} - ${vel}` : spec;
    };
    const motorRows: [string, string | null][] = [
      [t.panel_motor_elevation, resolveMotor("panel_motor_elev_kw", "panel_motor_elev_hp", "panel_motor_elev_vel", "default_motor_elev_kw", "default_motor_elev_hp", "default_motor_elev_vel")],
      [t.panel_motor_translation, resolveMotor("panel_motor_trans_kw", "panel_motor_trans_hp", "panel_motor_trans_vel", "default_motor_trans_kw", "default_motor_trans_hp", "default_motor_trans_vel")],
      [t.panel_motor_rotation, resolveMotor("panel_motor_rot_kw", "panel_motor_rot_hp", "panel_motor_rot_vel", "default_motor_rot_kw", "default_motor_rot_hp", "default_motor_rot_vel")],
    ];
    const filledMotors = motorRows.filter(([_, v]) => v != null);
    if (filledMotors.length > 0) {
      motorHTML = `<table class="motor-table"><thead><tr><th>${t.panel_motor_item}</th><th>${t.panel_motor_spec}</th></tr></thead><tbody>${filledMotors.map(([l, s]) => `<tr><td>${l}</td><td>${s}</td></tr>`).join("")}</tbody></table>`;
    }
  }
  return `
  <div class="section" style="page-break-inside: avoid;">
    <div class="section-title">${t.panel_title}</div>
    <ul class="panel-list">${listHTML}</ul>
    ${motorHTML}
  </div>`;
}

// ── GARANTIA ──
function buildWarrantyHTML(quote: any, items: any[], productsMap: Record<string, any>, t: Translations, lang: string): string {
  const gruaItem = items.find((i: any) => i.product_category === "grua");
  const product = productsMap[gruaItem?.product_id] || {};
  const sy = quote.warranty_struct_years ?? product.default_warranty_struct_years ?? 3;
  const cy = quote.warranty_components_years ?? product.default_warranty_components_years ?? 1;
  const allZero = sy === 0 && cy === 0;
  const pl = (n: number) => n === 1 ? t.warranty_year_singular : t.warranty_year_plural;
  let termsPhrase = "";
  if (allZero) { termsPhrase = t.warranty_not_included; }
  else {
    const parts: string[] = [];
    if (sy > 0) parts.push(`${sy} ${pl(sy)} ${t.warranty_structural}`);
    if (cy > 0) parts.push(`${cy} ${pl(cy)} ${t.warranty_components}`);
    if (parts.length === 1) termsPhrase = parts[0];
    else termsPhrase = `${parts[0]} ${lang === "en" ? "and" : "e"} ${parts[1]}`;
  }
  return `
  <div class="section warranty-section">
    <div class="section-title">${t.warranty_title}</div>
    <p class="warranty-intro">${t.warranty_intro}</p>
    <ul class="warranty-list">
      ${!allZero ? `<li>${t.warranty_certificate} <strong>${termsPhrase}</strong></li>` : `<li>${t.warranty_not_included}</li>`}
      <li>${t.warranty_delivery}</li>
      <li>${t.warranty_maintenance}</li>
      <li>${t.warranty_norms}</li>
    </ul>
    ${!allZero ? `<div class="warranty-terms">${termsPhrase}.</div>` : ""}
  </div>`;
}
