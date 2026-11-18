/**
 * Proposta de serviço (modelo TECSU): serviços técnicos de montagem, manutenção e operação de grua.
 *
 * Fica guardada na própria tabela `quotes` (quote_type = 'servico'), para aproveitar tudo o que
 * já existe: lista de propostas, PDF, envio por e-mail, relatórios e geração de contrato.
 *  - dados da proposta (objeto, equipamento, responsabilidades...) → `quotes.service_data` (JSON);
 *  - linhas de preço → `quote_items` (com `unit` e `is_optional`).
 *
 * Tudo aqui é função pura (sem banco), por isso é testado à parte.
 */

export const SERVICE_UNITS = ["Vb", "Hs", "Mês", "Dia", "Único", "Un"] as const;

/** Linha de preço da proposta. */
export interface ServiceItem {
  /** só para a tela (chave do React); não vai para o banco */
  id: string;
  description: string;
  unit: string;
  /** vazio = "sob medição": o preço unitário vale, mas a quantidade só se sabe na execução */
  quantity: number | null;
  unit_price: number;
  /** opcional: aparece na proposta, mas NÃO entra no total */
  is_optional: boolean;
  /** observação logo abaixo da descrição (ex.: "Por furo", "Adicional em dias não úteis: 50%") */
  note: string;
}

export interface ServiceKV {
  label: string;
  value: string;
}

export interface ServiceSection {
  title: string;
  text: string;
}

export interface ServiceData {
  version: 1;
  /** quem emite a proposta (slug em company_settings) */
  company_slug: string;
  issue_city: string;
  attention: string;
  subject: string;
  intro: string;
  object_text: string;
  equipment: ServiceKV[];
  site_features: ServiceKV[];
  inclusions: string[];
  payment_text: string;
  client_responsibilities: string[];
  company_responsibilities: string[];
  final_sections: ServiceSection[];
  closing_text: string;
  acceptance_text: string;
  signer_name: string;
  signer_role: string;
}

export const DEFAULT_COMPANY_SLUG = "dacrom";

// ───────────────────────── textos-padrão (modelo TECSU, em linguagem genérica) ─────────────────────────

export const DEFAULT_SUBJECT = "Serviços de montagem industrial, manutenção e operação de grua";

export const DEFAULT_INTRO =
  "Em atenção aos contatos verbais mantidos com V.Sas., formalizamos nossa proposta para prestação de serviços técnicos de engenharia, dando suporte ao uso do equipamento de transporte vertical da obra epigrafada.";

export const DEFAULT_OBJECT_TEXT =
  "Prestação de serviços de montagem e desmontagem industrial, bem como de operação e de manutenções eventuais, conforme recomendação do fabricante e disposições legais, do equipamento identificado abaixo:";

export const DEFAULT_EQUIPMENT_LABELS = [
  "Equipamento",
  "Fabricante",
  "Modelo",
  "Comprimento da lança",
  "Capacidade de carga",
  "Altura inicial",
];

export const DEFAULT_SITE_LABELS = ["Estrutura", "Pavimentos", "Modalidade da grua", "Altura prevista para a grua"];

export const DEFAULT_INCLUSIONS = [
  "Fornecimento de equipe qualificada e certificada, conforme exigência legal;",
  "Emissão de ART – Anotação de Responsabilidade Técnica;",
  "Manutenções eventuais, com a periodicidade requerida pelo plano de manutenção do fabricante do equipamento;",
  "Cumprimento das atividades previstas nesta proposta;",
  "Envio da documentação para integração de todos os funcionários da CONTRATADA que atuarão na obra;",
  "Fornecimento e controle de uso de EPI;",
  "Seguro de vida para os funcionários da CONTRATADA que atuarão na obra.",
];

export const DEFAULT_PAYMENT_TEXT =
  "As medições serão realizadas após a execução dos serviços, com pagamento via crédito em conta em 10 (dez) dias após a emissão da nota fiscal de serviços.\nEsta proposta fará parte de futuro contrato assinado pelas partes.";

