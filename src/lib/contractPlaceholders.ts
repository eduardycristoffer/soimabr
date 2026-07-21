// Placeholder resolver for contract clauses
// Substitutes {{campo}} tokens using data from quote, client, company_settings, and dialog inputs.

export interface PaymentScheduleItem {
  label: string;
  value: number;
  due: string; // free text (data ou marco)
}

export interface ContractGenerationInputs {
  // buyer legal representative (mandatory)
  buyer_rep_name: string;
  buyer_rep_cpf: string;
  buyer_rep_rg?: string;
  buyer_rep_cargo?: string;
  // seller legal rep overrides (opcional)
  seller_rep_name?: string;
  seller_rep_cpf?: string;
  seller_rep_rg?: string;
  seller_rep_cargo?: string;
  // contract managers
  seller_manager_name?: string;
  seller_manager_cpf?: string;
  seller_manager_phone?: string;
  seller_manager_email?: string;
  buyer_manager_name?: string;
  buyer_manager_cpf?: string;
  buyer_manager_phone?: string;
  buyer_manager_email?: string;
  // payment
  payment_schedule: PaymentScheduleItem[];
  delivery_days?: number;
}

const brl = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

// ── Extenso pt-BR (simplificado, cobre até bilhões) ──
const UNI = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
  "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEN = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), d = Math.floor((n % 100) / 10), u = n % 10;
  const parts: string[] = [];
  if (c) parts.push(CEN[c]);
  if (n % 100 < 20 && n % 100 > 0) parts.push(UNI[n % 100]);
  else {
    if (d) parts.push(DEZ[d]);
    if (u) parts.push(UNI[u]);
  }
  return parts.join(" e ");
}

export function numeroPorExtenso(valor: number): string {
  const inteiro = Math.floor(Math.abs(valor));
  const centavos = Math.round((Math.abs(valor) - inteiro) * 100);
  if (inteiro === 0 && centavos === 0) return "zero reais";
  const grupos = [
    { div: 1_000_000_000, sing: "bilhão", plu: "bilhões" },
    { div: 1_000_000, sing: "milhão", plu: "milhões" },
    { div: 1_000, sing: "mil", plu: "mil" },
    { div: 1, sing: "", plu: "" },
  ];
  let restante = inteiro;
  const partes: string[] = [];
  for (const g of grupos) {
    const q = Math.floor(restante / g.div);
    restante = restante % g.div;
    if (q > 0) {
      const txt = ate999(q);
      const nome = g.sing ? ` ${q === 1 ? g.sing : g.plu}` : "";
      partes.push(txt + nome);
    }
  }
  const reais = inteiro === 1 ? "real" : "reais";
  let out = partes.join(", ") + " " + reais;
  if (centavos > 0) {
    const cTxt = ate999(centavos);
    out += ` e ${cTxt} ${centavos === 1 ? "centavo" : "centavos"}`;
  }
  return out;
}

function itensInclusosTabela(items: any[]): string {
  if (!items || items.length === 0) return "_(sem itens)_";
  const rows = items.map((i) => `- ${i.quantity}x ${i.product_name}`);
  return rows.join("\n");
}

function servicosInclusosLista(items: any[], quote: any): string {
  const svcItems = (items || []).filter((i) =>
    ["servico", "montagem", "frete", "transporte", "operador", "manutencao"].includes(
      String(i.product_category || "").toLowerCase(),
    ),
  );
  const bullets: string[] = svcItems.map((i) => `- ${i.quantity}x ${i.product_name}`);
  if (quote?.rental_operator_included) bullets.push("- Operador incluso");
  if (quote?.rental_maintenance_included) bullets.push("- Manutenção preventiva inclusa");
  if (quote?.rental_technical_assistance) bullets.push("- Assistência técnica inclusa");
  if (quote?.rental_insurance_included) bullets.push("- Seguro incluso");
  if (Number(quote?.rental_mobilization || 0) > 0) bullets.push("- Mobilização inclusa");
  if (Number(quote?.rental_assembly || 0) > 0) bullets.push("- Montagem inclusa");
  if (Number(quote?.rental_disassembly || 0) > 0) bullets.push("- Desmontagem inclusa");
  if (Number(quote?.rental_freight || 0) > 0) bullets.push("- Frete incluso");
  if (bullets.length === 0) return "_(nenhum serviço adicional incluso além do fornecimento do equipamento)_";
  return bullets.join("\n");
}

function pagamentoTabela(schedule: PaymentScheduleItem[]): string {
  if (!schedule || schedule.length === 0) return "_(condições a definir)_";
  const linhas = schedule.map((p, idx) => `${idx + 1}. **${p.label}** — ${brl(p.value)} — ${p.due}`);
  const total = schedule.reduce((s, p) => s + (p.value || 0), 0);
  linhas.push(`\n**Total:** ${brl(total)}`);
  return linhas.join("\n");
}

function clientRazao(client: any): string {
  return client?.razao_social || client?.nome_fantasia || client?.name || "";
}

function clientDoc(client: any): string {
  return client?.cnpj || client?.cpf || "";
}

