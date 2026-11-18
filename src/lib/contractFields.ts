/**
 * Catálogo dos "campos automáticos" dos modelos de contrato.
 *
 * Nos textos, um campo aparece como {{vendedora_cnpj}}: ao gerar o contrato, o sistema troca pelo
 * dado real (aqui, o CNPJ da vendedora). Para quem edita, o nome técnico não diz nada; este catálogo
 * dá a cada campo um nome em português e um grupo, para o menu "Inserir campo" e para a legenda.
 *
 * REGRA: toda chave devolvida por `buildPlaceholderMap` (src/lib/contractPlaceholders.ts) precisa estar
 * aqui; há um teste que confere isso, para o catálogo nunca ficar para trás.
 */

import { HTML_OPEN, stripHtmlSentinels } from "@/lib/contractPlaceholders";

export type FieldGroupId = "empresa" | "cliente" | "equipamento" | "valores" | "prazos" | "gestores" | "contrato" | "locacao";

export const FIELD_GROUPS: Array<{ id: FieldGroupId; label: string; hint: string }> = [
  { id: "empresa", label: "Nossa empresa", hint: "Vendedora, locadora ou contratada" },
  { id: "cliente", label: "Cliente", hint: "Compradora, locatária ou contratante" },
  { id: "equipamento", label: "Equipamento e itens", hint: "Grua, medidas e o que está incluso" },
  { id: "valores", label: "Valores e pagamento", hint: "Preço total e parcelas" },
  { id: "prazos", label: "Prazos e garantias", hint: "Entrega e garantia" },
  { id: "gestores", label: "Gestores do contrato", hint: "Quem cuida do contrato em cada parte" },
  { id: "contrato", label: "Dados do contrato", hint: "Data, número e foro" },
  { id: "locacao", label: "Locação (dados da proposta)", hint: "Só para contratos de locação" },
];

export interface FieldInfo {
  label: string;
  group: FieldGroupId;
}

const f = (label: string, group: FieldGroupId): FieldInfo => ({ label, group });