export const DEFAULT_CLIENT_RESPONSIBILITIES = [
  "Disponibilização do equipamento na obra (grua), bem como de seus acessórios elétricos, tais como chave disjuntora e cabos elétricos compatíveis com a potência necessária, em energia trifásica de 380 V;",
  "Execução do cálculo estrutural e emissão de ART específica para a base de concreto de fixação da grua;",
  "Execução do aterramento, com ART específica e laudo de atendimento ao isolamento necessário;",
  "Café da manhã dentro do canteiro para os funcionários da CONTRATADA, retendo o custo nas medições;",
  "Munck para movimentação de peças na pré-montagem e no carregamento final;",
  "Guindaste, a ser definido em plano de cargas, para a montagem e a desmontagem da grua;",
  "Sinaleiros/amarradores de carga, devidamente equipados com rádio de comunicação, durante a montagem, a ancoragem e a telescopagem, para as atividades auxiliares em solo;",
  "Furação nas lajes para a passagem das barras roscadas de fixação das ancoragens da grua na edificação;",
  "Fornecimento de todos os materiais, lubrificantes e equipamentos necessários à adaptação à obra, tais como chumbadores parabolt ou barra roscada, cavaletes, escoramentos, placas de fixação e sinalização;",
  "Espaço para vestiário dos funcionários da CONTRATADA e local seguro e abrigado para guardar os equipamentos e ferramentas usados na montagem, na telescopagem e na desmontagem;",
  "Acessórios para içamento de cargas (estropos, cabos, fitas, caçambas de concreto e outros), com certificados de uso;",
  "Documentação técnica compatível com o uso da grua no canteiro, incluindo o PCMAT;",
  "Todo o treinamento de ambientação e os específicos exigidos pela CONTRATANTE;",
  "Seguro do equipamento incorporado à apólice da obra;",
  "Adequação do PCMAT ou PGR da obra, contemplando a grua e suas atividades;",
  "Cumprimento dos deveres e atendimento aos órgãos públicos municipais, estaduais ou federais referentes a taxas, licenças, alvarás, interdição de vias etc., relativos à instalação e ao funcionamento do equipamento no canteiro, arcando com os ônus deles decorrentes.",
];

export const DEFAULT_COMPANY_RESPONSIBILITIES = [
  "Executar os serviços e atividades previstos neste documento com plena observância das normas técnicas, dos dispositivos legais e das instruções técnicas da CONTRATANTE;",
  "Arcar, por sua conta e risco, com todas as despesas e custos necessários à execução deste documento, exceto os que forem de responsabilidade da CONTRATANTE, que deverá ser resguardada de toda e qualquer cobrança, ação ou reclamação decorrente da atividade;",
  "Responsabilizar-se, dentro dos limites legais, por eventuais danos que causar à CONTRATANTE, aos seus funcionários, clientes e/ou terceiros;",
  "Responsabilizar-se pelos tributos decorrentes da execução de suas atividades previstas neste documento.",
];

export const DEFAULT_FINAL_SECTIONS: ServiceSection[] = [
  {
    title: "Manutenções",
    text:
      "A CONTRATADA programará a paralisação da grua por 4 horas, em dia útil, por mês, para a realização da manutenção preventiva. A atividade será agendada e planificada em quadro definido com a gerência da obra, para todo o período da grua no canteiro.\n\nNo caso de manutenção corretiva, a CONTRATADA envidará esforços para minimizar o tempo de paralisação do equipamento e orientará a CONTRATANTE na aquisição e no fornecimento da peça ou de serviços de terceiros (como tornearia e serviços especializados em inversores), para sanar a ocorrência em no máximo 24 horas.",
  },
  {
    title: "Montagens e Desmontagens",
    text:
      "As atividades de montagem e desmontagem foram planejadas com os tempos previstos nos itens da tabela de condições comerciais. Caso algum evento impeça a execução dos serviços por culpa da obra ou por motivos não imputáveis à CONTRATADA, as diárias da equipe de montagem e manutenção à disposição da obra serão cobradas na verba de horas técnicas.",
  },
  {
    title: "Confidencialidade",
    text:
      "As partes se comprometem a guardar o devido sigilo das informações a que tiverem acesso no âmbito desta relação comercial, obrigando-se a não divulgá-las nem fornecê-las a terceiros, sob as penas da lei, salvo quando expressamente autorizadas, e a não utilizá-las para fins diversos do objeto deste documento.",
  },
  {
    title: "Reajuste",
    text:
      "Os preços desta proposta serão reajustados anualmente pela variação indicada no dissídio da categoria sobre as verbas de mão de obra, tendo como data-base a data de assinatura do contrato. Os preços dos serviços de montagem, manutenção e desmontagem não sofrerão reajuste.",
  },
  {
    title: "Retenções",
    text:
      "No caso de retenções de até 10% pela CONTRATANTE, seja para garantia de obrigações trabalhistas ou fiscais, os valores unitários do quadro de condições comerciais sofrerão acréscimo de 5%, para cobrir o custo financeiro gerado pela retenção.",
  },
];