export function buildPlaceholderMap(params: {
  quote: any;
  client: any;
  company: any;
  items: any[];
  inputs: ContractGenerationInputs;
  contract_number: string;
}): Record<string, string> {
  const { quote, client, company, items, inputs, contract_number } = params;

  const total = Number(quote.total || 0);
  const isRental = quote.quote_type === "locacao";

  return {
    // vendedora
    vendedora_razao_social: company?.razao_social || "",
    vendedora_cnpj: company?.cnpj || "",
    vendedora_ie: company?.inscricao_estadual || "—",
    vendedora_endereco: company?.address || "",
    vendedora_email: company?.email || "",
    vendedora_representante_nome: inputs.seller_rep_name || company?.representante_nome || "",
    vendedora_representante_cpf: inputs.seller_rep_cpf || company?.representante_cpf || "",
    vendedora_representante_rg: inputs.seller_rep_rg || company?.representante_rg || "",
    vendedora_representante_cargo: inputs.seller_rep_cargo || company?.representante_cargo || "",
    // compradora
    compradora_razao_social: clientRazao(client),
    compradora_cnpj_cpf: clientDoc(client),
    compradora_endereco: client?.endereco || client?.address || "",
    compradora_cidade: client?.cidade || "",
    compradora_estado: client?.estado || client?.uf || "",
    compradora_cep: client?.cep || "",
    compradora_email: client?.email || "",
    compradora_representante_nome: inputs.buyer_rep_name || "",
    compradora_representante_cpf: inputs.buyer_rep_cpf || "",
    compradora_representante_rg: inputs.buyer_rep_rg || "—",
    compradora_representante_cargo: inputs.buyer_rep_cargo || "—",
    // equipamento
    equipamento_tipo: isRental ? "grua torre" : "grua torre",
    equipamento_marca: "SOÍMA BRASIL",
    equipamento_modelo: quote.grua_modelo || items?.find((i) => i.product_category === "grua")?.product_name || "—",
    lanca_m: String(quote.grua_lanca_m ?? "—"),
    altura_torre_m: String(quote.grua_altura_torre_m ?? "—"),
    carga_maxima_kg: String(quote.grua_carga_maxima_kg ?? "—"),
    carga_ponta_kg: String(quote.grua_carga_ponta_kg ?? "—"),
    itens_inclusos_tabela: itensInclusosTabela(items),
    servicos_inclusos_lista: servicosInclusosLista(items, quote),
    // valores
    valor_total_numerico: brl(total),
    valor_total_extenso: numeroPorExtenso(total),
    condicoes_pagamento_tabela: pagamentoTabela(inputs.payment_schedule),
    // prazos
    prazo_entrega_dias: String(inputs.delivery_days ?? quote.delivery_time ?? "—"),
    garantia_estrutural_anos: String(quote.warranty_struct_years ?? "—"),
    garantia_eletrica_anos: String(quote.warranty_components_years ?? "—"),
    // gestores
    gestor_vendedora_nome: inputs.seller_manager_name || "",
    gestor_vendedora_cpf: inputs.seller_manager_cpf || "",
    gestor_vendedora_telefone: inputs.seller_manager_phone || "",
    gestor_vendedora_email: inputs.seller_manager_email || "",
    gestor_compradora_nome: inputs.buyer_manager_name || "",
    gestor_compradora_cpf: inputs.buyer_manager_cpf || "",
    gestor_compradora_telefone: inputs.buyer_manager_phone || "",
    gestor_compradora_email: inputs.buyer_manager_email || "",
    // meta
    foro_cidade: "Anápolis-GO",
    data_contrato: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
    numero_contrato: contract_number,
    // rental-specific
    rental_duration_months: String(quote.rental_duration_months ?? "—"),
    rental_monthly_value: brl(Number(quote.rental_monthly_value || 0)),
    rental_mobilization: brl(Number(quote.rental_mobilization || 0)),
    rental_demobilization: brl(Number(quote.rental_demobilization || 0)),
    rental_freight: brl(Number(quote.rental_freight || 0)),
    rental_assembly: brl(Number(quote.rental_assembly || 0)),
    rental_disassembly: brl(Number(quote.rental_disassembly || 0)),
    rental_operator_included: quote.rental_operator_included ? "Sim" : "Não",
    rental_maintenance_included: quote.rental_maintenance_included ? "Sim" : "Não",
    rental_insurance_included: quote.rental_insurance_included ? "Sim" : "Não",
    rental_technical_assistance: quote.rental_technical_assistance ? "Sim" : "Não",
    rental_start_date: quote.rental_start_date
      ? new Date(quote.rental_start_date).toLocaleDateString("pt-BR")
      : "—",
    rental_terrain_condition: quote.rental_terrain_condition || "—",
    rental_special_foundation: quote.rental_special_foundation ? "Sim" : "Não",
    rental_work_type: quote.rental_work_type || "—",
    rental_height_needed: String(quote.rental_height_needed ?? "—"),
    rental_jib_needed: String(quote.rental_jib_needed ?? "—"),
    rental_max_weight: String(quote.rental_max_weight ?? "—"),
    rental_tax_percent: String(quote.rental_tax_percent ?? "0"),
  };
}

export function resolvePlaceholders(body: string, map: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key) => {
    const v = map[key];
    return v == null || v === "" ? "—" : v;
  });
}