export const FIELD_CATALOG: Record<string, FieldInfo> = {
  // nossa empresa
  vendedora_razao_social: f("Razão social", "empresa"),
  vendedora_cnpj: f("CNPJ", "empresa"),
  vendedora_ie: f("Inscrição estadual", "empresa"),
  vendedora_endereco: f("Endereço", "empresa"),
  vendedora_email: f("E-mail", "empresa"),
  vendedora_representante_nome: f("Representante: nome", "empresa"),
  vendedora_representante_cpf: f("Representante: CPF", "empresa"),
  vendedora_representante_rg: f("Representante: RG", "empresa"),
  vendedora_representante_cargo: f("Representante: cargo", "empresa"),
  vendedora_representantes_qualificacao: f("Todos os representantes (texto completo)", "empresa"),

  // cliente
  compradora_razao_social: f("Razão social ou nome", "cliente"),
  compradora_cnpj_cpf: f("CNPJ ou CPF", "cliente"),
  compradora_endereco: f("Endereço", "cliente"),
  compradora_cidade: f("Cidade", "cliente"),
  compradora_estado: f("Estado (UF)", "cliente"),
  compradora_cep: f("CEP", "cliente"),
  compradora_email: f("E-mail", "cliente"),
  nf_email: f("E-mail para receber a nota fiscal", "cliente"),
  compradora_representante_nome: f("Representante: nome", "cliente"),
  compradora_representante_cpf: f("Representante: CPF", "cliente"),
  compradora_representante_rg: f("Representante: RG", "cliente"),
  compradora_representante_cargo: f("Representante: cargo", "cliente"),
  compradora_representantes_qualificacao: f("Todos os representantes (texto completo)", "cliente"),

  // equipamento e itens
  equipamento_tipo: f("Tipo de equipamento", "equipamento"),
  equipamento_marca: f("Marca", "equipamento"),
  equipamento_modelo: f("Modelo", "equipamento"),
  lanca_m: f("Lança (metros)", "equipamento"),
  altura_torre_m: f("Altura da torre (metros)", "equipamento"),
  carga_maxima_kg: f("Carga máxima (kg)", "equipamento"),
  carga_ponta_kg: f("Carga na ponta da lança (kg)", "equipamento"),
  itens_inclusos_tabela: f("Tabela dos itens inclusos", "equipamento"),
  itens_inclusos_extenso: f("Itens inclusos por extenso", "equipamento"),
  especificacoes_grua_extenso: f("Especificações da grua por extenso", "equipamento"),
  servicos_inclusos_lista: f("Lista dos serviços inclusos", "equipamento"),

  // valores e pagamento
  valor_total_numerico: f("Valor total (em números)", "valores"),
  valor_total_extenso: f("Valor total (por extenso)", "valores"),
  condicoes_pagamento_tabela: f("Tabela das condições de pagamento", "valores"),

  // prazos e garantias
  prazo_entrega_dias: f("Prazo de entrega (dias)", "prazos"),
  garantia_estrutural_anos: f("Garantia estrutural (anos)", "prazos"),
  garantia_eletrica_anos: f("Garantia elétrica e motores (anos)", "prazos"),

  // gestores
  gestor_vendedora_nome: f("Nossa empresa: nome", "gestores"),
  gestor_vendedora_cpf: f("Nossa empresa: CPF", "gestores"),
  gestor_vendedora_telefone: f("Nossa empresa: telefone", "gestores"),
  gestor_vendedora_email: f("Nossa empresa: e-mail", "gestores"),
  gestor_compradora_nome: f("Cliente: nome", "gestores"),
  gestor_compradora_cpf: f("Cliente: CPF", "gestores"),
  gestor_compradora_telefone: f("Cliente: telefone", "gestores"),
  gestor_compradora_email: f("Cliente: e-mail", "gestores"),

  // dados do contrato
  foro_cidade: f("Cidade do foro", "contrato"),
  data_contrato: f("Data do contrato (por extenso)", "contrato"),
  numero_contrato: f("Número do contrato", "contrato"),

  // locação
  rental_duration_months: f("Prazo da locação (meses)", "locacao"),
  rental_monthly_value: f("Valor mensal", "locacao"),
  rental_mobilization: f("Mobilização", "locacao"),
  rental_demobilization: f("Desmobilização", "locacao"),
  rental_freight: f("Frete", "locacao"),
  rental_assembly: f("Montagem", "locacao"),
  rental_disassembly: f("Desmontagem", "locacao"),
  rental_operator_included: f("Operador incluso? (Sim/Não)", "locacao"),
  rental_maintenance_included: f("Manutenção inclusa? (Sim/Não)", "locacao"),
  rental_insurance_included: f("Seguro incluso? (Sim/Não)", "locacao"),
  rental_technical_assistance: f("Assistência técnica inclusa? (Sim/Não)", "locacao"),
  rental_start_date: f("Início da locação", "locacao"),
  rental_terrain_condition: f("Condição do terreno", "locacao"),
  rental_special_foundation: f("Fundação especial? (Sim/Não)", "locacao"),
  rental_work_type: f("Tipo de obra", "locacao"),
  rental_height_needed: f("Altura necessária (m)", "locacao"),
  rental_jib_needed: f("Lança necessária (m)", "locacao"),
  rental_max_weight: f("Peso máximo (kg)", "locacao"),
  rental_tax_percent: f("Impostos (%)", "locacao"),
};

export const FIELD_KEYS = Object.keys(FIELD_CATALOG);

export const isKnownField = (key: string) => Object.prototype.hasOwnProperty.call(FIELD_CATALOG, key);

export const fieldLabel = (key: string) => (isKnownField(key) ? FIELD_CATALOG[key].label : key);

/** Nome completo para dica: "Cliente · CNPJ ou CPF". */
export function fieldFullLabel(key: string): string {
  if (!isKnownField(key)) return key;
  const g = FIELD_GROUPS.find((x) => x.id === FIELD_CATALOG[key].group);
  return `${g?.label ?? ""} · ${FIELD_CATALOG[key].label}`;
}

const FIELD_RX = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