export const DEFAULT_CLOSING_TEXT =
  "Estando à disposição para quaisquer esclarecimentos e retificações que se fizerem necessários, manifestamos nosso agradecimento antecipado pela acolhida e confiança.";

export const DEFAULT_ACCEPTANCE_TEXT =
  "Declaro expressamente ter lido todos os itens desta proposta, com os quais estou de acordo, autorizando a contratação, passando a presente a ter valor de contrato.";

/** Serviços que costumam aparecer — atalho para montar a tabela. NÃO trazem preço: quem define é o comercial. */
export const SERVICE_ITEM_PRESETS: Array<Pick<ServiceItem, "description" | "unit" | "is_optional" | "note"> & { quantity: number | null }> = [
  { description: "Plano de cargas", unit: "Vb", quantity: 1, is_optional: false, note: "" },
  { description: "Montagem da grua", unit: "Vb", quantity: 1, is_optional: false, note: "" },
  { description: "Desmontagem da grua", unit: "Vb", quantity: 1, is_optional: false, note: "" },
  { description: "Telescopagem da torre da grua ascensional", unit: "Vb", quantity: null, is_optional: false, note: "" },
  { description: "Furo em concreto para fixação da ancoragem", unit: "Vb", quantity: null, is_optional: true, note: "Por furo" },
  { description: "Manutenção periódica mensal (realizada em dias úteis)", unit: "Vb", quantity: null, is_optional: false, note: "Adicional para manutenção em dias não úteis: 50%" },
  { description: "Manutenção corretiva (dias úteis, chamadas com mínimo de 3 horas; após esse tempo, acrescida da hora técnica por colaborador)", unit: "Vb", quantity: null, is_optional: false, note: "" },
  { description: "Hora técnica de mecânico (dias úteis)", unit: "Hs", quantity: null, is_optional: false, note: "" },
  { description: "Operação da grua em dias úteis (44 horas semanais, 220 horas por mês)", unit: "Mês", quantity: null, is_optional: true, note: "Adicional de hora extra: 100%" },
  { description: "Treinamento de sinaleiros/amarradores de carga", unit: "Único", quantity: 1, is_optional: true, note: "" },
  { description: "Treinamento para operador (80 horas + 90 dias de supervisão, conforme NR 18)", unit: "Único", quantity: 1, is_optional: true, note: "" },
];

// ───────────────────────── funções de apoio ─────────────────────────

export const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

let seq = 0;
export function newItemId(): string {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  seq += 1;
  return `item-${Date.now()}-${seq}`;
}

export function emptyItem(partial: Partial<ServiceItem> = {}): ServiceItem {
  return {
    id: newItemId(),
    description: "",
    unit: "Vb",
    quantity: 1,
    unit_price: 0,
    is_optional: false,
    note: "",
    ...partial,
  };
}

export type ItemKind = "fixed" | "measured" | "optional";

/**
 * - optional: opcional (não entra no total);
 * - measured: sem quantidade, "sob medição" (só vale o preço unitário);
 * - fixed: quantidade definida → entra no total.
 */
export function itemKind(it: Pick<ServiceItem, "is_optional" | "quantity">): ItemKind {
  if (it.is_optional) return "optional";
  return Number(it.quantity) > 0 ? "fixed" : "measured";
}

/** Valor da linha na tabela (mesmo para opcional com quantidade). */
export function itemLineValue(it: Pick<ServiceItem, "quantity" | "unit_price">): number {
  return Number(it.quantity) > 0 ? round2(Number(it.quantity) * (Number(it.unit_price) || 0)) : 0;
}

/** Quanto a linha soma ao total da proposta: só os itens "fixed". */
export function itemTotal(it: ServiceItem): number {
  return itemKind(it) === "fixed" ? itemLineValue(it) : 0;
}

export function serviceTotals(items: ServiceItem[]) {
  let fixedTotal = 0;
  let fixedCount = 0;
  let measuredCount = 0;
  let optionalCount = 0;
  for (const it of items) {
    const k = itemKind(it);
    if (k === "fixed") { fixedTotal += itemLineValue(it); fixedCount++; }
    else if (k === "measured") measuredCount++;
    else optionalCount++;
  }
  return { fixedTotal: round2(fixedTotal), fixedCount, measuredCount, optionalCount };
}

/** Numeração das linhas na proposta: seção 2 → 2.1, 2.2, ... */
export const itemNumber = (index: number) => `2.${index + 1}`;

/** "Belo Horizonte-MG" a partir de "..., Jundiaí, Anápolis-GO, CEP 75110-470". */
export function cityFromAddress(address: string | null | undefined): string {
  if (!address) return "";
  const m = address.match(/([^,]+?)\s*[-/]\s*([A-Z]{2})\s*(?:,|$)/);
  return m ? `${m[1].trim()}/${m[2]}` : "";
}

export const kvFromLabels = (labels: string[]): ServiceKV[] => labels.map((label) => ({ label, value: "" }));

export interface CompanyHint {
  slug?: string | null;
  address?: string | null;
  representante_nome?: string | null;
  representante_cargo?: string | null;
}

export function defaultServiceData(company?: CompanyHint | null): ServiceData {
  return {
    version: 1,
    company_slug: company?.slug || DEFAULT_COMPANY_SLUG,
    issue_city: cityFromAddress(company?.address),
    attention: "",
    subject: DEFAULT_SUBJECT,
    intro: DEFAULT_INTRO,
    object_text: DEFAULT_OBJECT_TEXT,
    equipment: kvFromLabels(DEFAULT_EQUIPMENT_LABELS),
    site_features: kvFromLabels(DEFAULT_SITE_LABELS),
    inclusions: [...DEFAULT_INCLUSIONS],
    payment_text: DEFAULT_PAYMENT_TEXT,
    client_responsibilities: [...DEFAULT_CLIENT_RESPONSIBILITIES],
    company_responsibilities: [...DEFAULT_COMPANY_RESPONSIBILITIES],
    final_sections: DEFAULT_FINAL_SECTIONS.map((s) => ({ ...s })),
    closing_text: DEFAULT_CLOSING_TEXT,
    acceptance_text: DEFAULT_ACCEPTANCE_TEXT,
    signer_name: company?.representante_nome || "",
    signer_role: company?.representante_cargo || "",
  };
}

const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);

function strList(v: unknown, fallback: string[]): string[] {
  if (!Array.isArray(v)) return [...fallback];
  return v.filter((x) => typeof x === "string") as string[];
}

function kvList(v: unknown, fallback: ServiceKV[]): ServiceKV[] {
  if (!Array.isArray(v)) return fallback.map((x) => ({ ...x }));
  return v
    .filter((x) => x && typeof x === "object")
    .map((x: any) => ({ label: str(x.label, ""), value: str(x.value, "") }));
}

function sectionList(v: unknown, fallback: ServiceSection[]): ServiceSection[] {
  if (!Array.isArray(v)) return fallback.map((x) => ({ ...x }));
  return v
    .filter((x) => x && typeof x === "object")
    .map((x: any) => ({ title: str(x.title, ""), text: str(x.text, "") }));
}

/**
 * Lê o JSON gravado no banco com tolerância: campo ausente → texto-padrão; lista vazia
 * (que o usuário esvaziou de propósito) → continua vazia.
 */
export function normalizeServiceData(raw: unknown, company?: CompanyHint | null): ServiceData {
  const base = defaultServiceData(company);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Record<string, unknown>;
  return {
    version: 1,
    company_slug: str(r.company_slug, base.company_slug) || base.company_slug,
    issue_city: str(r.issue_city, base.issue_city),
    attention: str(r.attention, base.attention),
    subject: str(r.subject, base.subject),
    intro: str(r.intro, base.intro),
    object_text: str(r.object_text, base.object_text),
    equipment: kvList(r.equipment, base.equipment),
    site_features: kvList(r.site_features, base.site_features),
    inclusions: strList(r.inclusions, base.inclusions),
    payment_text: str(r.payment_text, base.payment_text),
    client_responsibilities: strList(r.client_responsibilities, base.client_responsibilities),
    company_responsibilities: strList(r.company_responsibilities, base.company_responsibilities),
    final_sections: sectionList(r.final_sections, base.final_sections),
    closing_text: str(r.closing_text, base.closing_text),
    acceptance_text: str(r.acceptance_text, base.acceptance_text),
    signer_name: str(r.signer_name, base.signer_name),
    signer_role: str(r.signer_role, base.signer_role),
  };
}

/** Tira linhas em branco antes de gravar (o usuário pode deixar campos vazios na tela). */
export function cleanServiceData(d: ServiceData): ServiceData {
  return {
    ...d,
    equipment: d.equipment.filter((x) => x.label.trim() || x.value.trim()),
    site_features: d.site_features.filter((x) => x.label.trim() || x.value.trim()),
    inclusions: d.inclusions.map((s) => s.trim()).filter(Boolean),
    client_responsibilities: d.client_responsibilities.map((s) => s.trim()).filter(Boolean),
    company_responsibilities: d.company_responsibilities.map((s) => s.trim()).filter(Boolean),
    final_sections: d.final_sections.filter((s) => s.title.trim() || s.text.trim()),
  };
}