/** Campos citados num texto, sem repetir, na ordem em que aparecem. */
export function extractFieldKeys(body: string): string[] {
  const out: string[] = [];
  for (const m of (body || "").matchAll(FIELD_RX)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/** Campos citados que o sistema NÃO preenche: saem como "—" no contrato. */
export const unknownFieldKeys = (body: string): string[] => extractFieldKeys(body).filter((k) => !isKnownField(k));

/**
 * Coloca `insertion` na posição do cursor (ou no lugar do trecho selecionado) e devolve o texto novo
 * e onde o cursor deve ficar.
 */
export function insertAtCursor(text: string, start: number, end: number, insertion: string): { text: string; cursor: number } {
  const s = Math.max(0, Math.min(start, text.length));
  const e = Math.max(s, Math.min(end, text.length));
  return { text: text.slice(0, s) + insertion + text.slice(e), cursor: s + insertion.length };
}

export const fieldToken = (key: string) => `{{${key}}}`;

// ───────────────────────── rótulos e edição de texto ─────────────────────────

export const CONTRACT_TYPE_LABEL = { venda: "Venda", locacao: "Locação", servico: "Serviço" } as const;
export type ContractType = keyof typeof CONTRACT_TYPE_LABEL;

/**
 * Nome das cláusulas opcionais (as que têm "chave interna"): o mesmo texto da caixa de seleção que aparece
 * ao gerar o contrato (GenerateContractDialog).
 */
const CLAUSE_KEY_LABEL: Record<string, string> = {
  operador: "Cláusulas de operador (faturamento e condições)",
  prestadora_servico: "Cláusula de prestação de serviço acessória",
};
export const clauseKeyLabel = (key: string): string => CLAUSE_KEY_LABEL[key] ?? `Opcional (${key})`;

/** Valor de exemplo em uma linha, para o menu "Inserir campo": tabelas viram "(tabela)" e textos longos são cortados. */
export function shortSample(value: string | undefined, max = 44): string {
  if (value == null || value === "") return "—";
  if (value.includes(HTML_OPEN)) return "(tabela)";
  const one = stripHtmlSentinels(value).replace(/\s+/g, " ").trim();
  if (!one) return "—";
  return one.length > max ? `${one.slice(0, max - 1).trimEnd()}…` : one;
}

/** Envolve o trecho selecionado (ou deixa o cursor entre os marcadores quando nada está selecionado). */
export function wrapSelection(text: string, start: number, end: number, before: string, after = before): { text: string; selStart: number; selEnd: number } {
  const s = Math.max(0, Math.min(start, text.length));
  const e = Math.max(s, Math.min(end, text.length));
  const middle = text.slice(s, e);
  return { text: text.slice(0, s) + before + middle + after + text.slice(e), selStart: s + before.length, selEnd: s + before.length + middle.length };
}

/** Coloca "- " no começo de cada linha tocada pela seleção (ou tira, se todas já tiverem). */
export function toggleListPrefix(text: string, start: number, end: number): { text: string; selStart: number; selEnd: number } {
  const s = Math.max(0, Math.min(start, text.length));
  const e = Math.max(s, Math.min(end, text.length));
  const lineStart = text.lastIndexOf("\n", s - 1) + 1;
  const nl = text.indexOf("\n", e);
  const lineEnd = nl === -1 ? text.length : nl;
  const lines = text.slice(lineStart, lineEnd).split("\n");
  const allListed = lines.every((l) => /^\s*-\s/.test(l) || l.trim() === "");
  const changed = lines.map((l) => (l.trim() === "" ? l : allListed ? l.replace(/^(\s*)-\s/, "$1") : `- ${l}`)).join("\n");
  const delta = changed.length - (lineEnd - lineStart);
  return { text: text.slice(0, lineStart) + changed + text.slice(lineEnd), selStart: lineStart, selEnd: e + delta };
}

/** Texto da cláusula em uma linha, para o resumo da lista: os campos viram "[Razão social]" em vez de {{vendedora_razao_social}}. */
export function friendlyBody(body: string, max = 110): string {
  const t = (body || "")
    .replace(FIELD_RX, (_m, k: string) => `[${fieldLabel(k)}]`)
    .replace(/^\s*-\s+/gm, "")
    .replace(/\*\*/g, "") // marcas de negrito/itálico atrapalham a leitura do resumo
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}