// ───────────────────────── banco ↔ tela ─────────────────────────

/**
 * Linhas para `quote_items`.
 * `total_price` guarda só o que SOMA ao total da proposta (opcionais e "sob medição" ficam em 0),
 * para que qualquer soma feita sobre os itens bata com o total da proposta.
 * `quantity` é inteiro no banco; "sob medição" fica 0.
 */
export function toQuoteItemRows(quoteId: string, items: ServiceItem[]) {
  return items.map((it, i) => ({
    quote_id: quoteId,
    product_id: null,
    product_code: `SRV-${String(i + 1).padStart(2, "0")}`,
    product_name: it.description.trim(),
    product_category: "servico",
    quantity: Number(it.quantity) > 0 ? Math.round(Number(it.quantity)) : 0,
    unit_price: round2(Number(it.unit_price) || 0),
    total_price: itemTotal(it),
    notes: it.note.trim() || null,
    order_index: i,
    unit: it.unit || "Vb",
    is_optional: !!it.is_optional,
  }));
}

export function itemsFromRows(rows: any[] | null | undefined): ServiceItem[] {
  return [...(rows || [])]
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    .map((r) => ({
      id: newItemId(),
      description: String(r.product_name ?? ""),
      unit: String(r.unit || "Vb"),
      quantity: Number(r.quantity) > 0 ? Number(r.quantity) : null,
      unit_price: Number(r.unit_price) || 0,
      is_optional: !!r.is_optional,
      note: String(r.notes ?? ""),
    }));
}

// ───────────────────────── validação ─────────────────────────

export interface ServiceCheckInput {
  client_id: string;
  items: ServiceItem[];
  data: ServiceData;
  validity_days: number;
}

/** Problemas que impedem FINALIZAR (o rascunho pode ser salvo incompleto). */
export function serviceProblems(i: ServiceCheckInput): string[] {
  const out: string[] = [];
  if (!i.client_id) out.push("Escolha o cliente.");
  if (!i.data.subject.trim()) out.push("Informe o assunto da proposta.");
  if (i.items.length === 0) out.push("Adicione ao menos um item de preço.");
  i.items.forEach((it, idx) => {
    const n = itemNumber(idx);
    if (!it.description.trim()) out.push(`Item ${n}: falta a descrição.`);
    if (!(Number(it.unit_price) > 0)) out.push(`Item ${n}: informe o preço unitário.`);
    if (it.quantity != null && Number(it.quantity) > 0 && !Number.isInteger(Number(it.quantity))) {
      out.push(`Item ${n}: a quantidade precisa ser um número inteiro (para horas quebradas, ajuste o preço ou a unidade).`);
    }
  });
  if (!(i.validity_days > 0)) out.push("Informe a validade da proposta em dias.");
  return out;
}

// ───────────────────────── gravação ─────────────────────────

export interface ServiceQuoteInput {
  client_id: string;
  project_name: string;
  project_location: string;
  validity_days: number;
  notes: string;
  show_unit_prices: boolean;
  items: ServiceItem[];
  service: ServiceData;
}

/**
 * Colunas de `quotes` para uma proposta de serviço (sem status/datas, que dependem do botão usado).
 * Não há desconto nem imposto: o preço de cada linha é definido direto na tabela, e o total é a
 * soma das linhas com quantidade definida. Moeda sempre R$.
 */
export function buildServiceQuotePayload(i: ServiceQuoteInput) {
  const totals = serviceTotals(i.items);
  const service = cleanServiceData(i.service);
  return {
    client_id: i.client_id,
    quote_type: "servico" as const,
    project_name: i.project_name.trim() || null,
    project_location: i.project_location.trim() || null,
    currency: "BRL" as const,
    language: "pt-BR",
    // espelho do texto de pagamento: telas e contratos que leem `payment_terms` continuam funcionando
    payment_terms: service.payment_text.replace(/\s*\n+\s*/g, " ").trim() || null,
    freight_terms: null,
    validity_days: i.validity_days,
    notes: i.notes.trim() || null,
    discount_percent: 0,
    discount_value: 0,
    discount_approved: true,
    subtotal: totals.fixedTotal,
    total: totals.fixedTotal,
    hide_discount_value: true,
    hide_unit_prices: !i.show_unit_prices,
    service_data: service,
  };
}
